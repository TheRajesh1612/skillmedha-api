'use strict';

const mongoDB = require('mongodb');
const { getGlobalCollections } = require('../../../shared/db/connection');

function convertToMId(id) {
  try { return new mongoDB.ObjectId(id); } catch (_) { return id; }
}

async function createResume(req, res) {
  const { studentsCollection: student, rzp_payemntDetails } = getGlobalCollections();
  // resume collection lives on shared DB
  const db = student.s?.db || null;
  try {
    const { mainDBusers } = getGlobalCollections();
    // Use tenant student + resume collections
    const tenantStudent = require('../../../shared/db/connection').connectTodb(req.tenantDB || { collection: () => ({ findOne: async () => null, insertOne: async () => ({}), updateOne: async () => ({}) }) });
    const { student: studentCol, resume } = tenantStudent;
    const { studentId } = req.body;
    const findStudent = await studentCol.findOne({ _id: convertToMId(studentId) });
    if (!findStudent) throw new Error('Student not found');
    const resumeData = await resume.insertOne({ ...req.body, createdAt: new Date().toLocaleString() });
    await studentCol.updateOne(
      { _id: findStudent._id },
      { $set: { resume: resumeData.insertedId.toString() } }
    );
    res.status(200).json({ msg: 'Resume created successfully', data: resumeData });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
}

async function updateResume(req, res) {
  try {
    const { resume } = require('../../../shared/db/connection').connectTodb(req.tenantDB);
    const { resumeId } = req.query;
    const findResume = await resume.findOne({ _id: convertToMId(resumeId) });
    if (!findResume) throw new Error('Please select valid resume to update');
    const updateddata = await resume.updateOne(
      { _id: findResume._id },
      { $set: { ...req.body, updatedAt: new Date().toLocaleString() } }
    );
    res.status(200).json({ msg: 'Resume updated successfully', data: updateddata });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
}

async function deleteResume(req, res) {
  try {
    const { resume, student: studentCol } = require('../../../shared/db/connection').connectTodb(req.tenantDB);
    const { resumeId, studentId } = req.body;
    const findResume = await resume.findOne({ _id: convertToMId(resumeId) });
    const findStudent = await studentCol.findOne({ _id: convertToMId(studentId) });
    if (!findResume) throw new Error('Please select valid resume to update');
    if (!findStudent) throw new Error('Student not found');
    await studentCol.updateOne({ _id: findStudent._id }, { $unset: { resume: '' } });
    const deletedData = await resume.deleteOne({ _id: findResume._id });
    res.status(200).json({ msg: 'Resume deleted successfully', data: deletedData });
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
}

module.exports = { createResume, updateResume, deleteResume };
