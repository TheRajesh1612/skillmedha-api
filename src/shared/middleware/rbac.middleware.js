'use strict';

/**
 * RBAC Middleware
 * Roles: ADMIN, STUDENT, TPO, PROCTOR
 * Usage: router.get('/route', rbac('ADMIN', 'TPO'), handler)
 */

const ROLES = {
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
  TPO: 'TPO',
  PROCTOR: 'PROCTOR',
};

/**
 * Require one of the given roles.
 * @param {...string} allowedRoles
 */
function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.isAuth) {
      return res.status(401).json({ error: 'Unauthorized: Not authenticated' });
    }

    const userRole = (req.role || '').toUpperCase();
    const userRoles = (req.roles || []).map((r) => r.toUpperCase());

    const hasRole =
      allowedRoles.some(
        (r) => r.toUpperCase() === userRole || userRoles.includes(r.toUpperCase())
      );

    if (!hasRole) {
      return res.status(403).json({
        error: `Forbidden: Required role(s): ${allowedRoles.join(', ')}. Your role: ${userRole || 'none'}`,
      });
    }

    next();
  };
}

module.exports = { rbac, ROLES };
