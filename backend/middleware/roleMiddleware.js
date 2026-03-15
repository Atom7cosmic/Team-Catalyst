const { User } = require('../models');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

/**
 * Check if user is a superior (can manage subordinates)
 * @param {Object} user - User object from request
 * @returns {boolean}
 */
const isSuperior = (user) => {
  if (!user) return false;
  // Admin is always a superior
  if (user.isAdmin) return true;
  // Roles with direct reports are superiors
  const superiorRoles = ['CEO', 'CTO', 'VP Engineering', 'Director of Engineering', 'Engineering Manager', 'Tech Lead'];
  return superiorRoles.includes(user.role);
};

/**
 * Check if user is a subordinate (is managed by someone)
 * @param {Object} user - User object from request
 * @returns {boolean}
 */
const isSubordinate = (user) => {
  if (!user) return false;
  const subordinateRoles = ['Software Engineer', 'Junior Engineer', 'Senior Engineer', 'Intern', 'QA Engineer', 'DevOps Engineer', 'Data Engineer', 'Security Engineer'];
  return subordinateRoles.includes(user.role);
};

/**
 * Check if user can access another user's data
 * @param {Object} requester - Requesting user
 * @param {string} targetUserId - Target user ID
 * @returns {Promise<boolean>}
 */
const canAccessUser = async (requester, targetUserId) => {
  if (!requester) return false;

  // Users can access their own data
  if (requester.userId === targetUserId) return true;

  // Admins can access all data
  if (requester.isAdmin) return true;

  // Superiors can access their direct reports' data
  if (isSuperior(requester)) {
    const targetUser = await User.findById(targetUserId);
    if (targetUser) {
      // Check if target is a direct report
      if (targetUser.superior?.toString() === requester.userId) return true;

      // Check if target is in the same org tree (superior can see subordinates)
      const superiorRoles = ['CEO', 'CTO', 'VP Engineering', 'Director of Engineering', 'Engineering Manager'];
      if (superiorRoles.includes(requester.role)) {
        // Get all users in the tree
        const treeUsers = await getOrgTreeUsers(requester.userId);
        return treeUsers.includes(targetUserId);
      }
    }
  }

  return false;
};

/**
 * Get all user IDs in an org tree (subordinates recursively)
 * @param {string} userId - Root user ID
 * @returns {Promise<Array>}
 */
const getOrgTreeUsers = async (userId) => {
  const userIds = [userId];
  const queue = [userId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const directReports = await User.find({ superior: currentId }).select('_id');

    for (const report of directReports) {
      const reportId = report._id.toString();
      if (!userIds.includes(reportId)) {
        userIds.push(reportId);
        queue.push(reportId);
      }
    }
  }

  return userIds;
};

/**
 * Middleware to check if user can access specific resource
 * @param {string} paramName - URL parameter name containing the target user ID
 */
const requireUserAccess = (paramName = 'userId') => {
  return async (req, res, next) => {
    try {
      const targetUserId = req.params[paramName];

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'User ID parameter required'
        });
      }

      const hasAccess = await canAccessUser(req.user, targetUserId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      next();
    } catch (error) {
      logger.error(`Role middleware error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Access check failed'
      });
    }
  };
};

/**
 * Middleware to require superior role
 */
const requireSuperior = (req, res, next) => {
  if (!req.user || !isSuperior(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Superior role required'
    });
  }
  next();
};

/**
 * Middleware to require subordinate role (or superior viewing own profile)
 */
const requireSubordinate = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Superiors can also access subordinate dashboards for themselves
  if (isSubordinate(req.user) || isSuperior(req.user)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied'
  });
};

/**
 * Check if a role change is valid in hierarchy
 * @param {string} currentRole - Current role
 * @param {string} newRole - Proposed new role
 * @returns {boolean}
 */
const isValidRoleChange = (currentRole, newRole) => {
  // Define role hierarchy levels
  const roleLevels = {
    'Intern': 1,
    'Junior Engineer': 2,
    'Software Engineer': 3,
    'Senior Engineer': 4,
    'Tech Lead': 5,
    'Engineering Manager': 5,
    'Director of Engineering': 6,
    'VP Engineering': 7,
    'CTO': 8,
    'CEO': 9,
    'Admin': 10
  };

  const currentLevel = roleLevels[currentRole] || 0;
  const newLevel = roleLevels[newRole] || 0;

  // Can promote up to 2 levels, or demote any amount
  if (newLevel > currentLevel) {
    return newLevel - currentLevel <= 2;
  }

  return true;
};

/**
 * Get dual approval requirement for a role
 * @param {string} role - Role to check
 * @returns {boolean}
 */
const requiresDualApproval = (role) => {
  const dualApprovalRoles = ['Senior Engineer', 'Tech Lead', 'Engineering Manager'];
  return dualApprovalRoles.includes(role);
};

module.exports = {
  isSuperior,
  isSubordinate,
  canAccessUser,
  getOrgTreeUsers,
  requireUserAccess,
  requireSuperior,
  requireSubordinate,
  isValidRoleChange,
  requiresDualApproval
};
