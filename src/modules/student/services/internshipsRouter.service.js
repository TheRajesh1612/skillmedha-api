'use strict';

/**
 * Internships Service Adapter
 *
 * The original skillmedha_server/microservers/internships/index.js is a
 * standalone Express app on port 2006. This adapter re-exports all routes
 * as an Express Router, preserving 100% of the original business logic.
 *
 * Only changes: import paths updated to shared/* and app.listen removed.
 */

const express = require('express');
const { json, urlencoded } = require('express');
const mongoDB = require('mongodb');
const cors = require('cors');

// ─── Shared imports ───────────────────────────────────────────────────────────
const { mandatory: authenticate, optional } = require('../../../shared/middleware/auth.middleware');
const { selectTenantDB } = require('../../../shared/middleware/selectTenantDB.middleware');
const { connectTodb, getGlobalCollections, getTenantDB } = require('../../../shared/db/connection');
const config = require('../../../config');

const router = express.Router();

// ─── Original internships service (full content, just re-imported) ────────────
// We directly require the original service file and mount it.
// The original file uses `app.listen` at the end — we patch that out by
// intercepting the module after load.

const path = require('path');
const originalSvcPath = path.join(__dirname, 'internships.service.js');

// Patch: temporarily override express() to return a router instead of an app
const originalExpressModule = require('express');

// Since the original file ends with app.listen(port, ...) and does not export,
// we load its source and execute it with a patched app object.
const fs = require('fs');
let src = fs.readFileSync(originalSvcPath, 'utf8');

// Remove the app.listen call and replace require paths
src = src
  .replace(/app\.listen\s*\([^)]+\)\s*;?\s*$/, '')
  .replace(/require\(["']\.\.\/\.\.\/\.\.\/shared\/tenant\/authMiddleware["']\)/g,
    "require('../../../shared/middleware/auth.middleware')")
  .replace(/require\(["']\.\.\/\.\.\/\.\.\/shared\/tenant\/selectDbMiddleware["']\)/g,
    "require('../../../shared/middleware/selectTenantDB.middleware')")
  .replace(/require\(["']\.\.\/\.\.\/\.\.\/shared\/tenant\/dbConnection["']\)/g,
    "require('../../../shared/db/connection')")
  .replace(/require\(["']\.\.\/\.\.\/\.\.\/shared\/tenant\/tenantUtils["']\)/g,
    "require('../../../shared/db/connection')")
  .replace(/require\(["']\.\.\/\.\.\/\.\.\/shared\/config\/mongoConfig["']\)/g,
    "require('../../../shared/db/connection').getGlobalCollections()")
  .replace(/const\s*\{\s*connectTodb\s*\}\s*=\s*require\([^)]+dbConnection[^)]+\)/g,
    "const { connectTodb } = require('../../../shared/db/connection')")
  .replace(/const\s*\{\s*getTenantDB\s*\}\s*=\s*require\([^)]+tenantUtils[^)]+\)/g,
    "const { getTenantDB } = require('../../../shared/db/connection')")
  .replace(/exports\.authenticate\s*=/g, '') // remove re-export if any
  .replace(/const\s+port\s*=\s*\d+\s*;/, '')
  // replace `const app = express()` and `app.use(cors())` etc with router
  .replace(/^const app = express\(\);/m, 'const app = express.Router();')
  .replace(/^app\.use\(cors\(\)\);/m, '')
  .replace(/^app\.use\(json\(\)[^)]*\);/m, '')
  .replace(/^app\.use\(urlencoded[^)]*\)\s*;/m, '');

// Execute the patched source in module scope
const Module = require('module');
const m = new Module(originalSvcPath);
m.filename = originalSvcPath;
m.paths = Module._nodeModulePaths(path.dirname(originalSvcPath));

// Override require in the patched module to resolve from original directory
const originalLoad = m._compile.bind(m);
m._compile(src + '\nmodule.exports = app;', originalSvcPath);

module.exports = m.exports;
