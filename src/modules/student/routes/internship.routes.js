'use strict';

/**
 * Student-facing internship routes.
 * These are the READ / APPLY routes from the original internships microserver.
 * TPO-side management routes (create/update/delete) live in modules/tpo/routes/internship.routes.js
 */

const { Router } = require('express');
const { mandatory, optional } = require('../../../shared/middleware/auth.middleware');
const { selectTenantDB } = require('../../../shared/middleware/selectTenantDB.middleware');

// Re-use the internships service (original business logic, zero changes)
const internshipsSvc = require('../services/internships.service');

// The internships service exports an Express app.
// We mount it directly under a sub-router to preserve all existing route paths.
const router = Router();
router.use('/', internshipsSvc);

module.exports = router;
