const { Worker } = require('bullmq');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { promisify } = require('util');
const { Meeting, PromptTemplate, Performance, Notification } = require('../models');
const { chromaClient } = require('../config/chroma');
const { generateEmbedding } = require('../ai/embeddings');
const { meetingAnalysisChain, chunkTranscript, scoreAttendeeChain } = require('../ai/langchain');
const { getFileUrl } = require('../config/s3');
const winston = require('winston');

const execAsync = promisify(exec);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Update processing step
async function updateStep(meetingId, step, status, message = null, io = null) {
  const meeting = await Meeting.findById(meetingId);
  if (meeting) {
    const stepObj = meeting.processingSteps.find(s => s.step === step);
    if (stepObj) {
      stepObj.status = status;
      stepObj.timestamp = new Date();
      if (message) stepObj.message = message;
    }
    await meeting.save();

    // Emit via socket if available
    if (io) {
      io.to(meetingId).emit('processing-update', {
        step,
        status,
        message
      });
    }
  }
}

// Download audio from S3
async function downloadAudio(audioKey) {
  const url = await getFileUrl(audioKey, 3600);
  const tempDir = path.join(__dirname, '../../temp');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const localPath = path.join(tempDir, `${Date.now()}-${path.basename(audioKey)}`);

  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(localPath, Buffer.from(buffer));

  return localPath;
}

// Get audio duration using ffprobe
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

// Split audio into chunks
async function splitAudio(filePath, chunkDuration = 600) { // 10 minutes
  const outputDir = path.join(__dirname, '../../temp/chunks');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseName = path.basename(filePath, path.extname(filePath));
  const outputPattern = path.join(outputDir, `${baseName}_chunk_%03d.wav`);

  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .output(outputPattern)
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .outputOptions([
        `-f segment`,
        `-segment_time ${chunkDuration}`,
        `-reset_timestamps 1`
      ])
      .on('end', () => {
        // Get list of chunk files
        const chunks = fs.readdirSync(outputDir)
          .filter(f => f.startsWith(`${baseName}_chunk_`))
          .map(f => path.join(outputDir, f))
          .sort();
        resolve(chunks);
      })
      .on('error', reject)
      .run();
  });
}

// Transcribe audio using whisper.cpp
async function transcribeWithWhisper(audioPath, modelPath) {
  const outputPath = audioPath.replace(/\.[^/.]+$/, '');
  const whisperBinary = path.join(__dirname, '../models/whisper/main');
  const whisperModel = path.join(__dirname, '../models/whisper/ggml-base.bin');
  const whisperCmd = `${whisperBinary} -m ${whisperModel} -f ${audioPath} -otxt -of ${outputPath} --language auto`;


  try {
    await execAsync(whisperCmd, { timeout: 300000 }); // 5 minute timeout

    const transcriptPath = `${outputPath}.txt`;
    if (fs.existsSync(transcriptPath)) {
      return fs.readFileSync(transcriptPath, 'utf8');
    }

    return '';
  } catch (error) {
    logger.error(`Whisper transcription error: ${error.message}`);
    throw error;
  }
}

// Basic speaker diarization using silence detection
async function performDiarization(audioPath, numSpeakers) {
  return new Promise((resolve, reject) => {
    const segments = [];
    let currentSpeaker = 0;
    let lastEndTime = 0;

    ffmpeg(audioPath)
      .audioFilters([
        'silencedetect=noise=-30dB:d=0.5',
        'volumedetect'
      ])
      .outputOptions('-f null')
      .output('-')
      .on('stderr', (stderrLine) => {
        const line = stderrLine.toString();

        // Parse silence detection
        const silenceStart = line.match(/silence_start: ([\d.]+)/);
        const silenceEnd = line.match(/silence_end: ([\d.]+)/);

        if (silenceStart) {
          const startTime = lastEndTime;
          const endTime = parseFloat(silenceStart[1]);

          segments.push({
            speaker: `Speaker_${currentSpeaker + 1}`,
            start: startTime,
            end: endTime
          });

          lastEndTime = endTime;
          currentSpeaker = (currentSpeaker + 1) % numSpeakers;
        }
      })
      .on('end', () => {
        resolve(segments);
      })
      .on('error', reject)
      .run();
  });
}

// Process meeting
async function processMeeting(job) {
  const { meetingId, audioKey } = job.data;
  const io = global.io;

  logger.info(`Starting processing for meeting ${meetingId}`);

  try {
    const meeting = await Meeting.findById(meetingId)
      .populate('attendees.user', 'firstName lastName');

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Step 1: Download audio
    await updateStep(meetingId, 'upload', 'done', 'Audio downloaded', io);

    // Step 2: Transcription
    await updateStep(meetingId, 'transcription', 'running', 'Starting transcription', io);

    const localAudioPath = await downloadAudio(audioKey);
    const duration = await getAudioDuration(localAudioPath);
    meeting.actualDuration = Math.round(duration / 60);

    let transcript = '';
    let segments = [];

    if (duration > 600) { // > 10 minutes, split into chunks
      const chunks = await splitAudio(localAudioPath);
      let timeOffset = 0;

      for (const chunk of chunks) {
        const chunkTranscript = await transcribeWithWhisper(
          chunk,
          process.env.WHISPER_MODEL_PATH || './models/whisper'
        );

        // Add time offset to transcript
        const lines = chunkTranscript.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            transcript += `[${formatTime(timeOffset)}] ${line}\n`;
          }
        }

        timeOffset += 600;

        // Clean up chunk
        fs.unlinkSync(chunk);
      }
    } else {
      transcript = await transcribeWithWhisper(
        localAudioPath,
        process.env.WHISPER_MODEL_PATH || './models/whisper'
      );
    }

    meeting.transcriptRaw = transcript;
    await updateStep(meetingId, 'transcription', 'done', 'Transcription complete', io);

    // Step 3: Diarization
    await updateStep(meetingId, 'diarization', 'running', 'Detecting speakers', io);

    const numSpeakers = meeting.attendees.length;
    const diarizationSegments = await performDiarization(localAudioPath, numSpeakers);

    // Map speakers to attendees (simplified - assumes speaking order)
    const speakerMap = {};
    meeting.attendees.forEach((attendee, idx) => {
      speakerMap[`Speaker_${idx + 1}`] = attendee.user.fullName;
    });

    // Create transcript segments
    segments = diarizationSegments.map(seg => ({
      speaker: speakerMap[seg.speaker] || 'Unknown Speaker',
      startTime: seg.start,
      endTime: seg.end,
      text: '' // Would need to align with transcript
    }));

    meeting.transcriptSegments = segments;
    await updateStep(meetingId, 'diarization', 'done', 'Speaker detection complete', io);

    // Step 4: Analysis
    await updateStep(meetingId, 'analysis', 'running', 'Analyzing meeting content', io);

    // Get prompt template for domain
    const promptTemplate = await PromptTemplate.findOne({
      domain: meeting.domain,
      isActive: true
    });

    if (!promptTemplate) {
      throw new Error(`No prompt template found for domain: ${meeting.domain}`);
    }

    // Run analysis
    const analysis = await meetingAnalysisChain(
      transcript,
      meeting.domain,
      meeting.attendees.map(a => a.user),
      promptTemplate
    );

    meeting.summary = analysis.summary;
    meeting.conclusions = analysis.conclusions || [];
    meeting.decisions = analysis.decisions || [];
    meeting.actionItems = (analysis.actionItems || []).map(item => ({
      owner: meeting.attendees.find(a =>
        a.user.fullName.toLowerCase().includes(item.owner?.toLowerCase())
      )?.user?._id || meeting.host,
      task: item.task,
      deadline: item.deadline ? new Date(item.deadline) : null,
      status: 'pending'
    }));
    meeting.followUpTopics = analysis.followUpTopics || [];

    // Score attendee contributions
    for (const attendee of meeting.attendees) {
      const contribution = await scoreAttendeeChain(
        attendee.user.fullName,
        transcript,
        meeting.domain
      );

      attendee.contributionScore = contribution.score;
      attendee.keyPoints = contribution.keyPoints || [];

      meeting.attendeeContributions.push({
        user: attendee.user._id,
        score: contribution.score,
        keyPoints: contribution.keyPoints || [],
        speakingTime: 0 // Would calculate from diarization
      });
    }

    await updateStep(meetingId, 'analysis', 'done', 'Analysis complete', io);

    // Step 5: Embedding and storage
    await updateStep(meetingId, 'embedding', 'running', 'Storing embeddings', io);

    // Chunk transcript
    const chunks = chunkTranscript(transcript, 300);
    const collection = await chromaClient.getCollection({ name: 'meeting_transcripts' });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);

      await collection.add({
        ids: [`${meetingId}_chunk_${i}`],
        embeddings: [embedding],
        documents: [chunk],
        metadatas: [{
          meetingId: meetingId.toString(),
          domain: meeting.domain,
          date: meeting.scheduledDate.toISOString(),
          attendees: meeting.attendees.map(a => a.user.fullName).join(', '),
          chunkIndex: i
        }]
      });
    }

    await updateStep(meetingId, 'embedding', 'done', 'Embeddings stored', io);

    // Step 6: Update performance for attendees
    for (const attendee of meeting.attendees) {
      const performance = await Performance.findOne({ user: attendee.user._id });
      if (performance) {
        performance.meetingStats.totalMeetings += 1;

        const totalScore = performance.meetingStats.avgContributionScore *
          (performance.meetingStats.totalMeetings - 1) +
          (attendee.contributionScore || 5);
        performance.meetingStats.avgContributionScore =
          totalScore / performance.meetingStats.totalMeetings;

        await performance.save();
      }
    }

    // Mark as ready
    meeting.status = 'ready';
    await updateStep(meetingId, 'ready', 'done', 'Meeting processing complete', io);
    await meeting.save();

    // Create notifications
    await Notification.create({
      user: meeting.host,
      type: 'meeting_ready',
      title: 'Meeting analysis ready',
      message: `"${meeting.name}" has been processed and is ready for review`,
      link: `/meetings/${meeting._id}`,
      entityType: 'meeting',
      entityId: meeting._id
    });

    // Cleanup
    fs.unlinkSync(localAudioPath);

    logger.info(`Meeting ${meetingId} processing complete`);

  } catch (error) {
    logger.error(`Processing error for meeting ${meetingId}: ${error.message}`);

    await Meeting.findByIdAndUpdate(meetingId, {
      status: 'completed',
      processingError: error.message,
      $set: { 'processingSteps.$[elem].status': 'failed' }
    }, {
      arrayFilters: [{ 'elem.status': 'running' }]
    });

    throw error;
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Create worker
const worker = new Worker('meeting-processing', processMeeting, {
  connection: {
    url: process.env.REDIS_URL
  },
  concurrency: 2
});

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed: ${err.message}`);
});

module.exports = worker;
