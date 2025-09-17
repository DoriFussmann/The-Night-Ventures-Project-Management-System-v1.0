const jwt = require('jsonwebtoken');

// JWT secret with fallback for development
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-please';

/**
 * Sign a JWT token
 * @param {Object} payload - JWT payload
 * @param {string} expiresIn - Token expiration (default: 7d)
 * @returns {string} JWT token
 */
function sign(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid
 */
function verify(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Create session cookie options
 * @returns {Object} Cookie options
 */
function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    secure: process.env.NODE_ENV === 'production' // HTTPS in production
  };
}

module.exports = {
  sign,
  verify,
  getCookieOptions
};
