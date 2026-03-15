const mongoose = require('mongoose');

const promptTemplateSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    unique: true,
    enum: ['Sprint Planning', 'Performance Review', 'Architecture Discussion', '1:1', 'All-Hands', 'Custom']
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  systemPrompt: {
    type: String,
    required: true
  },
  userPromptTemplate: {
    type: String,
    required: true
  },
  outputSchema: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      summary: 'string',
      conclusions: 'array of strings',
      decisions: 'array of strings',
      actionItems: 'array of {owner, task, deadline}',
      followUpTopics: 'array of strings',
      attendeeContributions: 'array of {name, score, keyPoints, speakingTime}'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes

module.exports = mongoose.model('PromptTemplate', promptTemplateSchema);
