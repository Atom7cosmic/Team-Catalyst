const { AuditLog, User } = require('../models');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Get audit logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { user, action, resourceType, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};

    if (user) query.user = user;
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Get audit logs error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get audit logs'
    });
  }
};

// Get user-specific audit logs
exports.getUserAuditLogs = async (req, res) => {
  try {
    const { userId } = req.params;

    const logs = await AuditLog.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    logger.error(`Get user audit logs error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get user audit logs'
    });
  }
};

// Export audit logs
exports.exportAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // In a real implementation, you'd generate a CSV or PDF here
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    logger.error(`Export audit logs error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to export audit logs'
    });
  }
};
