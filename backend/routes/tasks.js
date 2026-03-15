const express = require('express');
const router = express.Router();
const { taskController } = require('../controllers');
const { authMiddleware } = require('../middleware');

router.use(authMiddleware);

// Task routes
router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.get('/stats', taskController.getTaskStats);
router.get('/:id', taskController.getTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.post('/:id/comments', taskController.addComment);

module.exports = router;
