import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom'; // ✅ FIXED

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
    {
      label: 'Total Teachers',
      value: stats.teachers,
      icon: '👨‍🏫',
      bg: 'bg-blue-50'
    },
    {
      label: 'Total Students',
      value: stats.students,
      icon: '👨‍🎓',
      bg: 'bg-green-50'
    },
    {
      label: 'Total Subjects',
      value: stats.subjects,
      icon: '📚',
      bg: 'bg-purple-50'
    }
  ];

  const quickActions = [
    { label: 'Add Teacher', path: '/admin/teachers', icon: '➕👨‍🏫' },
    { label: 'Add Subject', path: '/admin/subjects', icon: '➕📚' },
    { label: 'View Students', path: '/admin/students', icon: '👀👨‍🎓' },
    { label: 'Attendance Report', path: '/admin/attendance-report', icon: '📊' }
  ];

  // 🔄 Loading UI
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 md:px-0">

      {/* 🔷 Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="mt-2 text-indigo-100 text-sm md:text-lg">
          Here's an overview of your attendance management system.
        </p>
      </div>

      {/* 📊 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {card.label}
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">
                  {card.value}
                </p>
              </div>

              <div className={`w-12 h-12 md:w-14 md:h-14 ${card.bg} rounded-xl flex items-center justify-center text-xl md:text-2xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ⚡ Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.path} // ✅ FIXED (no <a href>)
              className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 border border-gray-200 transition-all active:scale-95"
            >
              <span className="text-xl md:text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-gray-700">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;