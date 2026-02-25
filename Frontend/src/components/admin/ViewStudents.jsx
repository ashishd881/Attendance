import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';

const ViewStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSemester, setFilterSemester] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [filterSemester]);

  const fetchStudents = async () => {
    try {
      const { data } = await API.get(`/admin/students${filterSemester ? `?semester=${filterSemester}` : ''}`);
      setStudents(data);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">All Students</h1>
        <p className="text-gray-500">View all registered students</p>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by Semester:</label>
        <select
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <option key={sem} value={sem}>Semester {sem}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          Total: <strong>{students.length}</strong> students
        </span>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Roll Number</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Semester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((student, index) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-700 font-semibold text-sm">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-800">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-mono font-semibold rounded">
                        {student.rollNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        Sem {student.semester}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewStudents;