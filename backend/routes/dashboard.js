const express = require('express');
const router = express.Router();
const { dashboardController } = require('../controllers');
const { authMiddleware, requireSuperior } = require('../middleware');

router.use(authMiddleware);

// Dashboard routes
router.get('/', dashboardController.getDashboard);
router.get('/team-overview', requireSuperior, dashboardController.getTeamOverview);

module.exports = router;
