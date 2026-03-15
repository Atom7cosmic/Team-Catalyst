const { User, PromptTemplate, AuditLog } = require('../models');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Get all users (admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { isActive, role, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .populate('superior', 'firstName lastName email')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Admin get users error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

// Activate/deactivate user
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'}`,
      user
    });
  } catch (error) {
    logger.error(`Toggle user status error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

// Get prompt templates
exports.getPromptTemplates = async (req, res) => {
  try {
    const templates = await PromptTemplate.find()
      .populate('createdBy', 'firstName lastName')
      .sort({ domain: 1 });

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    logger.error(`Get prompt templates error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get prompt templates'
    });
  }
};

// Update prompt template
exports.updatePromptTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    updates.updatedBy = req.user.userId;

    const template = await PromptTemplate.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    await AuditLog.create({
      user: req.user.userId,
      action: 'prompt_update',
      resourceType: 'system',
      resourceId: id,
      success: true,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Template updated',
      template
    });
  } catch (error) {
    logger.error(`Update prompt template error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update template'
    });
  }
};

// Get system stats
exports.getSystemStats = async (req, res) => {
  try {
    const stats = {
      users: await User.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
      adminUsers: await User.countDocuments({ isAdmin: true }),
      newUsersThisMonth: await User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error(`Get system stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get system stats'
    });
  }
};

// Impersonate user (for admin support)
exports.impersonateUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate tokens for impersonated user
    const jwt = require('jsonwebtoken');
    const accessToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        roleLevel: user.roleLevel,
        isAdmin: user.isAdmin,
        superior: user.superior?.toString(),
        impersonatedBy: req.user.userId // Track original admin
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await AuditLog.create({
      user: req.user.userId,
      action: 'user_impersonate',
      resourceType: 'user',
      resourceId: userId,
      success: true,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Impersonation token generated',
      accessToken
    });
  } catch (error) {
    logger.error(`Impersonate user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to impersonate user'
    });
  }
};
