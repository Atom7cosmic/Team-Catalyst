const express = require('express');
const router = express.Router();
const { userController } = require('../controllers');
const { authMiddleware, adminMiddleware, requireUserAccess, requireSuperior } = require('../middleware');

router.use(authMiddleware);

// User routes
router.get('/', userController.getUsers);
router.get('/org-chart', userController.getOrgChart);
router.get('/team/:id?', userController.getTeam);
router.get('/:id', requireUserAccess('id'), userController.getUser);
router.put('/:id', requireUserAccess('id'), userController.updateUser);
router.delete('/:id', adminMiddleware, userController.deleteUser);
router.put('/settings/me', userController.updateSettings);

module.exports = router;
