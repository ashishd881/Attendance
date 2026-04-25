import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import LoadingSpinner from './components/common/LoadingSpinner';

import LoginPage from './pages/LoginPage';
// import AdminSetup from './pages/AdminSetup';

import AdminDashboard from './components/admin/AdminDashboard';
import ManageTeachers from './components/admin/ManageTeachers';
import ManageSubjects from './components/admin/ManageSubjects';
import ViewStudents from './components/admin/ViewStudents';
import AttendanceReport from './components/admin/AttendanceReport';
import PromoteStudents from './components/admin/PromoteStudents'; // NEW
import AdminSetup from './components/admin/AdminSetup';

import TeacherDashboard from './components/teacher/TeacherDashboard';
import MarkAttendance from './components/teacher/MarkAttendance';
import ManageStudents from './components/teacher/ManageStudents';
import AttendanceHistory from './components/teacher/AttendanceHistory';

import StudentDashboard from './components/student/StudentDashboard';

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <LoginPage />
      } />
      {/* <Route path="/admin-setup" element={<AdminSetup />} /> */}
      <Route path="/admin/admin-setup" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout>
            <AdminSetup />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout><AdminDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/teachers" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout><ManageTeachers /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/subjects" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout><ManageSubjects /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/students" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout><ViewStudents /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/attendance-report" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout><AttendanceReport /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/promote-students" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout><PromoteStudents /></DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/teacher/dashboard" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <DashboardLayout><TeacherDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/mark-attendance" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <DashboardLayout><MarkAttendance /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/manage-students" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <DashboardLayout><ManageStudents /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/attendance-history" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <DashboardLayout><AttendanceHistory /></DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/student/dashboard" element={
        <ProtectedRoute allowedRoles={['student']}>
          <DashboardLayout><StudentDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="colored"
        />
      </AuthProvider>
    </Router>
  );
}

export default App;