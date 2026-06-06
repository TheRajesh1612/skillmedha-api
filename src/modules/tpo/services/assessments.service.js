require("dotenv").config({
  path: "../../.env",
});
const express = require("express");
const { json, urlencoded } = require("express");
const cors = require("cors");
// const { assessment } = require("../../../shared/db/connection").getGlobalCollections();
const {
  convertToMId,
  successRes,
  errorRes,
} = require("../../../shared/utils/helpers");
const { ObjectId } = require("mongodb");
const nodemailer = require("nodemailer");
const { mandatory: authenticate } = require("../../../shared/middleware/auth.middleware");
const { selectTenantDB } = require("../../../shared/middleware/selectTenantDB.middleware");
const { connectTodb } = require("../../../shared/db/connection");
const { getTenantDB } = require("../../../shared/db/connection");
const mongoDB = require("mongodb");

const app = express();

app.use(cors());

app.use(authenticate);
app.use(selectTenantDB);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.support_mail,
    pass: process.env.support_pass,
  },
});

app.use(json(), urlencoded({ extended: false }));

// app.get("/getAllAssessments", );

// app.post("/createAssessment",);

// app.post("/updateAssessment", );

// app.post("/deleteAssessment",);

// app.get("/getOneAssessment/:id",);

// app.post("/sendInvitations/:assessmentId",);

// app.listen(port, () =>
//   console.log(`assessment server running on port ${port}`)
// );

module.exports.getAllAssessments = async (req, res) => {
  const { assessment } = connectTodb(req.tenantDB);
  if (!req.tenantDB)
    return res.status(500).json({ error: "No tenant DB available" });
  try {
    const { limit = 20, cursor = null } = req.query;
    const total = await assessment.countDocuments();

    const matchStage =
      cursor !== "null"
        ? { $match: { _id: { $gt: new ObjectId(cursor) } } }
        : { $match: {} };

    const pipeline = [
      matchStage,
      { $sort: { _id: 1 } },
      { $limit: parseInt(limit, 10) + 1 },
    ];

    const docs = await assessment.aggregate(pipeline).toArray();

    const hasNext = docs.length > limit;
    if (hasNext) docs.pop();
    const nextCursor = hasNext ? docs[docs.length - 1]._id.toString() : null;

    res.status(200).json({
      total,
      data: docs,
      nextCursor,
      hasNext,
    });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
};

module.exports.createAssessment = async (req, res) => {
  const { assessment } = connectTodb(req.tenantDB);
  if (!req.tenantDB)
    return res.status(500).json({ error: "No tenant DB available" });
  try {
    const { title, creatorId } = req.body;

    const findAssessment = await assessment.findOne({
      $and: [{ title }, { creatorId }],
    });

    if (findAssessment) throw new Error("assessment already created");

    const uploadedData = await assessment.insertOne({
      ...req.body,
      createdAt: new Date().toLocaleString(),
    });

    res
      .status(200)
      .json({ msg: "Assessment created successfully", data: uploadedData });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
};

module.exports.updateAssessment = async (req, res) => {
  const { assessment } = connectTodb(req.tenantDB);
  if (!req.tenantDB)
    return res.status(500).json({ error: "No tenant DB available" });
  try {
    const { assessmentId } = req.query;

    const findAssessment = await assessment.findOne({
      _id: new ObjectId(assessmentId),
    });

    if (!findAssessment) throw new Error("Select valid assessment to update");

    const assessmentUpdatedData = await assessment.updateOne(
      { _id: findAssessment._id },
      {
        $set: { ...req.body, updatedAt: new Date().toLocaleString() },
      }
    );

    res.status(200).json({
      msg: "Assessment updated successfully",
      data: assessmentUpdatedData,
    });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
};

module.exports.deleteAssessment = async (req, res) => {
  const { assessment } = connectTodb(req.tenantDB);
  if (!req.tenantDB)
    return res.status(500).json({ error: "No tenant DB available" });
  try {
    const { assessmentId } = req.query;

    const findAssessment = await assessment.findOne({
      _id: new ObjectId(assessmentId),
    });

    if (!findAssessment) throw new Error("Select valid assessment to update");

    const deletedData = await assessment.deleteOne({ _id: findAssessment._id });

    res
      .status(200)
      .json({ msg: "Assessment deleted successfully", data: deletedData });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
};

module.exports.getOneAssessment = async (req, res) => {
  const { assessment } = connectTodb(req.tenantDB);
  if (!req.tenantDB)
    return res.status(500).json({ error: "No tenant DB available" });
  try {
    const { id } = req.params;

    const findAssessment = await assessment.findOne({
      _id: new ObjectId(id),
    });

    if (!findAssessment) throw new Error("Please select valid assessment");

    res.status(200).json({ data: findAssessment });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
};

module.exports.sendInvitations = async (req, res) => {
  const { assessment } = connectTodb(req.tenantDB);
  if (!req.tenantDB)
    return res.status(500).json({ error: "No tenant DB available" });
  try {
    const { assessmentId } = req.params;
    const { candidates, assessmentAttempts } = req.body;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res
        .status(400)
        .json({ error: "Provide a non-empty candidates array" });
    }

    const findAssessment = await assessment.findOne({
      _id: new ObjectId(assessmentId),
    });

    if (!findAssessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const baseUrl = process.env.STUDENT_PORTAL_URL;
    const results = [];
    const invitations = [];

    // 2) For each candidate, generate a unique code, send email, collect result
    for (const cand of candidates) {
      const { name, email, code } = cand; // unique invitation code
      const link = baseUrl;

      const html = `
              <html><body>
                <h2>Hello ${name},</h2>
                <p>You’ve been invited to take an assessment on Skill Medha LMS.</p>
                <p><a href="${link}">Start Assessment</a></p>
                <p>Use this code ${code} to access assessment</p>
                <p>— Skill Medha Team</p>
              </body></html>
            `;

      const mailOptions = {
        from: "no-reply@skillmedha.com",
        to: email,
        subject: "Your Skill Medha Assessment Invitation",
        html,
      };

      try {
        await transporter.sendMail({
          from: "no-reply@skillmedha.com",
          to: cand.email,
          subject: "Your Skill Medha Assessment Invitation",
          html,
        });
        invitations.push({ ...cand, code, sentAt: new Date(), status: "sent" });
      } catch (err) {
        invitations.push({
          ...cand,
          code,
          sentAt: new Date(),
          status: "error",
          error: err.message,
        });
      }
    }

    // 3) Persist using updateOne exactly as requested
    const data = await assessment.updateOne(
      { _id: new ObjectId(assessmentId) },
      {
        $set: {
          sendInvities: {
            candidates,
            assessmentAttempts,
          },
        },
      }
    );

    return res.status(200).json({
      msg: "Invitations sent",
      results,
      data,
    });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
};

module.exports.assignAssessmentToTenant = async (req, res) => {
  try {
    const { tenants, assingmentId } = req.body;
    if (!tenants || tenants?.length == 0)
      throw new Error("Tenants Must be selected");
    if (!assingmentId) throw new Error("Assingment Must be selected");
    res.status(200).json({ msg: "Assingment sucessfull" });
    tenants.forEach(async (tenant) => {
      const { orgId } = tenant;
      if (!orgId) return;
      const db = await getTenantDB(orgId);
      const { assignedAssessments } = connectTodb(db);
      await assignedAssessments.insertOne({
        assingmentId,
        assingedBy: req.userID,
        assignedAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      });
    });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
};
