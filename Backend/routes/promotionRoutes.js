const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getSemesterOverview,
  getSubjectWiseAttendance,
  getPromotionPreview,
  promoteStudents,
  getAttendanceReportForPDF
} = require('../controllers/promotionController');

router.use(protect);
router.use(authorize('admin'));

router.get('/semester-overview', getSemesterOverview);
router.get('/subject-attendance/:semester', getSubjectWiseAttendance);
router.get('/preview/:semester', getPromotionPreview);
router.post('/promote/:semester', promoteStudents);
router.get('/attendance-report/:semester', getAttendanceReportForPDF);

module.exports = router;