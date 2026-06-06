const { ObjectId } = require("mongodb");
const {
  skillsCollection,
  questions: questionsCollection,
  practiceCollection,
} = require("../../../shared/db/connection").getGlobalCollections();
const { archiveAndDeleteOne } = require("../../../shared/utils/archive.service");

// Skills Controllers
module.exports.addSkills = async (req, res) => {
  try {
    const { title, type = "", level = "" } = req.body;

    if (!title) {
      return res.status(400).json({ err: "title required" });
    }

    const skill = {
      ...req.body,
      type: "skill",
      //   level: level || 1,
      createdAt: new Date(),
      createdBy: req.userID,
    };

    const result = await skillsCollection.insertOne(skill);
    res.status(201).json({
      message: "Skill added successfully",
      skillId: result.insertedId,
    });
  } catch (error) {
    console.error("Error in addSkills:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.getSkills = async (req, res) => {
  try {
    const { title = "", createdBy = "" } = req.query;

    let filter = { type: "skill" };
    if (title) filter.title = title;
    if (createdBy) filter.createdBy = createdBy;

    const skills = await skillsCollection.find(filter).toArray();
    res.status(200).json({ skills });
  } catch (error) {
    console.error("Error in getSkills:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.getOneSkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    const skill = await skillsCollection.findOne({
      _id: new ObjectId(skillId),
    });

    if (!skill) throw new Error("Please select valid skill");
    res.status(200).json({ data: skill });
  } catch (error) {
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.updateSkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    if (!ObjectId.isValid(skillId)) {
      return res.status(400).json({ err: "Invalid skill ID format" });
    }

    const updateData = { ...req.body, updatedAt: new Date() };

    const result = await skillsCollection.updateOne(
      { _id: new ObjectId(skillId), createdBy: req.userID },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ err: "Skill not found or unauthorized" });
    }

    res.status(200).json({ message: "Skill updated successfully" });
  } catch (error) {
    console.error("Error in updateSkill:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.deleteSkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    if (!ObjectId.isValid(skillId)) {
      return res.status(400).json({ err: "Invalid skill ID format" });
    }

    const result = await archiveAndDeleteOne(skillsCollection, { _id: new ObjectId(skillId) }, {
      deletedBy: req.userID || null,
      reason: req.body.reason || null,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ err: "Skill not found or unauthorized" });
    }

    res.status(200).json({ message: "Skill deleted successfully" });
  } catch (error) {
    console.error("Error in deleteskill:", error);
    res.status(500).json({ err: "internal server error" });
  }
};
// Practice Controllers
module.exports.addPractice = async (req, res) => {
  try {
    const { name, category, subcategory, type, parentId, level, difficulty } =
      req.body;

    if (!name || !category || !subcategory) {
      return res
        .status(400)
        .json({ err: "name, category, and subcategory are required" });
    }

    const practice = {
      name,
      category,
      subcategory,
      type: "practice",
      parentId: parentId || null,
      level: level || 1,
      difficulty: difficulty || "beginner",
      createdAt: new Date(),
      createdBy: req.userID,
    };

    const result = await practiceCollection.insertOne(practice);
    res.status(201).json({
      message: "Practice added successfully",
      practiceId: result.insertedId,
    });
  } catch (error) {
    console.error("Error in addPractice:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.getPractice = async (req, res) => {
  try {
    const { category, subcategory, difficulty, parentId, createdBy } =
      req.query;

    let filter = { type: "practice" };
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (difficulty) filter.difficulty = difficulty;
    if (parentId) filter.parentId = parentId;
    if (createdBy) filter.createdBy = createdBy;

    const practices = await practiceCollection.find(filter).toArray();
    res.status(200).json({ practices });
  } catch (error) {
    console.error("Error in getPractice:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.updatePractice = async (req, res) => {
  try {
    const { practiceId } = req.params;

    if (!ObjectId.isValid(practiceId)) {
      return res.status(400).json({ err: "Invalid practice ID format" });
    }

    const updateData = { ...req.body, updatedAt: new Date() };

    const result = await practiceCollection.updateOne(
      { _id: new ObjectId(practiceId), createdBy: req.userID },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ err: "Practice not found or unauthorized" });
    }

    res.status(200).json({ message: "Practice updated successfully" });
  } catch (error) {
    console.error("Error in updatePractice:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

// Questions Controllers
module.exports.addQuestions = async (req, res) => {
  try {
    const {
      questionContent = "",
      answer = {},
      skillId = "",
      type = "",
      practiceId = "",
    } = req.body;

    if (!questionContent || !answer) {
      return res.status(400).json({ err: "question and answer are required" });
    }

    if (type === "skill" && skillId && !ObjectId.isValid(skillId)) {
      return res.status(400).json({ err: "Invalid skill ID format" });
    }
    if (type === "practice" && practiceId && !ObjectId.isValid(practiceId)) {
      return res.status(400).json({ err: "Invalid practice ID format" });
    }

    const questionDoc = {
      ...req.body,
      createdAt: new Date(),
      createdBy: req.userID,
    };

    const result = await questionsCollection.insertOne(questionDoc);
    res.status(201).json({
      message: "Question added successfully",
      questionId: result.insertedId,
    });
  } catch (error) {
    console.error("Error in addQuestions:", error);
    res.status(500).json({ err: error.message });
  }
};

module.exports.getQuestions = async (req, res) => {
  try {
    const {
      difficulty,
      tags,
      createdBy,
      limit = 20,
      page = 1,
      type,
      refId,
    } = req.query;

    let filter = {};
    if (difficulty) filter.difficulty = difficulty;
    if (tags) filter.tags = { $in: tags.split(",") };
    if (createdBy) filter.createdBy = createdBy;
    if (type) filter.type = type;
    if (refId) filter.refId = refId;

    const skip = (page - 1) * limit;
    const questions = await questionsCollection
      .find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await questionsCollection.countDocuments(filter);

    res.status(200).json({
      questions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getQuestions:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.getSingleQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const findQuestion = await questionsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!findQuestion) throw new Error("Question not found");

    res.status(200).json({ data: findQuestion });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
};

module.exports.getSkillQuestions = async (req, res) => {
  try {
    const { skillId } = req.params;
    const { difficulty, limit = 10, createdBy } = req.query;

    if (!ObjectId.isValid(skillId)) {
      return res.status(400).json({ err: "Invalid skill ID format" });
    }

    let filter = { skillId: skillId };
    if (difficulty) filter.difficulty = difficulty;
    if (createdBy) filter.createdBy = createdBy;

    const questions = await questionsCollection
      .find(filter)
      .limit(parseInt(limit))
      .toArray();

    if (questions.length < limit) {
      const skill = await skillsCollection.findOne({
        _id: new ObjectId(skillId),
        type: "skill",
      });
      if (skill) {
        const additionalFilter = {
          category: skill.category,
          subcategory: skill.subcategory,
          skillId: { $ne: skillId },
        };

        if (difficulty) additionalFilter.difficulty = difficulty;
        if (createdBy) additionalFilter.createdBy = createdBy;

        const additionalQuestions = await questionsCollection
          .find(additionalFilter)
          .limit(parseInt(limit) - questions.length)
          .toArray();

        questions.push(...additionalQuestions);
      }
    }

    res.status(200).json({ questions, skillId });
  } catch (error) {
    console.error("Error in getSkillQuestions:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.getPracticeQuestion = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { difficulty, limit = 10, createdBy } = req.query;

    if (!ObjectId.isValid(practiceId)) {
      return res.status(400).json({ err: "Invalid practice ID format" });
    }

    let filter = { practiceId: practiceId };
    if (difficulty) filter.difficulty = difficulty;
    if (createdBy) filter.createdBy = createdBy;

    const questions = await questionsCollection
      .find(filter)
      .limit(parseInt(limit))
      .toArray();

    if (questions.length < limit) {
      const practice = await practiceCollection.findOne({
        _id: new ObjectId(practiceId),
        type: "practice",
      });
      if (practice) {
        const additionalFilter = {
          category: practice.category,
          subcategory: practice.subcategory,
          practiceId: { $ne: practiceId },
        };

        if (difficulty) additionalFilter.difficulty = difficulty;
        if (createdBy) additionalFilter.createdBy = createdBy;

        const additionalQuestions = await questionsCollection
          .find(additionalFilter)
          .limit(parseInt(limit) - questions.length)
          .toArray();

        questions.push(...additionalQuestions);
      }
    }

    res.status(200).json({ questions, practiceId });
  } catch (error) {
    console.error("Error in getPracticeQuestion:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!ObjectId.isValid(questionId)) {
      return res.status(400).json({ err: "Invalid question ID format" });
    }

    const updateData = { ...req.body, updatedAt: new Date() };

    const result = await questionsCollection.updateOne(
      { _id: new ObjectId(questionId), createdBy: req.userID },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ err: "Question not found or unauthorized" });
    }

    res.status(200).json({ message: "Question updated successfully" });
  } catch (error) {
    console.error("Error in updateQuestion:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!ObjectId.isValid(questionId)) {
      return res.status(400).json({ err: "Invalid question ID format" });
    }

    const result = await archiveAndDeleteOne(questionsCollection, { _id: new ObjectId(questionId), createdBy: req.userID }, {
      deletedBy: req.userID || null,
      reason: req.body.reason || null,
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ err: "Question not found or unauthorized" });
    }

    res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error in deleteQuestion:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

// Hierarchical Display Controllers
module.exports.getCategories = async (req, res) => {
  try {
    const { createdBy } = req.query;

    let skillFilter = { type: "skill" };
    let practiceFilter = { type: "practice" };

    if (createdBy) {
      skillFilter.createdBy = createdBy;
      practiceFilter.createdBy = createdBy;
    }

    const skillCategories = await skillsCollection.distinct(
      "category",
      skillFilter
    );
    const practiceCategories = await practiceCollection.distinct(
      "category",
      practiceFilter
    );

    const categories = [
      ...new Set([...skillCategories, ...practiceCategories]),
    ];

    res.status(200).json({ categories });
  } catch (error) {
    console.error("Error in getCategories:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.getSubcategories = async (req, res) => {
  try {
    const { category } = req.params;
    const { createdBy } = req.query;

    let skillFilter = { category: category, type: "skill" };
    let practiceFilter = { category: category, type: "practice" };

    if (createdBy) {
      skillFilter.createdBy = createdBy;
      practiceFilter.createdBy = createdBy;
    }

    const skillSubcategories = await skillsCollection.distinct(
      "subcategory",
      skillFilter
    );
    const practiceSubcategories = await practiceCollection.distinct(
      "subcategory",
      practiceFilter
    );

    const subcategories = [
      ...new Set([...skillSubcategories, ...practiceSubcategories]),
    ];

    res.status(200).json({ subcategories, category });
  } catch (error) {
    console.error("Error in getSubcategories:", error);
    res.status(500).json({ err: "internal server error" });
  }
};

module.exports.getItemsBySubcategory = async (req, res) => {
  try {
    const { category, subcategory } = req.params;
    const { type, createdBy } = req.query;

    let baseFilter = {
      category: category,
      subcategory: subcategory,
    };

    if (createdBy) baseFilter.createdBy = createdBy;

    let items = [];

    if (type === "skill" || type === "both" || !type) {
      const skillFilter = { ...baseFilter, type: "skill" };
      const skills = await skillsCollection.find(skillFilter).toArray();
      items.push(...skills);
    }

    if (type === "practice" || type === "both" || !type) {
      const practiceFilter = { ...baseFilter, type: "practice" };
      const practices = await practiceCollection.find(practiceFilter).toArray();
      items.push(...practices);
    }

    res.status(200).json({
      items,
      category,
      subcategory,
      type: type || "both",
    });
  } catch (error) {
    console.error("Error in getItemsBySubcategory:", error);
    res.status(500).json({ err: "internal server error" });
  }
};
