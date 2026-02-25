const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register admin (one-time setup)
// @route   POST /api/auth/register-admin
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'admin'
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Login user (admin/teacher/student)
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password, rollNumber, loginType } = req.body;

    let user;

    if (loginType === 'student' && rollNumber) {
      // Student login with roll number
      user = await User.findOne({ rollNumber, role: 'student' });
      if (!user) {
        return res.status(401).json({ message: 'Invalid roll number' });
      }
    } else {
      // Admin/Teacher login with email
      user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      rollNumber: user.rollNumber,
      semester: user.semester,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('subjects.subject');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { registerAdmin, loginUser, getProfile };