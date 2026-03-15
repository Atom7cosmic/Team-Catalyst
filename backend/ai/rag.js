const { chromaClient } = require('../config/chroma');
const { generateEmbedding } = require('./embeddings');
const { createRAGChain } = require('./langchain');
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
 * RAG Q&A for meeting transcripts
 * @param {string} question - User's question
 * @param {string} meetingId - Meeting ID to query within
 * @returns {Promise<Object>} - Answer with citations
 */
async function queryMeetingRAG(question, meetingId) {
  try {
    logger.info(`RAG query for meeting ${meetingId}: ${question}`);

    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);

    // Query ChromaDB for relevant chunks
    const collection = await chromaClient.getCollection({ name: 'meeting_transcripts' });

    const results = await collection.query({
      queryEmbeddings: [questionEmbedding],
      nResults: 5,
      where: { meetingId }
    });

    if (!results.documents[0] || results.documents[0].length === 0) {
      return {
        answer: 'I cannot find relevant information in this meeting transcript.',
        sources: []
      };
    }

    // Build context from retrieved chunks
    const context = results.documents[0]
      .map((doc, idx) => {
        const metadata = results.metadatas[0][idx];
        const timestamp = metadata?.timestamp || 'Unknown time';
        const speaker = metadata?.speaker || 'Unknown speaker';
        return `[${timestamp}] ${speaker}: ${doc}`;
      })
      .join('\n\n');

    // Create and run RAG chain
    const chain = await createRAGChain();
    const answer = await chain.invoke({ context, question });

    // Build source citations
    const sources = results.documents[0].map((doc, idx) => ({
      text: doc,
      metadata: results.metadatas[0][idx],
      relevanceScore: results.distances ? 1 - results.distances[0][idx] : 0.5
    }));

    return {
      answer,
      sources
    };
  } catch (error) {
    logger.error(`Error in RAG meeting QA: ${error.message}`);
    return {
      answer: 'Sorry, I encountered an error while processing your question.',
      sources: [],
      error: error.message
    };
  }
}

/**
 * Query employee performance for similar trajectories
 * @param {string} userId - User ID
 * @param {Object} currentState - Current employee state
 * @returns {Promise<Array>} - Similar employees
 */
async function queryEmployeeRAG(userId, currentState) {
  try {
    logger.info(`Finding similar employees for user ${userId}`);

    const embedding = await generateEmbedding(currentState.summary);

    const collection = await chromaClient.getCollection({ name: 'employee_performance' });

    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: 5,
      where: {
        $and: [
          { userId: { $ne: userId } }
        ]
      }
    });

    if (!results.documents[0]) {
      return [];
    }

    return results.documents[0].map((doc, idx) => ({
      summary: doc,
      metadata: results.metadatas[0][idx],
      similarity: results.distances ? 1 - results.distances[0][idx] : 0.5
    }));
  } catch (error) {
    logger.error(`Error finding similar employees: ${error.message}`);
    return [];
  }
}

/**
 * Generic RAG query against a collection
 * @param {string} collectionName - ChromaDB collection name
 * @param {string} query - Query text
 * @param {Object} filters - Optional filters
 * @param {number} nResults - Number of results
 * @returns {Promise<Object>} - Query results
 */
async function queryCollection(collectionName, query, filters = {}, nResults = 5) {
  try {
    const embedding = await generateEmbedding(query);
    const collection = await chromaClient.getCollection({ name: collectionName });

    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults,
      where: filters
    });

    return {
      documents: results.documents[0] || [],
      metadatas: results.metadatas[0] || [],
      distances: results.distances ? results.distances[0] : [],
      ids: results.ids ? results.ids[0] : []
    };
  } catch (error) {
    logger.error(`Error querying collection ${collectionName}: ${error.message}`);
    throw error;
  }
}

/**
 * Add documents to a collection
 * @param {string} collectionName - ChromaDB collection name
 * @param {Array} documents - Array of documents
 * @param {Array} metadatas - Array of metadata objects
 * @param {Array} ids - Array of document IDs
 * @returns {Promise<void>}
 */
async function addToCollection(collectionName, documents, metadatas, ids) {
  try {
    const embeddings = [];
    for (const doc of documents) {
      const embedding = await generateEmbedding(doc);
      embeddings.push(embedding);
    }

    const collection = await chromaClient.getCollection({ name: collectionName });
    await collection.add({
      ids,
      embeddings,
      documents,
      metadatas
    });

    logger.info(`Added ${documents.length} documents to ${collectionName}`);
  } catch (error) {
    logger.error(`Error adding to collection ${collectionName}: ${error.message}`);
    throw error;
  }
}

/**
 * Find similar meetings based on content
 * @param {string} meetingId - Meeting to find similar to
 * @param {number} limit - Number of similar meetings
 * @returns {Promise<Array>} - Similar meetings
 */
async function findSimilarMeetingsRAG(meetingId, limit = 3) {
  try {
    const collection = await chromaClient.getCollection({ name: 'meeting_transcripts' });

    // Get chunks from this meeting
    const meetingChunks = await collection.get({
      where: { meetingId }
    });

    if (!meetingChunks.documents || meetingChunks.documents.length === 0) {
      return [];
    }

    // Combine chunks for summary
    const combinedText = meetingChunks.documents.join(' ');

    // Generate embedding for combined text
    const queryEmbedding = await generateEmbedding(combinedText.substring(0, 3000));

    // Query for similar content excluding this meeting
    const similar = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit + 10,
      where: { meetingId: { $ne: meetingId } }
    });

    // Group by meeting and calculate similarity
    const meetingScores = {};

    similar.documents[0].forEach((doc, idx) => {
      const meta = similar.metadatas[0][idx];
      const dist = similar.distances[0][idx];
      const otherMeetingId = meta.meetingId;

      if (!meetingScores[otherMeetingId]) {
        meetingScores[otherMeetingId] = {
          meetingId: otherMeetingId,
          domain: meta.domain,
          date: meta.date,
          score: 0,
          chunks: 0
        };
      }

      const similarity = 1 - (dist / 2);
      meetingScores[otherMeetingId].score += similarity;
      meetingScores[otherMeetingId].chunks += 1;
    });

    // Average scores and sort
    const results = Object.values(meetingScores)
      .map(m => ({
        ...m,
        similarity: (m.score / m.chunks).toFixed(3)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  } catch (error) {
    logger.error(`Find similar meetings error: ${error.message}`);
    return [];
  }
}

module.exports = {
  queryMeetingRAG,
  queryEmployeeRAG,
  queryCollection,
  addToCollection,
  findSimilarMeetingsRAG
};