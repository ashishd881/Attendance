import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    subjects: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setError(null);

      const [teachersRes, studentsRes, subjectsRes] = await Promise.all([
        API.get('/admin/teachers'),
        API.get('/admin/students'),
        API.get('/admin/subjects')
      ]);

      setStats({
        teachers: teachersRes?.data?.length || 0,
        students: studentsRes?.data?.length || 0,
        subjects: subjectsRes?.data?.length || 0
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      id: 'teachers',
      label: 'Total Teachers',
      value: stats.teachers,
      icon: '👨‍🏫',
      bg: 'bg-blue-50'
    },
    {
      id: 'students',
      label: 'Total Students',
      value: stats.students,
      icon: '👨‍🎓',
      bg: 'bg-green-50'
    },
    {
      id: 'subjects',
      label: 'Total Subjects',
      value: stats.subjects,
      icon: '📚',
      bg: 'bg-purple-50'
    }
  ];

  const quickActions = [
    { id: 1, label: 'Add Teacher', path: '/admin/teachers', icon: '➕👨‍🏫' },
    { id: 2, label: 'Add Subject', path: '/admin/subjects', icon: '➕📚' },
    { id: 3, label: 'View Students', path: '/admin/students', icon: '👀👨‍🎓' },
    { id: 4, label: 'Attendance Report', path: '/admin/attendance-report', icon: '📊' }
  ];

  // 🔄 Loading UI
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // ❌ Error UI
  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-2 sm:px-4">

      {/* 🔷 Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-5 md:p-8 text-white">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
          Welcome back, {user?.name || 'Admin'} 👋
        </h1>
        <p className="mt-2 text-indigo-100 text-sm md:text-lg">
          Here's an overview of your attendance system.
        </p>
      </div>

      {/* 📊 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {statCards.map((card) => (
          <div
            key={card.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500">
                  {card.label}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mt-1">
                  {card.value}
                </p>
              </div>

              <div className={`w-10 h-10 md:w-12 md:h-12 ${card.bg} rounded-lg flex items-center justify-center text-lg md:text-xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ⚡ Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.id}
              to={action.path}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 border border-gray-200 transition active:scale-95"
            >
              <span className="text-lg md:text-xl">{action.icon}</span>
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