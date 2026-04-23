const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.use(protect);
router.use(authorize('admin'));

router.post('/register-teacher', adminController.registerTeacher);
router.get('/teachers', adminController.getAllTeachers);
router.delete('/teachers/:id', adminController.deleteTeacher);

router.post('/subjects', adminController.addSubject);
router.get('/subjects', adminController.getAllSubjects);
router.delete('/subjects/:id', adminController.deleteSubject);
router.put('/assign-subject', adminController.assignSubjectToTeacher);

router.get('/students', adminController.getAllStudents);
router.get('/attendance-report', adminController.getAttendanceReport);
router.get('/short-attendance', adminController.getShortAttendance);
router.post('/send-short-attendance-email', adminController.sendShortAttendanceEmails);

module.exports = router;