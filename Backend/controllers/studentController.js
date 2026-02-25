const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

// @desc    Get student profile
// @route   GET /api/student/profile
const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getStudentProfile };