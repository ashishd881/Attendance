import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchAttendance();
  }, [selectedSubject, dateFilter]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subjectId', selectedSubject);
      if (dateFilter.startDate) params.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate);

      const { data } = await API.get(`/attendance/student/my-attendance?${params.toString()}`);
      setAttendanceData(data);
    } catch (error) {
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (percentage) => {
    const pct = parseFloat(percentage);
    if (pct >= 75) return { text: 'text-green-700', bg: 'bg-green-100', bar: 'bg-green-500' };
    if (pct >= 50) return { text: 'text-yellow-700', bg: 'bg-yellow-100', bar: 'bg-yellow-500' };
    return { text: 'text-red-700', bg: 'bg-red-100', bar: 'bg-red-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-teal-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold">Welcome, {attendanceData?.student?.name || user?.name}! 👋</h1>
        <div className="mt-3 flex flex-wrap gap-4">
          <span className="inline-flex items-center space-x-2 bg-white/20 px-4 py-1.5 rounded-full text-sm">
            <span>🎓</span>
            <span>Roll No: {attendanceData?.student?.rollNumber || user?.rollNumber}</span>
          </span>
          <span className="inline-flex items-center space-x-2 bg-white/20 px-4 py-1.5 rounded-full text-sm">
            <span>📚</span>
            <span>Semester {attendanceData?.student?.semester || user?.semester}</span>
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filter Attendance</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">All Subjects</option>
              {attendanceData?.attendance?.map((att) => (
                <option key={att.subject._id} value={att.subject._id}>
                  {att.subject.name} ({att.subject.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedSubject('');
                setDateFilter({ startDate: '', endDate: '' });
              }}
              className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Overview Cards */}
      {attendanceData?.attendance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attendanceData.attendance.map((att) => {
            const colors = getPercentageColor(att.percentage);
            return (
              <div
                key={att.subject._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{att.subject.name}</h3>
                    <span className="text-xs font-semibold text-indigo-600">{att.subject.code}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${colors.text} ${colors.bg}`}>
                    {att.percentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${colors.bar}`}
                    style={{ width: `${Math.min(att.percentage, 100)}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-green-700">{att.presentCount}</p>
                    <p className="text-xs text-green-600">Present</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-red-700">{att.absentCount}</p>
                    <p className="text-xs text-red-600">Absent</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-700">{att.totalClasses}</p>
                    <p className="text-xs text-blue-600">Total</p>
                  </div>
                </div>

                {/* Date-wise records */}
                {att.records.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Recent Records:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {att.records.slice(0, 10).map((record, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${
                            record.status === 'present'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          <span>
                            {new Date(record.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="font-semibold capitalize">
                            {record.status === 'present' ? '✓ Present' : '✕ Absent'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {attendanceData?.attendance?.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <span className="text-5xl">📋</span>
          <p className="text-gray-500 text-lg mt-4">No attendance records found yet.</p>
          <p className="text-gray-400 text-sm mt-2">Your attendance will appear here once marked by your teacher.</p>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;