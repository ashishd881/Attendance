const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  registerTeacher,
  getAllTeachers,
  addSubject,
  assignSubjectToTeacher,
  getAllSubjects,
  getAllStudents,
  getAttendanceReport,
  sendShortAttendanceEmails,
  deleteTeacher,
  deleteSubject
} = require('../controllers/adminController');

router.use(protect);
router.use(authorize('admin'));

router.post('/register-teacher', registerTeacher);
router.get('/teachers', getAllTeachers);
router.delete('/teachers/:id', deleteTeacher);

router.post('/subjects', addSubject);
router.get('/subjects', getAllSubjects);
router.delete('/subjects/:id', deleteSubject);
router.put('/assign-subject', assignSubjectToTeacher);

router.get('/students', getAllStudents);
router.get('/attendance-report', getAttendanceReport);
router.post('/send-short-attendance-email', sendShortAttendanceEmails);

module.exports = router;