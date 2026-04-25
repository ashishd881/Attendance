import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const adminLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/teachers', label: 'Manage Teachers', icon: '👨‍🏫' },
    { path: '/admin/subjects', label: 'Manage Subjects', icon: '📚' },
    { path: '/admin/students', label: 'View Students', icon: '👨‍🎓' },
    { path: '/admin/attendance-report', label: 'Attendance Report', icon: '📋' },
    { path: '/admin/promote-students', label: 'Promote Students', icon: '🎓' }, // NEW
    { path: '/admin/admin-setup', label: 'Create Admin', icon: '🛠️' },
  ];

  const teacherLinks = [
    { path: '/teacher/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/teacher/mark-attendance', label: 'Mark Attendance', icon: '✅' },
    { path: '/teacher/manage-students', label: 'Manage Students', icon: '👨‍🎓' },
    { path: '/teacher/attendance-history', label: 'Attendance History', icon: '📜' },
  ];

  const studentLinks = [
    { path: '/student/dashboard', label: 'My Attendance', icon: '📊' },
  ];

  const getLinks = () => {
    switch (user?.role) {
      case 'admin': return adminLinks;
      case 'teacher': return teacherLinks;
      case 'student': return studentLinks;
      default: return [];
    }
  };

  const links = getLinks();

  return (
    <div className="w-64 bg-white shadow-lg min-h-screen border-r border-gray-200 hidden md:block">
      <div className="p-6">
        <div className="space-y-1">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                location.pathname === link.path
                  ? 'bg-indigo-50 text-indigo-700 font-semibold border-r-4 border-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              <span className="text-sm">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;