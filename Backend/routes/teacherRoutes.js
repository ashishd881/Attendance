const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  addStudent,
  removeStudent,
  getStudentsBySemester,
  getMySubjects,
  updateStudent
} = require('../controllers/teacherController');

router.use(protect);
router.use(authorize('teacher', 'admin'));

router.post('/students', addStudent);
router.delete('/students/:id', removeStudent);
router.put('/students/:id', updateStudent);
router.get('/students/:semester', getStudentsBySemester);
router.get('/my-subjects', getMySubjects);

module.exports = router;