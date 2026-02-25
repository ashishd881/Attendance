import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data } = await API.get('/teacher/my-subjects');
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects');
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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold">Welcome, {user?.name}! 👋</h1>
        <p className="mt-2 text-blue-100 text-lg">
          Manage your classes and mark attendance.
        </p>
      </div>

      {/* My Subjects */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">My Subjects</h2>
        {subjects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">No subjects assigned yet. Contact admin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <div
                key={subject._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{subject.name}</h3>
                    <span className="inline-block px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mt-2">
                      {subject.code}
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    Sem {subject.semester}
                  </span>
                </div>
                <div className="mt-4">
                  <Link
                    to={`/teacher/mark-attendance?subjectId=${subject._id}&semester=${subject.semester}`}
                    className="w-full inline-block text-center px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all text-sm"
                  >
                    ✅ Mark Attendance
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/teacher/mark-attendance"
          className="flex items-center space-x-3 p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <span className="text-3xl">✅</span>
          <div>
            <h3 className="font-semibold text-gray-800">Mark Attendance</h3>
            <p className="text-sm text-gray-500">Select subject & mark</p>
          </div>
        </Link>
        <Link
          to="/teacher/manage-students"
          className="flex items-center space-x-3 p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <span className="text-3xl">👨‍🎓</span>
          <div>
            <h3 className="font-semibold text-gray-800">Manage Students</h3>
            <p className="text-sm text-gray-500">Add or remove students</p>
          </div>
        </Link>
        <Link
          to="/teacher/attendance-history"
          className="flex items-center space-x-3 p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <span className="text-3xl">📜</span>
          <div>
            <h3 className="font-semibold text-gray-800">Attendance History</h3>
            <p className="text-sm text-gray-500">View past records</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default TeacherDashboard;