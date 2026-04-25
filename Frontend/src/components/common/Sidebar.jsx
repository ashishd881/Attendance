import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const adminLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/teachers', label: 'Manage Teachers', icon: '👨‍🏫' },
    { path: '/admin/subjects', label: 'Manage Subjects', icon: '📚' },
    { path: '/admin/students', label: 'View Students', icon: '👨‍🎓' },
    { path: '/admin/attendance-report', label: 'Attendance Report', icon: '📋' },
    { path: '/admin/promote-students', label: 'Promote Students', icon: '🎓' },
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
    <>
      {/* Overlay (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:static top-0 left-0 h-full w-64 bg-white shadow-lg border-r border-gray-200 z-50
          transform transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        <div className="p-6">
          <div className="space-y-1">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={onClose} // close on mobile click
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
    </>
  );
};

export default Sidebar;