const express = require("express");
const { json, urlencoded } = require("express");
const mongoDb = require("mongodb");
const { student, resume } = require("../../../shared/db/connection").getGlobalCollections();
const { convertToMId } = require("../../../shared/utils/helpers");
const { archiveAndDeleteOne } = require("../../../shared/utils/archive.service");

const mongoDB = require("mongodb");
const app = express();
const port = 2005;

app.post("/createResume", async (req, res) => {
  try {
    const { studentId } = req.body;

    const findStudent = await student.findOne({ _id: convertToMId(studentId) });

    if (!findStudent) throw new Error("Student not found");

    const resumeData = await resume.insertOne({
      ...req.body,
      createdAt: new Date().toLocaleString(),
    });

    await student.updateOne(
      { _id: findStudent._id },
      {
        $set: { resume: resumeData.insertedId.toString() },
      }
    );

    res
      .status(200)
      .json({ msg: "Resume created successfully", data: resumeData });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
});

app.post("/updateResume", async (req, res) => {
  try {
    const { resumeId } = req.query;

    // const {updatedObject} = req.body
    const findResume = await resume.findOne({ _id: convertToMId(resumeId) });

    if (!findResume) throw new Error("Please select valid resume to update");

    const updateddata = await resume.updateOne(
      { _id: findResume._id },
      {
        $set: { ...req.body, updatedAt: new Date().toLocaleString() },
      }
    );

    res
      .status(200)
      .json({ msg: "Resume updated successfully", data: updateddata });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
});

app.post("/deleteResume", async (req, res) => {
  try {
    const { resumeId, studentId } = req.body;

    const findResume = await resume.findOne({ _id: convertToMId(resumeId) });

    const findStudent = await student.findOne({ _id: convertToMId(studentId) });

    if (!findResume) throw new Error("Please select valid resume to update");
    if (!findStudent) throw new Error("Student not found");

    await student.updateOne(
      { _id: findStudent._id },
      { $unset: { resume: "" } }
    );

    const archiveResult = await archiveAndDeleteOne(resume, { _id: findResume._id }, {
      deletedBy: req.userID || null,
      reason: req.body.reason || null,
    });

    if (archiveResult.deletedCount === 0) {
      throw new Error('Failed to delete resume after archival');
    }

    res
      .status(200)
      .json({ msg: "Resume deleted successfully", data: archiveResult.deletedDocument });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
});


module.exports = app;
