const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  markAttendance,
  editAttendance,
  getAttendanceBySubject,
  getMyAttendance,
  getAttendanceHistory
} = require('../controllers/attendanceController');

// Teacher routes
router.post('/mark', protect, authorize('teacher', 'admin'), markAttendance);
router.put('/edit/:id', protect, authorize('teacher', 'admin'), editAttendance);
router.get('/subject/:subjectId', protect, authorize('teacher', 'admin'), getAttendanceBySubject);
router.get('/history', protect, authorize('teacher', 'admin'), getAttendanceHistory);

// Student routes
router.get('/student/my-attendance', protect, authorize('student'), getMyAttendance);

module.exports = router;