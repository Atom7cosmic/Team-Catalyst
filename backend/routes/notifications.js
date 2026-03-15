const express = require('express');
const router = express.Router();
const { notificationController } = require('../controllers');
const { authMiddleware } = require('../middleware');

router.use(authMiddleware);

// Notification routes
router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
