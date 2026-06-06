/**
 * ats.js (Express Router)
 * All ATS Checker API routes.
 *
 * Mount this router in your main Express app:
 *   const atsRouter = require("./routes/ats");
 *   app.use("/ats", authMiddleware, selectTenantDB, atsRouter);
 *
 * Full endpoint URLs (assuming mounted at /ats):
 *   POST   /ats/analyze                         - Upload & analyze resume
 *   POST   /ats/generate-updated-resume          - Generate updated resume with kept suggestions
 *   GET    /ats/history/:studentId               - Get student's analysis history
 *   GET    /ats/analysis/:analysisId             - Get full analysis by ID
 *   POST   /ats/feedback                         - Submit feedback
 */

const express = require("express");
const router = express.Router();
const { mandatory,optional } = require("../../../../shared/middleware/auth.middleware");
const { selectTenantDB } = require("../../../../shared/middleware/selectTenantDB.middleware");
const {
  analyzeResume,
  generateUpdatedResume,
  getHistory,
  getAnalysisById,
  submitFeedback,
  analyzeExistingResume,
} = require("../../controllers/atsController");
const {
  uploadResumeSingle,
  validateFilePresence,
} = require("../../middleware/atsFileUpload");

// ── Rate limiting (optional but recommended) ──────────────────────────────
// CONFIGURE: Uncomment and configure if express-rate-limit is available in your project
// const rateLimit = require("express-rate-limit");
// const analyzeLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour window
//   max: 10,                   // 10 analyses per hour per IP
//   message: { success: false, message: "Too many analysis requests. Please try again after an hour." },
//   standardHeaders: true,
//   legacyHeaders: false,
// });
// const feedbackLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000,
//   max: 20,
//   message: { success: false, message: "Too many feedback submissions." },
// });

// ── Routes ────────────────────────────────────────────────────────────────

/**
 * POST /ats/analyze-existing
 * Analyze an already uploaded resume by providing blob name.
 * Body: { blobName: string, studentId: string, jobDescription?: string, resumeId?: string, fileUrl?: string }
 */
router.post("/analyze-existing", optional, selectTenantDB, analyzeExistingResume);

/**
 * POST /ats/generate-updated-resume
 * Generate updated resume applying the student's kept suggestions.
 * Body: { analysisId: string, decisions: { [suggestionId]: "keep" | "abort" } }
 */
router.post("/generate-updated-resume", optional, selectTenantDB, generateUpdatedResume);

/**
 * GET /ats/history/:studentId
 * Get paginated analysis history for a student.
 * Query params: page (default 1), limit (default 20, max 50)
 */
router.get("/history/:studentId", optional, selectTenantDB, getHistory);

/**
 * GET /ats/analysis/:analysisId
 * Get full analysis details by analysis ID.
 */
router.get("/analysis/:analysisId", optional, selectTenantDB, getAnalysisById);

/**
 * POST /ats/feedback
 * Submit structured feedback for the ATS feature.
 * Body: { analysisId, studentId, rating (1-5), selectedOptions, additionalComment }
 */
router.post(
  "/feedback",
  optional,
  selectTenantDB,
  // feedbackLimiter,       // CONFIGURE: Uncomment to enable rate limiting
  submitFeedback
);

module.exports = router;
