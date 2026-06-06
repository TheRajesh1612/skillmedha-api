require("dotenv").config({
  path: "../../.env",
});
const express = require("express");
const { questions } = require("../../../shared/db/connection").getGlobalCollections();
const {
  convertToMId,
  getAllQuestionsData,
  deleteQuestionsByIds,
} = require("./questionsReusable.service");
const cors = require("cors");
const { ObjectId } = require("mongodb");
const { mandatory: authenticate } = require("../../../shared/middleware/auth.middleware");
const { selectTenantDB } = require("../../../shared/middleware/selectTenantDB.middleware");
const mongoDB = require("mongodb");
const port = 2010;

const app = express.Router();


app.use(authenticate);
app.use(selectTenantDB);

// app.post("/allQuestions", async (req, res) => {
//   try {
//     const { pageNo = 1, limit = 10 } = req.query;
//     const { difficulty, skills, tags, questionType, type } = req.body;

//     // Convert pageNo to skip value for database
//     const skip = (pageNo - 1) * limit;

//     // Build filter object based on provided filters
//     const filters = {};

//     if (difficulty) {
//       filters.difficulty = difficulty;
//     }

//     if (skills && Array.isArray(skills) && skills.length > 0) {
//       filters.skills = { $in: skills };
//     }

//     if (tags && Array.isArray(tags) && tags.length > 0) {
//       filters.tags = { $in: tags };
//     }

//     if (questionType) {
//       filters.questionType = questionType;
//     }
//     if (req.orgId) {
//       filters.createdOrg = orgId;
//     }
//     if (type) {
//       filters.type = type;
//     }

//     // Get total count of questions matching filters
//     const totalQuestions = await questions.countDocuments(filters);

//     // Get paginated questions with filters
//     const questionData = await questions
//       .find(filters)
//       .skip(skip)
//       .limit(parseInt(limit))
//       .toArray();

//     // Calculate pagination metadata
//     const totalPages = Math.ceil(totalQuestions / limit);
//     const hasNextPage = pageNo < totalPages;
//     const hasPrevPage = pageNo > 1;

//     res.status(200).json({
//       data: questionData,
//       pagination: {
//         currentPage: parseInt(pageNo),
//         totalPages,
//         totalQuestions,
//         limit: parseInt(limit),
//         hasNextPage,
//         hasPrevPage,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ err: error.message });
//   }
// });

app.post("/allQuestions", async (req, res) => {
  try {
    // Parse pagination inputs
    const page = parseInt(req.query.pageNo, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { difficulty, skills, tags, questionType, type } = req.body;

    // Base filters
    const baseFilters = {};
    if (difficulty) baseFilters.difficulty = difficulty;
    if (Array.isArray(skills) && skills.length > 0)
      baseFilters.skills = { $in: skills };
    if (Array.isArray(tags) && tags.length > 0)
      baseFilters.tags = { $in: tags };
    if (questionType) baseFilters.questionType = questionType;
    if (type) baseFilters.type = type;

    // Organization visibility filter:
    // include global (missing or null) + org-specific when orgId present
    const orgClauses = [
      { createdOrg: { $exists: false } },
      { createdOrg: null },
    ];

    let createdOrgMatch = null;
    if (req.orgId) {
      // Convert to ObjectId if the collection stores ObjectIds
      try {
        const { ObjectId } = require("mongodb");
        createdOrgMatch = ObjectId.isValid(req.orgId)
          ? new ObjectId(req.orgId)
          : req.orgId;
        orgClauses.push({ createdOrg: createdOrgMatch });
      } catch (_) {
        orgClauses.push({ createdOrg: req.orgId });
      }
    }

    const finalFilter = { $and: [baseFilters, { $or: orgClauses }] };

    // Total count and data with the same filter
    const totalQuestions = await questions.countDocuments(finalFilter);
    const questionData = await questions
      .find(finalFilter)
      .skip(skip)
      .limit(limit)
      .toArray();

    // Pagination metadata
    const totalPages = Math.ceil(totalQuestions / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      data: questionData,
      pagination: {
        currentPage: page,
        totalPages,
        totalQuestions,
        limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
});

app.post("/addQuestion", async (req, res) => {
  try {
    const {
      questionContent,
      answer,
      questionType,
      resources = {},
      tags = [],
      difficulty,
      type,
      scoreSettings,
    } = req.body;

    // Validate required fields
    if (
      !questionContent ||
      !questionContent.question ||
      !answer ||
      !questionType ||
      !difficulty ||
      !type ||
      !scoreSettings
    ) {
      return res.status(400).json({
        err: "Missing required fields: questionContent (with question), answer, questionType, difficulty, type, createdBy",
      });
    }

    // Additional validation for questionContent structure
    if (!questionContent.question) {
      return res.status(400).json({
        err: "questionContent must include a 'question' field",
      });
    }

    const newQuestion = {
      questionContent,
      answer,
      questionType,
      resources,
      tags,
      difficulty,
      type,
      scoreSettings,
      createdAt: new Date(),
      createdBy: req.userID || null,
      createdOrg: req.orgId || null,
    };

    const result = await questions.insertOne(newQuestion);

    res.status(201).json({
      message: "Question added successfully",
      data: {
        _id: result.insertedId,
        ...newQuestion,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        err: "Question with identical content and options already exists. Please provide unique question content.",
      });
    }

    res.status(500).json({ err: error.message });
  }
});

app.post("/deleteQuestion", async (req, res) => {
  try {
    const { questionIds } = req.body;

    const result = await deleteQuestionsByIds(
      { questionIds: questionIds },
      req.tenantDB
    );

    res.status(200).json({
      msg: "Questions deleted successfully",
      ...result,
    });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
});

module.exports.questionsRouter = app;
module.exports = app;
