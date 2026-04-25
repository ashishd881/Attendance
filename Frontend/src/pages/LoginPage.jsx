import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const LoginPage = () => {
  const [loginType, setLoginType] = useState('teacher');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rollNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const credentials = {
      loginType,
      password: formData.password,
      ...(loginType === 'student'
        ? { rollNumber: formData.rollNumber }
        : { email: formData.email })
    };

    const result = await login(credentials);

    if (result.success) {
      toast.success(`Welcome back, ${result.data.name}!`);
      switch (result.data.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'teacher':
          navigate('/teacher/dashboard');
          break;
        case 'student':
          navigate('/student/dashboard');
          break;
        default:
          navigate('/login');
      }
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[url('/background_img.jpeg')] bg-cover bg-center bg-no-repeat">
      
      {/* Dark Overlay */}
      <div className="min-h-screen bg-black/50 flex items-center justify-center p-4">

        {/* Login Container */}
        <div className="max-w-md w-full">

          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
            <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
            <p className="text-gray-200 mt-2">Attendance Management System</p>
          </div>

          {/* Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-8">

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              {['admin', 'teacher', 'student'].map((type) => (
                <button
                  key={type}
                  onClick={() => setLoginType(type)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize ${
                    loginType === type
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {loginType === 'student' ? (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    name="rollNumber"
                    value={formData.rollNumber}
                    onChange={handleChange}
                    placeholder="Enter roll number"
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* <div className="mt-6 text-center">
              <Link
                to="/admin-setup"
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                First time? Setup Admin →
              </Link>
            </div> */}

          </div>
        </div>

        {/* Footer */}
      <div className="
        w-full mt-8 text-xs sm:text-sm text-gray-200 text-center
        md:fixed md:bottom-6 md:right-6 md:w-auto md:text-right md:mt-0
      ">
        <p>Developed Under the Guidance of</p>
        <p className="font-medium">Dr. Mamta Lambet Mam</p>

        <p className="mt-2">By -</p>
        <p>Batch of 2022-2026</p>
        <p>Ashish Kumar Dwivedi - 6260421267</p>
        <p>Hemant Kushwah - 9479519407</p>
        <p>Satyam Thakur - 6268455730</p>
      </div>

      </div>
    </div>
  );
};

export default LoginPage;