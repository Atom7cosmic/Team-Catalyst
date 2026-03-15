const mongoose = require('mongoose');

const dailyScoreSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  taskCompletionRate: {
    type: Number,
    min: 0,
    max: 1
  },
  deadlineAdherenceRate: {
    type: Number,
    min: 0,
    max: 1
  },
  meetingContribution: {
    type: Number,
    min: 0,
    max: 1
  },
  workingHours: {
    type: Number,
    min: 0,
    max: 1
  },
  hoursLogged: {
    type: Number,
    default: 0
  }
}, { _id: false });

const performanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  currentScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 70
  },
  trend: {
    type: String,
    enum: ['improving', 'declining', 'neutral'],
    default: 'neutral'
  },
  weeklyScores: [dailyScoreSchema],
  lastCalculatedAt: {
    type: Date,
    default: Date.now
  },
  taskStats: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    overdueTasks: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }
  },
  meetingStats: {
    totalMeetings: { type: Number, default: 0 },
    avgContributionScore: { type: Number, default: 0 },
    totalSpeakingTime: { type: Number, default: 0 }
  },
  attendanceStats: {
    avgHoursPerDay: { type: Number, default: 8 },
    attendanceRate: { type: Number, default: 1 }
  },
  consecutiveNeutralOrDecliningDays: {
    type: Number,
    default: 0
  },
  consecutiveImprovingDays: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
performanceSchema.index({ trend: 1 });
performanceSchema.index({ lastCalculatedAt: -1 });

// Calculate trend method
performanceSchema.methods.calculateTrend = function() {
  if (this.weeklyScores.length < 14) {
    this.trend = 'neutral';
    return;
  }

  const sortedScores = this.weeklyScores
    .sort((a, b) => b.date - a.date)
    .slice(0, 14);

  const currentWeekAvg = sortedScores
    .slice(0, 7)
    .reduce((sum, s) => sum + s.score, 0) / 7;

  const previousWeekAvg = sortedScores
    .slice(7, 14)
    .reduce((sum, s) => sum + s.score, 0) / 7;

  const delta = currentWeekAvg - previousWeekAvg;

  if (delta > 3) {
    this.trend = 'improving';
    this.consecutiveImprovingDays += 1;
    this.consecutiveNeutralOrDecliningDays = 0;
  } else if (delta < -3) {
    this.trend = 'declining';
    this.consecutiveNeutralOrDecliningDays += 1;
    this.consecutiveImprovingDays = 0;
  } else {
    this.trend = 'neutral';
    this.consecutiveNeutralOrDecliningDays += 1;
    this.consecutiveImprovingDays = 0;
  }
};

module.exports = mongoose.model('Performance', performanceSchema);
