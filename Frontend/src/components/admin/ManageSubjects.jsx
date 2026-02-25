import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';

const ManageSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterSemester, setFilterSemester] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    semester: 1,
    teacherId: ''
  });

  const [assignData, setAssignData] = useState({
    teacherId: '',
    subjectId: '',
    semester: 1
  });

  useEffect(() => {
    fetchData();
  }, [filterSemester]);

  const fetchData = async () => {
    try {
      const [subjectsRes, teachersRes] = await Promise.all([
        API.get(`/admin/subjects${filterSemester ? `?semester=${filterSemester}` : ''}`),
        API.get('/admin/teachers')
      ]);
      setSubjects(subjectsRes.data);
      setTeachers(teachersRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/subjects', formData);
      toast.success('Subject added successfully!');
      setFormData({ name: '', code: '', semester: 1, teacherId: '' });
      setShowForm(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add subject');
    }
  };

  const handleAssignSubject = async (e) => {
    e.preventDefault();
    try {
      await API.put('/admin/assign-subject', assignData);
      toast.success('Subject assigned to teacher successfully!');
      setAssignData({ teacherId: '', subjectId: '', semester: 1 });
      setShowAssignForm(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign subject');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await API.delete(`/admin/subjects/${id}`);
        toast.success('Subject deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete subject');
      }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Subjects</h1>
          <p className="text-gray-500">Add subjects and assign to teachers</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowAssignForm(!showAssignForm); setShowForm(false); }}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm"
          >
            🔗 Assign to Teacher
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowAssignForm(false); }}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
          >
            {showForm ? '✕ Cancel' : '+ Add Subject'}
          </button>
        </div>
      </div>

      {/* Add Subject Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Subject</h2>
          <form onSubmit={handleAddSubject} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Data Structures"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., CS301"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Teacher (Optional)</label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                <option value="">Select Teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-4">
              <button
                type="submit"
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Add Subject
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Subject Form */}
      {showAssignForm && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Assign Subject to Teacher</h2>
          <form onSubmit={handleAssignSubject} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Teacher</label>
              <select
                value={assignData.teacherId}
                onChange={(e) => setAssignData({ ...assignData, teacherId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              >
                <option value="">Choose Teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
              <select
                value={assignData.subjectId}
                onChange={(e) => {
                  const subject = subjects.find(s => s._id === e.target.value);
                  setAssignData({ 
                    ...assignData, 
                    subjectId: e.target.value,
                    semester: subject?.semester || 1
                  });
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              >
                <option value="">Choose Subject</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code}) - Sem {subject.semester}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full"
              >
                Assign Subject
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by Semester:</label>
        <select
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <option key={sem} value={sem}>Semester {sem}</option>
          ))}
        </select>
      </div>

      {/* Subjects Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Subject</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Semester</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Teacher</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No subjects found. Add subjects above.
                  </td>
                </tr>
              ) : (
                subjects.map((subject, index) => (
                  <tr key={subject._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{subject.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                        {subject.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">Semester {subject.semester}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {subject.teacher?.name || <span className="text-gray-400">Not assigned</span>}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteSubject(subject._id)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageSubjects;