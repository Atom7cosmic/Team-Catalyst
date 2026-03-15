const { ChromaClient } = require('chromadb');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const chromaHost = process.env.CHROMA_HOST || 'localhost';
const chromaPort = process.env.CHROMA_PORT || 8000;

const chromaClient = new ChromaClient({
  path: `http://${chromaHost}:${chromaPort}`
});

const initializeCollections = async () => {
  try {
    // Meeting transcripts collection
    try {
      await chromaClient.getCollection({ name: 'meeting_transcripts' });
      logger.info('Meeting transcripts collection already exists');
    } catch {
      await chromaClient.createCollection({
        name: 'meeting_transcripts',
        metadata: { description: 'Meeting transcript chunks for RAG' }
      });
      logger.info('Created meeting_transcripts collection');
    }

    // Employee performance collection
    try {
      await chromaClient.getCollection({ name: 'employee_performance' });
      logger.info('Employee performance collection already exists');
    } catch {
      await chromaClient.createCollection({
        name: 'employee_performance',
        metadata: { description: 'Employee performance summaries for analysis' }
      });
      logger.info('Created employee_performance collection');
    }

    logger.info('ChromaDB collections initialized');
  } catch (error) {
    logger.error(`Error initializing ChromaDB collections: ${error.message}`);
    // Don't throw - allow app to start without ChromaDB
  }
};

module.exports = {
  chromaClient,
  initializeCollections
};
