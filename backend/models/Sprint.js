const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  goal: {
    type: String,
    default: ''
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },
  totalStoryPoints: {
    type: Number,
    default: 0
  },
  completedStoryPoints: {
    type: Number,
    default: 0
  },
  velocity: {
    type: Number,
    default: null
  },
  retrospectiveNotes: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
sprintSchema.index({ team: 1 });
sprintSchema.index({ status: 1 });
sprintSchema.index({ startDate: -1 });
sprintSchema.index({ endDate: -1 });

module.exports = mongoose.model('Sprint', sprintSchema);
