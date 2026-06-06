'use strict';

const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const config = require('../../config');

const CRYPTO_SECRET = config.auth.cryptoSecret;
const JWT_SECRET = config.auth.jwtSecret;

function tryAES(token, req) {
  try {
    const bytes = CryptoJS.AES.decrypt(token, CRYPTO_SECRET);
    const decoded = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    if (decoded.email) {
      req.isAuth = true;
      Object.keys(decoded).forEach((key) => { req[key] = decoded[key]; });
      req.userId = decoded.userId || decoded.userID || decoded._id || null;
      req.userID = req.userId;
      req.isAdmin = decoded.role === 'admin' || decoded.role === 'ADMIN';
      return true;
    }
  } catch (_) {
    // silent fail — allow JWT attempt
  }
  return false;
}

function tryJWT(token, req) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.isAuth = true;

    req.userId = decoded.userId || decoded.userID || decoded.userid || null;
    req.userID = req.userId;
    req.email = decoded.email || null;
    req.orgId = decoded.orgId || decoded.organizationId || decoded.orgID || null;

    const primaryRole = decoded.role || decoded.roles || decoded.Role || decoded.roleName || null;
    const normalizedRole = Array.isArray(primaryRole) ? primaryRole[0] : primaryRole;
    req.role = normalizedRole ? normalizedRole.toString().toUpperCase() : null;

    req.roles = Array.isArray(primaryRole)
      ? primaryRole.map((r) => r.toString().toUpperCase())
      : req.role ? [req.role] : [];

    req.isAdmin = req.role === 'ADMIN' || req.roles.includes('ADMIN');
    req.permissions = decoded.permissions || {};
    return true;
  } catch (_) {
    // silent fail
  }
  return false;
}

function unifiedAuth(isMandatory) {
  return (req, res, next) => {
    const authHeader =
      req.get('Authorization') ||
      req.get('authorization') ||
      req.headers.authorization;

    if (!authHeader || !authHeader.includes(' ')) {
      if (isMandatory)
        return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
      req.isAuth = false;
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      if (isMandatory)
        return res.status(401).json({ error: 'Unauthorized: Token missing' });
      req.isAuth = false;
      return next();
    }

    if (tryAES(token, req)) return next();
    if (tryJWT(token, req)) return next();

    if (isMandatory)
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });

    req.isAuth = false;
    return next();
  };
}

module.exports = {
  optional: unifiedAuth(false),
  mandatory: unifiedAuth(true),
};
