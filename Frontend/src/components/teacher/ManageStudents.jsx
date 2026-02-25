import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    semester: 1,
    password: ''
  });

  useEffect(() => {
    if (selectedSemester) {
      fetchStudents();
    }
  }, [selectedSemester]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/teacher/students/${selectedSemester}`);
      setStudents(data);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await API.put(`/teacher/students/${editingStudent._id}`, formData);
        toast.success('Student updated successfully!');
      } else {
        await API.post('/teacher/students', {
          ...formData,
          password: formData.password || formData.rollNumber
        });
        toast.success('Student added successfully!');
      }
      
      resetForm();
      if (selectedSemester) fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      rollNumber: student.rollNumber,
      email: student.email,
      semester: student.semester,
      password: ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this student?')) {
      try {
        await API.delete(`/teacher/students/${id}`);
        toast.success('Student removed successfully');
        fetchStudents();
      } catch (error) {
        toast.error('Failed to remove student');
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', rollNumber: '', email: '', semester: 1, password: '' });
    setEditingStudent(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Students</h1>
          <p className="text-gray-500">Add, edit, or remove students</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingStudent(null); }}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
        >
          {showForm ? '✕ Cancel' : '+ Add Student'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {editingStudent ? 'Edit Student' : 'Add New Student'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Student name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
              <input
                type="text"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="e.g., CS2024001"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@college.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {!editingStudent && '(Default: Roll Number)'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingStudent ? 'Leave empty to keep' : 'Default is roll number'}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                {editingStudent ? 'Update Student' : 'Add Student'}
              </button>
              {editingStudent && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Semester Selection */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Select Semester:</label>
        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">Choose Semester</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <option key={sem} value={sem}>Semester {sem}</option>
          ))}
        </select>
        {selectedSemester && (
          <span className="text-sm text-gray-500">
            <strong>{students.length}</strong> students
          </span>
        )}
      </div>

      {/* Students Table */}
      {selectedSemester && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Roll Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No students found for Semester {selectedSemester}.
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{student.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-mono font-semibold rounded">
                          {student.rollNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(student)}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(student._id)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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

export default ManageStudents;  