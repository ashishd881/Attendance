import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';

const AttendanceHistory = () => {
  const [subjects, setSubjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    subjectId: '',
    semester: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data } = await API.get('/teacher/my-subjects');
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects');
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.subjectId) params.append('subjectId', filters.subjectId);
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const { data } = await API.get(`/attendance/history?${params.toString()}`);
      setHistory(data);
    } catch (error) {
      toast.error('Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Attendance History</h1>
        <p className="text-gray-500">View past attendance records</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={filters.subjectId}
              onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub._id} value={sub._id}>{sub.name} ({sub.code})</option>
              ))}
            </select>
          </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchHistory}
              className="w-full px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              🔍 Search
            </button>
          </div>
        </div>
      </div>

      {/* History Records */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-4">
          {history.map((record) => (
            <div key={record._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center space-x-4">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                    {record.subject?.name} ({record.subject?.code})
                  </span>
                  <span className="text-sm text-gray-600">
                    📅 {new Date(record.date).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-green-600 font-semibold">
                    Present: {record.records.filter(r => r.status === 'present').length}
                  </span>
                  <span className="text-xs text-red-600 font-semibold">
                    Absent: {record.records.filter(r => r.status === 'absent').length}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {record.records.map((r, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 ${
                        r.status === 'present'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      <span>{r.status === 'present' ? '✓' : '✕'}</span>
                      <span>{r.student?.rollNumber || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Click "Search" to view attendance history</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;