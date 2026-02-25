import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';

const AttendanceReport = () => {
  const [report, setReport] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [filters, setFilters] = useState({
    semester: '',
    subjectId: '',
    belowPercentage: ''
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data } = await API.get('/admin/subjects');
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects');
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.subjectId) params.append('subjectId', filters.subjectId);
      if (filters.belowPercentage) params.append('belowPercentage', filters.belowPercentage);

      const { data } = await API.get(`/admin/attendance-report?${params.toString()}`);
      setReport(data);
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    const studentsToEmail = report
      .filter(r => r.student?.email)
      .map(r => ({
        email: r.student.email,
        name: r.student.name,
        subject: r.subject.name,
        percentage: r.percentage
      }));

    if (studentsToEmail.length === 0) {
      toast.warning('No students to email');
      return;
    }

    if (!window.confirm(`Send short attendance email to ${studentsToEmail.length} students?`)) {
      return;
    }

    setSending(true);
    try {
      const { data } = await API.post('/admin/send-short-attendance-email', {
        students: studentsToEmail
      });
      toast.success(data.message);
    } catch (error) {
      toast.error('Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  const getPercentageColor = (percentage) => {
    if (percentage >= 75) return 'text-green-700 bg-green-100';
    if (percentage >= 50) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Attendance Report</h1>
        <p className="text-gray-500">Filter and review student attendance</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select
              value={filters.semester}
              onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={filters.subjectId}
              onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub._id} value={sub._id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Below Percentage</label>
            <input
              type="number"
              value={filters.belowPercentage}
              onChange={(e) => setFilters({ ...filters, belowPercentage: e.target.value })}
              placeholder="e.g., 75"
              min="0"
              max="100"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReport}
              className="w-full px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              🔍 Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {report.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Results ({report.length} records)</h2>
              {filters.belowPercentage && (
                <p className="text-sm text-red-600 mt-1">
                  Showing students with attendance below {filters.belowPercentage}%
                </p>
              )}
            </div>
            <button
              onClick={handleSendEmails}
              disabled={sending}
              className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <span>📧</span>
              <span>{sending ? 'Sending...' : 'Email Students'}</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Roll No</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Subject</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Present</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Absent</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {item.student?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                        {item.student?.rollNumber || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.subject?.name} ({item.subject?.code})
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-semibold">{item.presentCount}</td>
                    <td className="px-6 py-4 text-sm text-red-600 font-semibold">{item.absentCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-semibold">{item.totalClasses}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPercentageColor(item.percentage)}`}>
                        {item.percentage.toFixed(1)}%
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
    </div>
  );
};

export default AttendanceReport;