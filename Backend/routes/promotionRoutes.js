const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPromotionPreview,
  promoteStudents,
  getAttendanceReportForPDF,
  getSemesterOverview
} = require('../controllers/promotionController');

router.use(protect);
router.use(authorize('admin'));

// Get overview of all semesters
router.get('/semester-overview', getSemesterOverview);

// Get promotion preview for a semester
router.get('/preview/:semester', getPromotionPreview);

// Promote students of a semester
router.post('/promote/:semester', promoteStudents);

// Get attendance report data for PDF
router.get('/attendance-report/:semester', getAttendanceReportForPDF);

module.exports = router;