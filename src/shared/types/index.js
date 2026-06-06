'use strict';

/**
 * Shared types and constants for the Skillmedha API.
 * (JSDoc-based since project is JavaScript, not TypeScript)
 */

/**
 * @typedef {Object} ApiRequest
 * @property {string|null} userId
 * @property {string|null} userID
 * @property {string|null} email
 * @property {string|null} orgId
 * @property {string|null} role
 * @property {string[]}    roles
 * @property {boolean}     isAuth
 * @property {boolean}     isAdmin
 * @property {import('mongodb').Db} tenantDB
 */

/**
 * @typedef {'ADMIN'|'STUDENT'|'TPO'|'PROCTOR'} Role
 */

const ROLES = {
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
  TPO: 'TPO',
  PROCTOR: 'PROCTOR',
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL: 500,
};

module.exports = { ROLES, HTTP_STATUS };
