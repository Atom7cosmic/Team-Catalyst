const express = require('express');
const router = express.Router();
const { performanceController } = require('../controllers');
const { authMiddleware, requireUserAccess } = require('../middleware');

router.use(authMiddleware);

// Performance routes
router.get('/:userId?', requireUserAccess(), performanceController.getPerformance);
router.get('/:userId/trends', requireUserAccess(), performanceController.getTrends);
router.post('/pulse', performanceController.updatePulse);

module.exports = router;
