const { Performance, Task, Meeting, Attendance, User } = require('../models');
const { canAccessUser } = require('../middleware');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Get performance data
exports.getPerformance = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user.userId;

    const hasAccess = await canAccessUser(req.user, targetUserId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    let performance = await Performance.findOne({ user: targetUserId });

    if (!performance) {
      // Create initial performance record
      const user = await User.findById(targetUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      performance = new Performance({
        user: targetUserId,
        currentScore: 70,
        trend: 'neutral',
        weeklyScores: []
      });
      await performance.save();
    }

    // Get recent data for context
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasks = await Task.find({
      assignee: targetUserId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const meetings = await Meeting.find({
      'attendees.user': targetUserId,
      scheduledDate: { $gte: thirtyDaysAgo },
      status: 'ready'
    });

    const attendance = await Attendance.find({
      user: targetUserId,
      date: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      performance: {
        ...performance.toObject(),
        recentData: {
          tasks,
          meetings,
          attendance
        }
      }
    });
  } catch (error) {
    logger.error(`Get performance error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance'
    });
  }
};

// Update pulse score
exports.updatePulse = async (req, res) => {
  try {
    const { score, notes, week } = req.body;
    const userId = req.user.userId;

    let performance = await Performance.findOne({ user: userId });

    if (!performance) {
      performance = new Performance({
        user: userId,
        currentScore: 70,
        trend: 'neutral',
        weeklyScores: []
      });
    }

    // Add or update pulse score for the week
    const weekString = week || getCurrentWeek();
    const existingIndex = performance.pulseScores.findIndex(p => p.week === weekString);

    if (existingIndex >= 0) {
      performance.pulseScores[existingIndex].score = score;
      performance.pulseScores[existingIndex].notes = notes;
    } else {
      performance.pulseScores.push({
        week: weekString,
        score,
        notes
      });
    }

    // Keep only last 12 weeks
    if (performance.pulseScores.length > 12) {
      performance.pulseScores = performance.pulseScores.slice(-12);
    }

    await performance.save();

    res.json({
      success: true,
      message: 'Pulse score updated',
      performance
    });
  } catch (error) {
    logger.error(`Update pulse error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update pulse'
    });
  }
};

// Get performance trends
exports.getTrends = async (req, res) => {
  try {
    const { userId, days = 30 } = req.query;
    const targetUserId = userId || req.user.userId;

    const hasAccess = await canAccessUser(req.user, targetUserId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const performance = await Performance.findOne({ user: targetUserId });

    if (!performance) {
      return res.json({
        success: true,
        trends: []
      });
    }

    // Get score trend
    const scoreTrend = performance.weeklyScores.slice(-parseInt(days)).map(s => ({
      date: s.date,
      score: s.score,
      taskCompletion: s.taskCompletionRate,
      deadlineAdherence: s.deadlineAdherenceRate,
      meetingContribution: s.meetingContribution,
      workingHours: s.workingHours
    }));

    res.json({
      success: true,
      trends: scoreTrend
    });
  } catch (error) {
    logger.error(`Get trends error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get trends'
    });
  }
};

// Helper function
function getCurrentWeek() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const diff = now - start + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const week = Math.floor(diff / oneWeek) + 1;
  return `${year}-W${week.toString().padStart(2, '0')}`;
}
