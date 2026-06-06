'use strict';

/**
 * ATS Service
 * Handles all ATS (Applicant Tracking System) database operations using MongoDB native driver.
 * This service integrates with the tenant-aware database connection.
 */

const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');

/**
 * Get ATS collections from tenant DB
 */
function getATSCollections(tenantDB) {
  if (!tenantDB) throw new Error('Tenant DB not available');

  console.log('Connected Database:', tenantDB.databaseName);

  return {
    atsAnalyses: tenantDB.collection('ats_analyses'),
    atsFeedback: tenantDB.collection('ats_feedback'),
    resumes: tenantDB.collection('resumes'),
  };
}

/**
 * Analyze resume and save to database
 */
async function analyzeAndSaveResume(tenantDB, {
  studentId,
  analysis,
  extractedText,
  jobDescription,
  fileName,
  fileUrl,
  blobName,
  tokensUsed,
  processingTimeMs,
  aiModel = 'gpt-4o',
}) {
  try {
    const { atsAnalyses } = getATSCollections(tenantDB);

    const analysisId = uuidv4();
    const now = new Date();

    const doc = await atsAnalyses.insertOne({
      analysisId,
      studentId,
      overallScore: analysis.overallScore,
      grade: analysis.grade,
      categoryScores: analysis.categoryScores,
      suggestions: analysis.suggestions,
      strengths: analysis.strengths,
      criticalIssues: analysis.criticalIssues,
      decisions: {},
      jobDescription: jobDescription || '',
      extractedText: extractedText.slice(0, 10000),
      originalFileName: fileName,
      originalFileUrl: fileUrl,
      originalBlobName: blobName,
      updatedResumeUrl: null,
      updatedBlobName: null,
      aiModel,
      tokensUsed,
      processingTimeMs,
      status: 'complete',
      isDeleted: false,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      createdAt: now,
      updatedAt: now,
    });

    return {
      _id: doc.insertedId,
      analysisId,
      studentId,
      overallScore: analysis.overallScore,
      grade: analysis.grade,
      categoryScores: analysis.categoryScores,
      suggestions: analysis.suggestions,
      strengths: analysis.strengths,
      criticalIssues: analysis.criticalIssues,
      originalFileName: fileName,
      originalFileUrl: fileUrl,
      updatedResumeUrl: null,
      createdAt: now,
    };
  } catch (error) {
    console.error('[ATSService.analyzeAndSaveResume] Error:', error);
    throw error;
  }
}

/**
 * Get analysis history for a student (paginated)
 */
async function getAnalysisHistory(tenantDB, studentId, page = 1, limit = 20) {
  try {
    if (!studentId || typeof studentId !== 'string') {
      throw new Error('Invalid studentId');
    }

    const { atsAnalyses } = getATSCollections(tenantDB);
    const skip = (page - 1) * limit;

    // Ensure limit doesn't exceed 50
    const safeLimit = Math.min(50, Math.max(1, limit));
    const safePage = Math.max(1, page);

    const query = {
      studentId,
      isDeleted: { $ne: true },
      status: 'complete',
    };

    const [items, total] = await Promise.all([
      atsAnalyses
        .find(query)
        .project({
          analysisId: 1,
          overallScore: 1,
          grade: 1,
          originalFileName: 1,
          jobDescription: 1,
          createdAt: 1,
          suggestionCount: { $size: '$suggestions' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      atsAnalyses.countDocuments(query),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    };
  } catch (error) {
    console.error('[ATSService.getAnalysisHistory] Error:', error);
    throw error;
  }
}

/**
 * Get full analysis by ID
 */
async function getAnalysisById(tenantDB, analysisId) {
  try {
    if (!analysisId || typeof analysisId !== 'string') {
      throw new Error('Invalid analysisId');
    }

    const { atsAnalyses } = getATSCollections(tenantDB);

    const doc = await atsAnalyses.findOne({
      analysisId,
      isDeleted: { $ne: true },
    });

    if (!doc) {
      throw new Error('Analysis not found');
    }

    return doc;
  } catch (error) {
    console.error('[ATSService.getAnalysisById] Error:', error);
    throw error;
  }
}

/**
 * Update analysis with decisions and updated resume URL
 */
async function updateAnalysisWithDecisions(tenantDB, analysisId, decisions, updatedResumeUrl, updatedBlobName) {
  try {
    const { atsAnalyses } = getATSCollections(tenantDB);

    const keptCount = Object.values(decisions).filter((d) => d === 'keep').length;
    const abortedCount = Object.values(decisions).filter((d) => d === 'abort').length;

    const result = await atsAnalyses.findOneAndUpdate(
      { analysisId, isDeleted: { $ne: true } },
      {
        $set: {
          decisions,
          keptCount,
          abortedCount,
          updatedResumeUrl,
          updatedBlobName,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Analysis not found');
    }

    return result.value;
  } catch (error) {
    console.error('[ATSService.updateAnalysisWithDecisions] Error:', error);
    throw error;
  }
}

/**
 * Save feedback for an analysis
 */
async function saveFeedback(tenantDB, {
  analysisId,
  studentId,
  rating,
  selectedOptions,
  additionalComment,
}) {
  try {
    const { atsFeedback } = getATSCollections(tenantDB);

    const result = await atsFeedback.insertOne({
      feedbackId: uuidv4(),
      analysisId,
      studentId,
      rating,
      selectedOptions,
      additionalComment,
      createdAt: new Date(),
    });

    return {
      _id: result.insertedId,
      feedbackId: result.insertedId.toString(),
    };
  } catch (error) {
    console.error('[ATSService.saveFeedback] Error:', error);
    throw error;
  }
}

/**
 * Save updated resume analysis
 */
async function saveUpdatedResumeAnalysis(tenantDB, {
  analysisId,
  studentId,
  extractedText,
  suggestions,
  tokensUsed,
  processingTimeMs,
  aiModel = 'gpt-4o',
}) {
  try {
    const { atsAnalyses } = getATSCollections(tenantDB);

    const result = await atsAnalyses.findOneAndUpdate(
      { analysisId, isDeleted: { $ne: true } },
      {
        $set: {
          extractedText: extractedText.slice(0, 10000),
          suggestions,
          tokensUsed,
          processingTimeMs,
          aiModel,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Analysis not found');
    }

    return result.value;
  } catch (error) {
    console.error('[ATSService.saveUpdatedResumeAnalysis] Error:', error);
    throw error;
  }
}

module.exports = {
  getATSCollections,
  analyzeAndSaveResume,
  getAnalysisHistory,
  getAnalysisById,
  updateAnalysisWithDecisions,
  saveFeedback,
  saveUpdatedResumeAnalysis,
};
