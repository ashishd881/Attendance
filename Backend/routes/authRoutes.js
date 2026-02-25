const express = require('express');
const router = express.Router();
const { registerAdmin, loginUser, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register-admin', registerAdmin);
router.post('/login', loginUser);
router.get('/profile', protect, getProfile);

module.exports = router;