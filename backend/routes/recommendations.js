const express = require('express');
const router = express.Router();
const { recommendationController } = require('../controllers');
const { authMiddleware, requireSuperior, adminMiddleware } = require('../middleware');

router.use(authMiddleware);

// Recommendation routes
router.get('/', recommendationController.getRecommendations);
router.get('/stats', requireSuperior, recommendationController.getStats);
router.get('/:id', recommendationController.getRecommendation);
router.post('/:id/acknowledge', requireSuperior, recommendationController.acknowledgeRecommendation);
router.post('/:id/dismiss', requireSuperior, recommendationController.dismissRecommendation);
router.post('/generate', adminMiddleware, recommendationController.generateRecommendation);

module.exports = router;
