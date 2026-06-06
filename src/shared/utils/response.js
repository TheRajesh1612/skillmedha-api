'use strict';

/**
 * Standard API response helpers.
 * All existing controllers use res.status(200).json() / res.status(500).json().
 * These helpers are NEW wrappers — existing code is untouched.
 */

function successRes(res, data, message = 'Success') {
  return res.status(200).json({ success: true, message, data });
}

function errorRes(res, message = 'Internal Server Error', statusCode = 500, data = null) {
  return res.status(statusCode).json({ success: false, message, ...(data && { data }) });
}

function notFound(res, message = 'Not found') {
  return res.status(404).json({ success: false, message });
}

function unauthorized(res, message = 'Unauthorized') {
  return res.status(401).json({ success: false, message });
}

function forbidden(res, message = 'Forbidden') {
  return res.status(403).json({ success: false, message });
}

module.exports = { successRes, errorRes, notFound, unauthorized, forbidden };
