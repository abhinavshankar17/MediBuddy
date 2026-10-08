const jwt = require('jsonwebtoken');
const config = require('../config');
const { errorResponse } = require('../utils/response');

/**
 * Authentication middleware verifying JWT Bearer token
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Authentication token missing or invalid format', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return errorResponse(res, 'Invalid or expired authentication token', 401);
  }
};

/**
 * Role-based authorization middleware
 * @param  {...string} roles Allowed roles ('patient', 'caregiver', 'nurse', 'clinician', 'admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthenticated user', 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource`,
        403
      );
    }

    return next();
  };
};

module.exports = {
  authenticate,
  authorize
};
