const { User, Performance, AuditLog } = require('../models');
const { canAccessUser, getOrgTreeUsers, isValidRoleChange } = require('../middleware');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Get all users (with access control)
exports.getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;

    let query = { isActive: true };

    // If not admin, only show users in their org tree
    if (!req.user.isAdmin) {
      const accessibleUsers = await getOrgTreeUsers(req.user.userId);
      query._id = { $in: accessibleUsers };
    }

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .populate('superior', 'firstName lastName email role')
      .select('-password')
      .sort({ roleLevel: 1, firstName: 1 })
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
    logger.error(`Get users error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

// Get single user
exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const hasAccess = await canAccessUser(req.user, id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(id)
      .populate('superior', 'firstName lastName email role avatar')
      .populate('team', 'firstName lastName email role avatar')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get performance data
    const performance = await Performance.findOne({ user: id });

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        performance
      }
    });
  } catch (error) {
    logger.error(`Get user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Users can update themselves, superiors can update their reports, admins can update anyone
    const isSelf = id === req.user.userId;
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isDirectReport = targetUser.superior?.toString() === req.user.userId;

    if (!isSelf && !isDirectReport && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Role changes require admin or specific approval
    if (updates.role && updates.role !== targetUser.role) {
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can change roles'
        });
      }

      if (!isValidRoleChange(targetUser.role, updates.role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role change'
        });
      }

      // Update role level
      const hierarchy = require('../config/hierarchy.config');
      const roleConfig = hierarchy.getRoleByName(updates.role);
      updates.roleLevel = roleConfig?.level || 3;
    }

    const oldValue = { ...targetUser.toObject() };

    Object.assign(targetUser, updates);
    await targetUser.save();

    await AuditLog.create({
      user: req.user.userId,
      action: 'user_update',
      resourceType: 'user',
      resourceId: id,
      oldValue,
      newValue: updates,
      success: true,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'User updated',
      user: targetUser
    });
  } catch (error) {
    logger.error(`Update user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// Delete user (deactivate)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete - deactivate
    user.isActive = false;
    user.email = `${user.email}.inactive.${Date.now()}`;
    await user.save();

    await AuditLog.create({
      user: req.user.userId,
      action: 'user_delete',
      resourceType: 'user',
      resourceId: id,
      success: true,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'User deactivated'
    });
  } catch (error) {
    logger.error(`Delete user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// Get org chart data
exports.getOrgChart = async (req, res) => {
  try {
    let query = { isActive: true };

    if (!req.user.isAdmin) {
      const accessibleUsers = await getOrgTreeUsers(req.user.userId);
      query._id = { $in: accessibleUsers };
    }

    const users = await User.find(query)
      .select('firstName lastName role roleLevel superior team avatar')
      .lean();

    // Format for D3.js
    const orgData = users.map(u => ({
      id: u._id.toString(),
      name: `${u.firstName} ${u.lastName}`,
      role: u.role,
      level: u.roleLevel,
      parentId: u.superior?.toString() || null,
      avatar: u.avatar
    }));

    res.json({
      success: true,
      orgChart: orgData
    });
  } catch (error) {
    logger.error(`Get org chart error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get org chart'
    });
  }
};

// Get team members
exports.getTeam = async (req, res) => {
  try {
    const userId = req.params.id || req.user.userId;
    if (userId === "org-chart") return res.status(400).json({ success: false, message: "Invalid user ID" });

    const hasAccess = await canAccessUser(req.user, userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get direct reports
    const directReports = await User.find({
      superior: userId,
      isActive: true
    }).select('firstName lastName email role avatar');

    // Get superior
    const user = await User.findById(userId).populate('superior');

    res.json({
      success: true,
      team: {
        directReports,
        superior: user?.superior || null
      }
    });
  } catch (error) {
    logger.error(`Get team error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get team'
    });
  }
};

// Update user settings
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { darkMode, timezone, notifications, language } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        ...(darkMode !== undefined && { darkMode }),
        ...(timezone && { timezone }),
        ...(language && { language })
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Settings updated',
      settings: {
        darkMode: user.darkMode,
        timezone: user.timezone
      }
    });
  } catch (error) {
    logger.error(`Update settings error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
};
