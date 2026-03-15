const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['CEO', 'CTO', 'VP Engineering', 'Director of Engineering', 'Engineering Manager',
           'Tech Lead', 'Senior Engineer', 'Software Engineer', 'Junior Engineer', 'Intern',
           'QA Engineer', 'DevOps Engineer', 'Data Engineer', 'Security Engineer',
           'System Administrator', 'Network Engineer', 'Admin']
  },
  roleLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  department: {
    type: String,
    default: 'Engineering'
  },
  superior: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  team: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isAdmin: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  darkMode: {
    type: Boolean,
    default: true
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  refreshTokenVersion: {
    type: Number,
    default: 0
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockoutUntil: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual to check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
});

// Index for common queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ superior: 1 });
userSchema.index({ isActive: 1 });

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment failed login attempts
userSchema.methods.incrementLoginAttempts = async function() {
  // Reset if lockout has expired
  if (this.lockoutUntil && this.lockoutUntil < Date.now()) {
    this.failedLoginAttempts = 1;
    this.lockoutUntil = null;
    return this.save();
  }

  this.failedLoginAttempts += 1;

  // Lock account after 5 failed attempts
  if (this.failedLoginAttempts >= 5 && !this.isLocked) {
    this.lockoutUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
  }

  return this.save();
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  this.failedLoginAttempts = 0;
  this.lockoutUntil = null;
  return this.save();
};

// Method to increment refresh token version
userSchema.methods.incrementTokenVersion = function() {
  this.refreshTokenVersion += 1;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
