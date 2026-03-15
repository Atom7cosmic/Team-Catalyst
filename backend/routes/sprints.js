const express = require('express');
const router = express.Router();
const { sprintController } = require('../controllers');
const { authMiddleware } = require('../middleware');

router.use(authMiddleware);

// Sprint routes
router.get('/', sprintController.getSprints);
router.post('/', sprintController.createSprint);
router.get('/:id', sprintController.getSprint);
router.put('/:id', sprintController.updateSprint);
router.delete('/:id', sprintController.deleteSprint);
router.post('/:id/complete', sprintController.completeSprint);

module.exports = router;
