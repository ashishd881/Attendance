import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    subjects: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [teachersRes, studentsRes, subjectsRes] = await Promise.all([
        API.get('/admin/teachers'),
        API.get('/admin/students'),
        API.get('/admin/subjects')
      ]);

      setStats({
        teachers: teachersRes.data.length,
        students: studentsRes.data.length,
        subjects: subjectsRes.data.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Teachers', value: stats.teachers, icon: '👨‍🏫', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Students', value: stats.students, icon: '👨‍🎓', color: 'from-green-500 to-green-600', bg: 'bg-green-50' },
    { label: 'Total Subjects', value: stats.subjects, icon: '📚', color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
  ];

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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}! 👋</h1>
        <p className="mt-2 text-indigo-100 text-lg">
          Here's an overview of your attendance management system.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{card.value}</p>
              </div>
              <div className={`w-14 h-14 ${card.bg} rounded-xl flex items-center justify-center text-2xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Add Teacher', path: '/admin/teachers', icon: '➕👨‍🏫' },
            { label: 'Add Subject', path: '/admin/subjects', icon: '➕📚' },
            { label: 'View Students', path: '/admin/students', icon: '👀👨‍🎓' },
            { label: 'Attendance Report', path: '/admin/attendance-report', icon: '📊' },
          ].map((action, index) => (
            <a
              key={index}
              href={action.path}
              className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 border border-gray-200 transition-all"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;