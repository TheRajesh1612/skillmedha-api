'use strict';
/**
 * TestPortal Router - student-facing subset
 * Routes that students use: saveTestProgress, getResultsData, updateProgress
 * Full test management routes live in modules/tpo/
 */
const { Router } = require('express');
const { mandatory: authenticate } = require('../../../shared/middleware/auth.middleware');
const { selectTenantDB } = require('../../../shared/middleware/selectTenantDB.middleware');
const testsSvc = require('../../test/services/tests.service');
const router = Router();

if (testsSvc.saveTestProgress)    router.post('/saveTestProgress',           authenticate, selectTenantDB, testsSvc.saveTestProgress);
if (testsSvc.updateProgress)      router.post('/updateProgress/:progressId', authenticate, selectTenantDB, testsSvc.updateProgress);
if (testsSvc.getResultsData)      router.post('/getResultsData/:id',         authenticate, selectTenantDB, testsSvc.getResultsData);
if (testsSvc.getRecentTestResults)router.get('/getRecentTestResults/:studentId', authenticate, selectTenantDB, testsSvc.getRecentTestResults);

module.exports = router;
