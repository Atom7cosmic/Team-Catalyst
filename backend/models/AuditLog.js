const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  email: {
    type: String,
    default: null
  },
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'password_reset', 'password_change', 'user_create', 'user_update', 'user_delete',
           'meeting_create', 'meeting_update', 'meeting_delete', 'meeting_join', 'meeting_leave',
           'task_create', 'task_update', 'task_delete', 'task_complete',
           'sprint_create', 'sprint_update', 'sprint_complete',
           'recommendation_acknowledge', 'recommendation_dismiss',
           'settings_update', 'prompt_update', 'export_data', 'access_denied']
  },
  resourceType: {
    type: String,
    enum: ['user', 'meeting', 'task', 'sprint', 'recommendation', 'system', 'auth'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
auditLogSchema.index({ resourceType: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ success: 1 });

// TTL index to automatically delete old logs after 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
