import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../../utils/api';
import { toast } from 'react-toastify';

const MarkAttendance = () => {
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const [selection, setSelection] = useState({
    semester: searchParams.get('semester') || '',
    subjectId: searchParams.get('subjectId') || '',
    date: new Date().toISOString().split('T')[0]
  });

  const [existingAttendance, setExistingAttendance] = useState(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selection.semester) {
      fetchStudents();
    }
  }, [selection.semester]);

  useEffect(() => {
    if (selection.subjectId && selection.date && selection.semester) {
      checkExistingAttendance();
    }
  }, [selection.subjectId, selection.date, selection.semester]);

  const fetchSubjects = async () => {
    try {
      const { data } = await API.get('/teacher/my-subjects');
      setSubjects(data);
    } catch (error) {
      toast.error('Failed to fetch subjects');
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/teacher/students/${selection.semester}`);
      setStudents(data);
      // Initialize all as absent
      const initialAttendance = {};
      data.forEach(student => {
        initialAttendance[student._id] = 'absent';
      });
      setAttendance(initialAttendance);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingAttendance = async () => {
    try {
      const { data } = await API.get(
        `/attendance/subject/${selection.subjectId}?date=${selection.date}&semester=${selection.semester}`
      );
      
      if (data.length > 0) {
        const existing = data[0];
        setExistingAttendance(existing);
        
        // Populate checkboxes with existing data
        const existingMap = {};
        students.forEach(student => {
          existingMap[student._id] = 'absent'; // default
        });
        existing.records.forEach(record => {
          if (record.student) {
            const studentId = record.student._id || record.student;
            existingMap[studentId] = record.status;
          }
        });
        setAttendance(existingMap);
        
        // Check if all are present
        const allPresent = Object.values(existingMap).every(s => s === 'present');
        setSelectAll(allPresent);
      } else {
        setExistingAttendance(null);
        // Reset attendance to absent
        const resetMap = {};
        students.forEach(student => {
          resetMap[student._id] = 'absent';
        });
        setAttendance(resetMap);
        setSelectAll(false);
      }
    } catch (error) {
      console.error('Error checking existing attendance');
    }
  };

  const handleCheckboxChange = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSelectAll = () => {
    const newStatus = !selectAll;
    setSelectAll(newStatus);
    const updated = {};
    students.forEach(student => {
      updated[student._id] = newStatus ? 'present' : 'absent';
    });
    setAttendance(updated);
  };

  const handleSubmit = async () => {
    if (!selection.subjectId || !selection.semester || !selection.date) {
      toast.error('Please select subject, semester, and date');
      return;
    }

    if (students.length === 0) {
      toast.error('No students found for this semester');
      return;
    }

    setSubmitting(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status
      }));

      await API.post('/attendance/mark', {
        subjectId: selection.subjectId,
        semester: parseInt(selection.semester),
        date: selection.date,
        records
      });

      const presentCount = Object.values(attendance).filter(s => s === 'present').length;
      toast.success(
        `Attendance ${existingAttendance ? 'updated' : 'marked'} successfully! ` +
        `Present: ${presentCount}/${students.length}`
      );

      checkExistingAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const absentCount = students.length - presentCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Mark Attendance</h1>
        <p className="text-gray-500">Select subject, semester, and date to mark attendance</p>
      </div>

      {/* Selection Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select
              value={selection.semester}
              onChange={(e) => setSelection({ ...selection, semester: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Select Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={selection.subjectId}
              onChange={(e) => setSelection({ ...selection, subjectId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Select Subject</option>
              {subjects
                .filter(s => !selection.semester || s.semester === parseInt(selection.semester))
                .map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code})
                  </option>
                ))
              }
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selection.date}
              onChange={(e) => setSelection({ ...selection, date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Existing attendance notice */}
      {existingAttendance && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center space-x-3">
          <span className="text-yellow-500 text-xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Attendance already marked for this date and subject.
            </p>
            <p className="text-xs text-yellow-600">
              You can edit the attendance below. Changes will be updated.
            </p>
          </div>
        </div>
      )}

      {/* Student List with Checkboxes */}
      {students.length > 0 && selection.subjectId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Stats bar */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                Total: <strong>{students.length}</strong>
              </span>
              <span className="text-sm font-medium text-green-700">
                Present: <strong>{presentCount}</strong>
              </span>
              <span className="text-sm font-medium text-red-700">
                Absent: <strong>{absentCount}</strong>
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 shadow-sm"
            >
              {submitting ? '⏳ Saving...' : existingAttendance ? '✏️ Update Attendance' : '✅ Submit Attendance'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-gray-600 uppercase">Select All</span>
                    </label>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Roll No</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Student Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student, index) => (
                  <tr
                    key={student._id}
                    className={`transition-colors cursor-pointer ${
                      attendance[student._id] === 'present'
                        ? 'bg-green-50 hover:bg-green-100'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleCheckboxChange(student._id)}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={attendance[student._id] === 'present'}
                        onChange={() => handleCheckboxChange(student._id)}
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-mono font-semibold rounded">
                        {student.rollNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{student.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        attendance[student._id] === 'present'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {attendance[student._id] === 'present' ? '✓ Present' : '✕ Absent'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      )}

      {students.length === 0 && selection.semester && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500 text-lg">No students found for Semester {selection.semester}</p>
          <p className="text-gray-400 text-sm mt-2">Please add students first from "Manage Students"</p>
        </div>
      )}
    </div>
  );
};

export default MarkAttendance;