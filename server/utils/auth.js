const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_COOKIE_NAME = 'token';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

function setAuthCookie(res, payload) {
  const token = signToken(payload);
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false // set true if you use HTTPS
  });
}

function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE_NAME);
}

const Team = require('../models/Team');

function authMiddleware(role) {
  return async (req, res, next) => {
    const token = req.cookies[TOKEN_COOKIE_NAME];
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (role && decoded.role !== role) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Multi-login protection for teams
      if (decoded.role === 'team') {
        const team = await Team.findById(decoded.id);
        if (!team) return res.status(401).json({ message: 'User no longer exists' });

        // If token login time is older than the last login time in DB, it means another session started
        if (team.lastLoginAt && decoded.lastLoginAt < new Date(team.lastLoginAt).getTime()) {
          res.clearCookie(TOKEN_COOKIE_NAME);
          return res.status(401).json({ message: 'Session expired. Another device logged in.' });
        }
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

module.exports = {
  setAuthCookie,
  clearAuthCookie,
  authTeam: authMiddleware('team'),
  authAdmin: authMiddleware('admin')
};

