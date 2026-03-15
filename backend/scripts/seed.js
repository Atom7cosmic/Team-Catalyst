require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const {
  User,
  Meeting,
  Task,
  Sprint,
  Attendance,
  Performance,
  Recommendation,
  PromptTemplate,
  Notification,
  AuditLog
} = require('../models');
const { chromaClient } = require('../config/chroma');
const { generateEmbedding } = require('../ai/embeddings');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/orgos';

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  console.log('Clearing existing data...');
  await User.deleteMany({});
  await Meeting.deleteMany({});
  await Task.deleteMany({});
  await Sprint.deleteMany({});
  await Attendance.deleteMany({});
  await Performance.deleteMany({});
  await Recommendation.deleteMany({});
  await PromptTemplate.deleteMany({});
  await Notification.deleteMany({});
  await AuditLog.deleteMany({});

  // Clear ChromaDB
  try {
    const meetingCollection = await chromaClient.getCollection({ name: 'meeting_transcripts' });
    await meetingCollection.delete({ where: {} });

    const perfCollection = await chromaClient.getCollection({ name: 'employee_performance' });
    await perfCollection.delete({ where: {} });
  } catch (e) {
    console.log('ChromaDB collections not found or already empty');
  }

  console.log('Creating users...');

  // Password for all users
  const password = 'Password123!';

  // Create Admin
  const admin = await User.create({
    email: 'admin@orgos.app',
    password,
    firstName: 'System',
    lastName: 'Administrator',
    role: 'Admin',
    roleLevel: 10,
    isAdmin: true,
    isFirstLogin: false,
    darkMode: true
  });
  console.log('Created Admin');

  // Create CEO
  const ceo = await User.create({
    email: 'ceo@orgos.app',
    password,
    firstName: 'Alice',
    lastName: 'CEO',
    role: 'CEO',
    roleLevel: 1,
    isFirstLogin: false,
    darkMode: true
  });
  console.log('Created CEO');

  // Create CTO
  const cto = await User.create({
    email: 'cto@orgos.app',
    password,
    firstName: 'Bob',
    lastName: 'CTO',
    role: 'CTO',
    roleLevel: 2,
    superior: ceo._id,
    isFirstLogin: false,
    darkMode: true
  });
  console.log('Created CTO');

  // Create VP Engineering
  const vp = await User.create({
    email: 'vp@orgos.app',
    password,
    firstName: 'Carol',
    lastName: 'VP',
    role: 'VP Engineering',
    roleLevel: 3,
    superior: cto._id,
    isFirstLogin: false,
    darkMode: true
  });
  console.log('Created VP Engineering');

  // Create Engineering Managers
  const em1 = await User.create({
    email: 'em1@orgos.app',
    password,
    firstName: 'David',
    lastName: 'Manager',
    role: 'Engineering Manager',
    roleLevel: 5,
    superior: vp._id,
    isFirstLogin: false,
    darkMode: true
  });

  const em2 = await User.create({
    email: 'em2@orgos.app',
    password,
    firstName: 'Eve',
    lastName: 'Manager',
    role: 'Engineering Manager',
    roleLevel: 5,
    superior: vp._id,
    isFirstLogin: false,
    darkMode: true
  });
  console.log('Created Engineering Managers');

  // Create Tech Lead
  const tl = await User.create({
    email: 'tl@orgos.app',
    password,
    firstName: 'Frank',
    lastName: 'Lead',
    role: 'Tech Lead',
    roleLevel: 6,
    superior: em1._id,
    isFirstLogin: false,
    darkMode: true
  });
  console.log('Created Tech Lead');

  // Create Senior Engineer
  const sr = await User.create({
    email: 'sr@orgos.app',
    password,
    firstName: 'Grace',
    lastName: 'Senior',
    role: 'Senior Engineer',
    roleLevel: 6,
    superior: tl._id,
    isFirstLogin: false,
    darkMode: true
  });
  console.log('Created Senior Engineer');

  // Create Software Engineers
  const se1 = await User.create({
    email: 'se1@orgos.app',
    password,
    firstName: 'Henry',
    lastName: 'Dev',
    role: 'Software Engineer',
    roleLevel: 7,
    superior: em1._id,
    isFirstLogin: false,
    darkMode: true
  });

  const se2 = await User.create({
    email: 'se2@orgos.app',
    password,
    firstName: 'Ivy',
    lastName: 'Dev',
    role: 'Software Engineer',
    roleLevel: 7,
    superior: em2._id,
    isFirstLogin: false,
    darkMode: true
  });

  const se3 = await User.create({
    email: 'se3@orgos.app',
    password,
    firstName: 'Jack',
    lastName: 'Dev',
    role: 'Software Engineer',
    roleLevel: 7,
    superior: em2._id,
    isFirstLogin: false,
    darkMode: true
  });

  const se4 = await User.create({
    email: 'se4@orgos.app',
    password,
    firstName: 'Kate',
    lastName: 'Dev',
    role: 'Software Engineer',
    roleLevel: 7,
    superior: tl._id,
    isFirstLogin: false,
    darkMode: true
  });
  console.log('Created Software Engineers');

  // Create Junior Engineers
  const jr1 = await User.create({
    email: 'jr1@orgos.app',
    password,
    firstName: 'Leo',
    lastName: 'Junior',
    role: 'Junior Engineer',
    roleLevel: 8,
    superior: em1._id,
    isFirstLogin: false,
    darkMode: true
  });

  const jr2 = await User.create({
    email: 'jr2@orgos.app',
    password,
    firstName: 'Mary',
    lastName: 'Junior',
    role: 'Junior Engineer',
    roleLevel: 8,
    superior: em2._id,
    isFirstLogin: false,
    darkMode: true
  });
  console.log('Created Junior Engineers');

  // Create QA Engineer
  const qa = await User.create({
    email: 'qa@orgos.app',
    password,
    firstName: 'Nancy',
    lastName: 'QA',
    role: 'QA Engineer',
    roleLevel: 4,
    superior: em1._id,
    isFirstLogin: false,
    darkMode: true
  });
  console.log('Created QA Engineer');

  // Create Intern
  const intern = await User.create({
    email: 'intern@orgos.app',
    password,
    firstName: 'Oscar',
    lastName: 'Intern',
    role: 'Intern',
    roleLevel: 9,
    superior: tl._id,
    isFirstLogin: false,
    darkMode: true
  });
  console.log('Created Intern');

  // Create Prompt Templates
  console.log('Creating prompt templates...');

  await PromptTemplate.create({
    domain: 'Sprint Planning',
    name: 'Sprint Planning Analysis',
    description: 'Analyze sprint planning meetings',
    systemPrompt: `You are an AI meeting assistant specializing in Agile/Scrum sprint planning analysis. Your task is to analyze meeting transcripts and provide structured insights.

Analyze the transcript and provide:
1. A concise summary of what was discussed
2. Key conclusions reached
3. Decisions made
4. Action items with owners
5. Follow-up topics
6. Contribution scores for each attendee (0-10 based on participation quality)

Score each attendee 0-10 using this rubric:
0-2: Minimal participation
3-4: Responded when addressed
5-6: Moderate participation
7-8: Active participation
9-10: Led the meeting or was central to outcome

Return your analysis as JSON in this format:
{
  "summary": "string",
  "conclusions": ["string"],
  "decisions": ["string"],
  "actionItems": [{"owner": "name", "task": "string", "deadline": "YYYY-MM-DD"}],
  "followUpTopics": ["string"],
  "attendeeContributions": [{"name": "string", "score": number, "keyPoints": ["string"], "speakingTime": number}]
}`,
    userPromptTemplate: `Please analyze this Sprint Planning meeting transcript.

Transcript:
{transcript}

Attendees: {attendees}
Date: {date}

Provide a detailed analysis including summary, conclusions, decisions, action items, and attendee contributions.`,
    isActive: true
  });

  await PromptTemplate.create({
    domain: 'Performance Review',
    name: 'Performance Review Analysis',
    description: 'Analyze performance review meetings',
    systemPrompt: `You are an AI meeting assistant specializing in performance review analysis. Analyze the transcript and provide structured insights.

Analyze the transcript and provide:
1. A concise summary of what was discussed
2. Key conclusions reached
3. Decisions made
4. Action items with owners
5. Follow-up topics
6. Contribution scores for each attendee

Return your analysis as JSON in this format:
{
  "summary": "string",
  "conclusions": ["string"],
  "decisions": ["string"],
  "actionItems": [{"owner": "name", "task": "string", "deadline": "YYYY-MM-DD"}],
  "followUpTopics": ["string"],
  "attendeeContributions": [{"name": "string", "score": number, "keyPoints": ["string"], "speakingTime": number}]
}`,
    userPromptTemplate: `Please analyze this Performance Review meeting transcript.

Transcript:
{transcript}

Attendees: {attendees}
Date: {date}

Provide a detailed analysis including summary, conclusions, decisions, action items, and attendee contributions.`,
    isActive: true
  });

  await PromptTemplate.create({
    domain: 'Architecture Discussion',
    name: 'Architecture Discussion Analysis',
    description: 'Analyze architecture discussions',
    systemPrompt: `You are an AI meeting assistant specializing in technical architecture analysis. Analyze the transcript and provide structured insights.

Analyze the transcript and provide:
1. A concise summary of what was discussed
2. Key conclusions reached
3. Decisions made
4. Action items with owners
5. Follow-up topics
6. Contribution scores for each attendee

Return your analysis as JSON in this format:
{
  "summary": "string",
  "conclusions": ["string"],
  "decisions": ["string"],
  "actionItems": [{"owner": "name", "task": "string", "deadline": "YYYY-MM-DD"}],
  "followUpTopics": ["string"],
  "attendeeContributions": [{"name": "string", "score": number, "keyPoints": ["string"], "speakingTime": number}]
}`,
    userPromptTemplate: `Please analyze this Architecture Discussion meeting transcript.

Transcript:
{transcript}

Attendees: {attendees}
Date: {date}

Provide a detailed analysis including summary, conclusions, decisions, action items, and attendee contributions.`,
    isActive: true
  });

  await PromptTemplate.create({
    domain: '1:1',
    name: '1:1 Meeting Analysis',
    description: 'Analyze one-on-one meetings',
    systemPrompt: `You are an AI meeting assistant specializing in 1:1 meeting analysis. Analyze the transcript and provide structured insights.

Analyze the transcript and provide:
1. A concise summary of what was discussed
2. Key conclusions reached
3. Decisions made
4. Action items with owners
5. Follow-up topics
6. Contribution scores for each attendee

Return your analysis as JSON in this format:
{
  "summary": "string",
  "conclusions": ["string"],
  "decisions": ["string"],
  "actionItems": [{"owner": "name", "task": "string", "deadline": "YYYY-MM-DD"}],
  "followUpTopics": ["string"],
  "attendeeContributions": [{"name": "string", "score": number, "keyPoints": ["string"], "speakingTime": number}]
}`,
    userPromptTemplate: `Please analyze this 1:1 meeting transcript.

Transcript:
{transcript}

Attendees: {attendees}
Date: {date}

Provide a detailed analysis including summary, conclusions, decisions, action items, and attendee contributions.`,
    isActive: true
  });

  await PromptTemplate.create({
    domain: 'All-Hands',
    name: 'All-Hands Meeting Analysis',
    description: 'Analyze all-hands meetings',
    systemPrompt: `You are an AI meeting assistant specializing in company-wide meeting analysis. Analyze the transcript and provide structured insights.

Analyze the transcript and provide:
1. A concise summary of what was discussed
2. Key conclusions reached
3. Decisions made
4. Action items with owners
5. Follow-up topics
6. Contribution scores for each attendee

Return your analysis as JSON in this format:
{
  "summary": "string",
  "conclusions": ["string"],
  "decisions": ["string"],
  "actionItems": [{"owner": "name", "task": "string", "deadline": "YYYY-MM-DD"}],
  "followUpTopics": ["string"],
  "attendeeContributions": [{"name": "string", "score": number, "keyPoints": ["string"], "speakingTime": number}]
}`,
    userPromptTemplate: `Please analyze this All-Hands meeting transcript.

Transcript:
{transcript}

Attendees: {attendees}
Date: {date}

Provide a detailed analysis including summary, conclusions, decisions, action items, and attendee contributions.`,
    isActive: true
  });

  console.log('Created prompt templates');

  // Create sample tasks for Software Engineers
  console.log('Creating sample tasks...');

  const tasks = [];
  const taskTypes = ['feature', 'bug', 'task', 'improvement'];
  const taskStatuses = ['backlog', 'todo', 'in_progress', 'done'];
  const taskPriorities = ['low', 'medium', 'high', 'urgent'];

  const engineers = [se1, se2, se3, se4, jr1, jr2, sr, qa];

  for (const engineer of engineers) {
    for (let i = 0; i < 10; i++) {
      const status = taskStatuses[Math.floor(Math.random() * taskStatuses.length)];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30) - 5);

      tasks.push({
        title: `Task ${i + 1} for ${engineer.firstName}`,
        description: `Sample task description for ${engineer.role}`,
        assignee: engineer._id,
        reporter: em1._id,
        status,
        priority: taskPriorities[Math.floor(Math.random() * taskPriorities.length)],
        type: taskTypes[Math.floor(Math.random() * taskTypes.length)],
        estimatedHours: Math.floor(Math.random() * 8) + 1,
        dueDate,
        completedAt: status === 'done' ? new Date() : null
      });
    }
  }

  await Task.insertMany(tasks);
  console.log('Created sample tasks');

  // Create attendance records
  console.log('Creating attendance records...');

  const attendanceRecords = [];
  const today = new Date();

  for (const engineer of engineers) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend) continue;

      const hours = 7 + Math.random() * 3; // 7-10 hours
      const checkIn = new Date(date);
      checkIn.setHours(9, Math.floor(Math.random() * 30));

      const checkOut = new Date(checkIn);
      checkOut.setHours(checkIn.getHours() + Math.floor(hours), Math.floor(Math.random() * 60));

      attendanceRecords.push({
        user: engineer._id,
        date,
        status: Math.random() > 0.9 ? 'late' : 'present',
        checkIn,
        checkOut,
        totalHours: Math.round(hours * 100) / 100
      });
    }
  }

  await Attendance.insertMany(attendanceRecords);
  console.log('Created attendance records');

  // Create performance records
  console.log('Creating performance records...');

  const performanceRecords = [];

  for (const engineer of engineers) {
    const weeklyScores = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      weeklyScores.push({
        date,
        score: 65 + Math.floor(Math.random() * 25),
        taskCompletionRate: 0.7 + Math.random() * 0.3,
        deadlineAdherenceRate: 0.8 + Math.random() * 0.2,
        meetingContribution: 0.5 + Math.random() * 0.5,
        workingHours: 0.8 + Math.random() * 0.2,
        hoursLogged: 7 + Math.random() * 3
      });
    }

    const completedTasks = tasks.filter(t =>
      t.assignee.toString() === engineer._id.toString() && t.status === 'done'
    );
    const totalTasks = tasks.filter(t =>
      t.assignee.toString() === engineer._id.toString()
    );

    performanceRecords.push({
      user: engineer._id,
      currentScore: weeklyScores[0].score,
      trend: weeklyScores[0].score > weeklyScores[7].score ? 'improving' : 'neutral',
      weeklyScores,
      taskStats: {
        totalTasks: totalTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: Math.floor(Math.random() * 3),
        completionRate: totalTasks.length > 0 ? completedTasks.length / totalTasks.length : 0
      },
      attendanceStats: {
        avgHoursPerDay: 8 + Math.random() * 0.5,
        attendanceRate: 0.95 + Math.random() * 0.05
      }
    });
  }

  await Performance.insertMany(performanceRecords);
  console.log('Created performance records');

  // Create sample meetings
  console.log('Creating sample meetings...');

  const meetingDomains = ['Sprint Planning', 'Architecture Discussion', '1:1', 'All-Hands'];

  for (let i = 0; i < 3; i++) {
    const attendees = [
      { user: em1._id, attended: true, contributionScore: 7 + Math.random() * 3 },
      { user: tl._id, attended: true, contributionScore: 8 + Math.random() * 2 },
      { user: se1._id, attended: true, contributionScore: 5 + Math.random() * 3 },
      { user: se2._id, attended: Math.random() > 0.3, contributionScore: 4 + Math.random() * 4 },
      { user: sr._id, attended: true, contributionScore: 7 + Math.random() * 3 }
    ];

    const meetingDate = new Date();
    meetingDate.setDate(meetingDate.getDate() - i * 7);

    const meeting = await Meeting.create({
      name: `Sample Meeting ${i + 1}`,
      description: `This is a sample meeting for testing`,
      scheduledDate: meetingDate,
      estimatedDuration: 60,
      actualDuration: 55 + Math.floor(Math.random() * 15),
      domain: meetingDomains[i % meetingDomains.length],
      agenda: 'Discuss project progress and next steps',
      host: em1._id,
      attendees,
      status: 'ready',
      summary: `This was a productive meeting where we discussed various topics related to ${meetingDomains[i % meetingDomains.length]}.`,
      conclusions: ['Decision 1', 'Decision 2'],
      decisions: ['We will proceed with Option A', 'Timeline is approved'],
      actionItems: [
        { owner: se1._id, task: 'Update documentation', deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: 'pending' },
        { owner: tl._id, task: 'Review architecture', deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), status: 'in_progress' }
      ],
      followUpTopics: ['Q3 planning', 'Performance review'],
      transcriptRaw: `Speaker 1: Welcome everyone to our ${meetingDomains[i % meetingDomains.length]} meeting.\nSpeaker 2: Thanks for having me.\nSpeaker 1: Let's start with the agenda...`,
      attendeeContributions: attendees.filter(a => a.attended).map(a => ({
        user: a.user,
        score: a.contributionScore,
        keyPoints: ['Discussed project status', 'Proposed new approach'],
        speakingTime: 300 + Math.floor(Math.random() * 600)
      }))
    });

    // Add to ChromaDB
    try {
      const collection = await chromaClient.getCollection({ name: 'meeting_transcripts' });
      const embedding = await generateEmbedding(meeting.transcriptRaw);

      await collection.add({
        ids: [`${meeting._id}_chunk_0`],
        embeddings: [embedding],
        documents: [meeting.transcriptRaw],
        metadatas: [{
          meetingId: meeting._id.toString(),
          domain: meeting.domain,
          date: meeting.scheduledDate.toISOString(),
          attendees: attendees.map(a => a.user.toString()).join(', ')
        }]
      });
    } catch (e) {
      console.log('Failed to add meeting to ChromaDB:', e.message);
    }
  }

  console.log('Created sample meetings');

  // Create sample recommendations
  console.log('Creating sample recommendations...');

  await Recommendation.create({
    user: se1._id,
    category: 'promote',
    score: 85,
    trend: 'improving',
    reasoning: 'Consistently high performance over the last quarter. Completed 95% of tasks on time and contributed actively in meetings.',
    resignationRiskScore: 0.25,
    status: 'pending',
    actionItems: [
      { action: 'Discuss promotion timeline', priority: 'medium', deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), status: 'pending' }
    ]
  });

  await Recommendation.create({
    user: jr1._id,
    category: 'at_risk',
    score: 55,
    trend: 'declining',
    reasoning: 'Performance has declined over the past month. Missed 3 deadlines and low meeting participation observed.',
    resignationRiskScore: 0.72,
    status: 'pending',
    actionItems: [
      { action: 'Schedule 1:1 to discuss concerns', priority: 'high', deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), status: 'pending' },
      { action: 'Review workload and identify blockers', priority: 'high', deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: 'pending' }
    ]
  });

  console.log('Created sample recommendations');

  // Update user team references
  await User.findByIdAndUpdate(em1._id, {
    team: [tl._id, se1._id, jr1._id, qa._id]
  });

  await User.findByIdAndUpdate(em2._id, {
    team: [se2._id, se3._id, jr2._id]
  });

  await User.findByIdAndUpdate(tl._id, {
    team: [sr._id, se4._id, intern._id]
  });

  console.log('\n✅ Seed completed successfully!');
  console.log('\nTest accounts:');
  console.log('  Admin: admin@orgos.app / Password123!');
  console.log('  CEO: ceo@orgos.app / Password123!');
  console.log('  CTO: cto@orgos.app / Password123!');
  console.log('  VP: vp@orgos.app / Password123!');
  console.log('  Engineering Managers: em1@orgos.app, em2@orgos.app / Password123!');
  console.log('  Software Engineers: se1@orgos.app - se4@orgos.app / Password123!');
  console.log('  Junior Engineers: jr1@orgos.app, jr2@orgos.app / Password123!');
  console.log('  Tech Lead: tl@orgos.app / Password123!');
  console.log('  Senior Engineer: sr@orgos.app / Password123!');
  console.log('  QA Engineer: qa@orgos.app / Password123!');
  console.log('  Intern: intern@orgos.app / Password123!');

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
