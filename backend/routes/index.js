const authRoutes = require('./auth');
const userRoutes = require('./users');
const meetingRoutes = require('./meetings');
const taskRoutes = require('./tasks');
const sprintRoutes = require('./sprints');
const attendanceRoutes = require('./attendance');
const performanceRoutes = require('./performance');
const recommendationRoutes = require('./recommendations');
const notificationRoutes = require('./notifications');
const auditRoutes = require('./audit');
const dashboardRoutes = require('./dashboard');
const adminRoutes = require('./admin');

module.exports = {
  authRoutes,
  userRoutes,
  meetingRoutes,
  taskRoutes,
  sprintRoutes,
  attendanceRoutes,
  performanceRoutes,
  recommendationRoutes,
  notificationRoutes,
  auditRoutes,
  dashboardRoutes,
  adminRoutes
};
