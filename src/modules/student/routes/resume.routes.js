'use strict';

const { Router } = require('express');
const { mandatory } = require('../../../shared/middleware/auth.middleware');
const { selectTenantDB } = require('../../../shared/middleware/selectTenantDB.middleware');
const ctrl = require('../controllers/resume.controller');

const router = Router();

router.post('/createResume', mandatory, selectTenantDB, ctrl.createResume);
router.post('/updateResume', mandatory, selectTenantDB, ctrl.updateResume);
router.post('/deleteResume', mandatory, selectTenantDB, ctrl.deleteResume);

module.exports = router;
