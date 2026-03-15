const authController = require('./authController');
const userController = require('./userController');
const meetingController = require('./meetingController');
const taskController = require('./taskController');
const sprintController = require('./sprintController');
const attendanceController = require('./attendanceController');
const performanceController = require('./performanceController');
const recommendationController = require('./recommendationController');
const notificationController = require('./notificationController');
const auditController = require('./auditController');
const dashboardController = require('./dashboardController');
const adminController = require('./adminController');

module.exports = {
  authController,
  userController,
  meetingController,
  taskController,
  sprintController,
  attendanceController,
  performanceController,
  recommendationController,
  notificationController,
  auditController,
  dashboardController,
  adminController
};
