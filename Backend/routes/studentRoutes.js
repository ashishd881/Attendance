const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getStudentProfile } = require('../controllers/studentController');

router.use(protect);
router.use(authorize('student'));

router.get('/profile', getStudentProfile);

module.exports = router;