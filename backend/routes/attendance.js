const express = require('express');
const router = express.Router();
const { attendanceController } = require('../controllers');
const { authMiddleware, requireSuperior } = require('../middleware');

router.use(authMiddleware);

// Attendance routes
router.get('/', attendanceController.getAttendance);
router.get('/heatmap', attendanceController.getHeatmap);
router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.post('/record', requireSuperior, attendanceController.recordAttendance);

module.exports = router;
