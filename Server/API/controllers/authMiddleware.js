const jwt = require('jsonwebtoken');
const { Account, Session } = require('../models');
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

// Token Expirations
const ACCESS_TOKEN_EXPIRY = 60; // 60 seconds (adjust as needed, e.g., 900 for 15 minutes)
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 30; // 30 days

// Functions to create tokens
const createAccessToken = (id) =>
  jwt.sign({ id }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
const createRefreshToken = (id) =>
  jwt.sign({ id }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

/**
 * requireAuth middleware checks for a valid access token.
 * It does NOT attempt to refresh tokens on the same request.
 */
const requireAuth = (req, res, next) => {
  // Get token from Authorization header or cookies
  let token = null;
  const authorizationHeader = req.headers['authorization'];
  if (authorizationHeader) {
    token = authorizationHeader.split(' ')[1];
  }
  if (!token) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return res.status(401).json({ successful: false, message: "Access token not provided" });
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decodedToken) => {
    if (err) {
      console.error("Authentication error:", err.message);
      return res.status(401).json({ successful: false, message: err.message });
    }
    req.decodedToken = decodedToken;
    next();
  });
};

/**
 * refresh function is designed to be used as a dedicated refresh endpoint.
 * It verifies the refresh token, updates the session with a new refresh token,
 * issues a new access token, and sets both as cookies.
 */
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken)
      return res.status(401).json({ successful: false, message: "Refresh token not provided" });

    // Find session using the provided refresh token
    const session = await Session.findOne({ where: { Token: refreshToken } });
    if (!session)
      return res.status(401).json({ successful: false, message: "Invalid refresh token" });

    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, async (refreshErr, user) => {
      if (refreshErr)
        return res.status(401).json({ successful: false, message: "Invalid or expired refresh token" });

      // Generate new tokens
      const newAccessToken = createAccessToken(user.id);
      const newRefreshToken = createRefreshToken(user.id);

      // Update session with new refresh token (update in place)
      await Session.update({ Token: newRefreshToken }, { where: { AccountId: user.id } });

      // Set new tokens in cookies
      res.cookie('jwt', newAccessToken, {
        httpOnly: true,
        maxAge: ACCESS_TOKEN_EXPIRY * 1000,
        secure: false,
        sameSite: 'Lax',
        domain: 'https://ease-scheduler.vercel.app',
        path: '/',
      });
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        maxAge: REFRESH_TOKEN_EXPIRY * 1000,
        secure: false,
        sameSite: 'Lax',
        domain: 'https://ease-scheduler.vercel.app',
        path: '/',
      });

      return res.json({ successful: true, message: "Tokens refreshed" });
    });
  } catch (error) {
    console.error("Error in refresh endpoint:", error.message);
    return res.status(401).json({ successful: false, message: error.message });
  }
};

/**
 * Helper function to refresh tokens and return the decoded token of the new access token.
 */
const refreshTokens = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    throw new Error("Refresh token not provided");
  }

  // Find session using the provided refresh token
  const session = await Session.findOne({ where: { Token: refreshToken } });
  if (!session) {
    throw new Error("Invalid refresh token");
  }

  // Verify refresh token
  const decodedUser = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

  // Generate new tokens
  const newAccessToken = createAccessToken(decodedUser.id);
  const newRefreshToken = createRefreshToken(decodedUser.id);

  // Update session with new refresh token
  await Session.update({ Token: newRefreshToken }, { where: { AccountId: decodedUser.id } });

  // secure: true,
  // sameSite: 'Strict'

  // Set new tokens in cookies
  res.cookie('jwt', newAccessToken, {
    httpOnly: true,
    maxAge: ACCESS_TOKEN_EXPIRY * 1000,
    secure: false,
    sameSite: 'Lax',
    domain: 'https://ease-scheduler.vercel.app',
    path: '/',
  });
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    maxAge: REFRESH_TOKEN_EXPIRY * 1000,
    secure: false,
    sameSite: 'Lax',
    domain: 'https://ease-scheduler.vercel.app',
    path: '/',
  });

  // Return the decoded token of the new access token
  return jwt.verify(newAccessToken, ACCESS_TOKEN_SECRET);
};

module.exports = {
  requireAuth,
  refresh,
  refreshTokens, // Exported for use in account controller
  createAccessToken,
  createRefreshToken,
};
