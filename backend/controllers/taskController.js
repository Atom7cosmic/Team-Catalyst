const { Task, Sprint, User, Notification, AuditLog } = require('../models');
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

// Get all tasks
exports.getTasks = async (req, res) => {
  try {
    const {
      status,
      assignee,
      sprint,
      priority,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    // Access control
    if (req.user.isAdmin) {
      // Admin sees all
    } else if (assignee && await canAccessUser(req.user, assignee)) {
      query.assignee = assignee;
    } else {
      // Default to own tasks or tasks reported by user
      query.$or = [
        { assignee: req.user.userId },
        { reporter: req.user.userId }
      ];
    }

    if (status) query.status = status;
    if (sprint) query.sprint = sprint;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(query)
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email')
      .populate('sprint', 'name status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Get tasks error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get tasks'
    });
  }
};

// Get single task
exports.getTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email')
      .populate('sprint', 'name status')
      .populate('comments.author', 'firstName lastName avatar');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access
    const hasAccess =
      task.assignee?._id.toString() === req.user.userId ||
      task.reporter?._id.toString() === req.user.userId ||
      req.user.isAdmin ||
      await canAccessUser(req.user, task.assignee?._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    logger.error(`Get task error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get task'
    });
  }
};

// Create task
exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      assignee,
      sprint,
      priority,
      type,
      estimatedHours,
      dueDate,
      labels,
      meetingSource
    } = req.body;

    // Check if can assign to user
    if (assignee && !await canAccessUser(req.user, assignee)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot assign to this user'
      });
    }

    const task = new Task({
      title,
      description,
      assignee: assignee || req.user.userId,
      reporter: req.user.userId,
      sprint,
      priority,
      type,
      estimatedHours,
      dueDate,
      labels,
      meetingSource
    });

    await task.save();

    // Populate for response
    await task.populate('assignee', 'firstName lastName email');

    // Create notification for assignee
    if (assignee && assignee !== req.user.userId) {
      await Notification.create({
        user: assignee,
        type: 'task_assigned',
        title: 'New task assigned',
        message: `"${title}" has been assigned to you`,
        link: `/tasks/${task._id}`,
        entityType: 'task',
        entityId: task._id
      });
    }

    await AuditLog.create({
      user: req.user.userId,
      action: 'task_create',
      resourceType: 'task',
      resourceId: task._id,
      newValue: { title, assignee, priority },
      success: true,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Task created',
      task
    });
  } catch (error) {
    logger.error(`Create task error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to create task'
    });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access
    const hasAccess =
      task.assignee?.toString() === req.user.userId ||
      task.reporter?.toString() === req.user.userId ||
      req.user.isAdmin;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const oldValue = { ...task.toObject() };

    Object.assign(task, updates);
    await task.save();

    // Notify if status changed to done
    if (updates.status === 'done' && oldValue.status !== 'done') {
      await Notification.create({
        user: task.reporter,
        type: 'task_completed',
        title: 'Task completed',
        message: `"${task.title}" has been completed`,
        link: `/tasks/${task._id}`,
        entityType: 'task',
        entityId: task._id
      });
    }

    await AuditLog.create({
      user: req.user.userId,
      action: 'task_update',
      resourceType: 'task',
      resourceId: id,
      oldValue,
      newValue: updates,
      success: true,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Task updated',
      task
    });
  } catch (error) {
    logger.error(`Update task error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (task.reporter?.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only reporter can delete task'
      });
    }

    await Task.findByIdAndDelete(id);

    await AuditLog.create({
      user: req.user.userId,
      action: 'task_delete',
      resourceType: 'task',
      resourceId: id,
      success: true,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Task deleted'
    });
  } catch (error) {
    logger.error(`Delete task error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  }
};

// Add comment
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    task.comments.push({
      author: req.user.userId,
      text
    });

    await task.save();
    await task.populate('comments.author', 'firstName lastName avatar');

    res.json({
      success: true,
      message: 'Comment added',
      task
    });
  } catch (error) {
    logger.error(`Add comment error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
};

// Get task stats
exports.getTaskStats = async (req, res) => {
  try {
    const userId = req.query.userId || req.user.userId;

    const hasAccess = await canAccessUser(req.user, userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const stats = await Task.aggregate([
      { $match: { assignee: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Task.aggregate([
      { $match: { assignee: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        byStatus: stats,
        byPriority: priorityStats
      }
    });
  } catch (error) {
    logger.error(`Get task stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get task stats'
    });
  }
};
