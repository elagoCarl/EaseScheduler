const jwt = require('jsonwebtoken');
const { Account, Session } = require('../models'); // Assuming Sequelize models are properly defined
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

// Token Expirations
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 30; // 30 days

// Function to create tokens
const createAccessToken = (id) => jwt.sign({ id }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
const createRefreshToken = (id) => jwt.sign({ id }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

const requireAuth = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers['authorization'];
    if (!authorizationHeader) throw new Error("Authorization header missing");

    const token = authorizationHeader.split(' ')[1];
    if (!token) throw new Error("No token found");

    // Verify Access Token
    jwt.verify(token, ACCESS_TOKEN_SECRET, async (err, decodedToken) => {
      if (!err) {
        req.decodedToken = decodedToken;
        return next();
      }

      if (err.name === 'TokenExpiredError') {
        try {
          const refreshToken = req.cookies.refreshToken;
          if (!refreshToken) throw new Error("Refresh token not provided");

          const session = await Session.findOne({ where: { token: refreshToken } });
          if (!session) throw new Error("Invalid refresh token");

          // Verify Refresh Token
          jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, async (refreshErr, user) => {
            if (refreshErr) throw new Error("Invalid or expired refresh token");

            // Generate new tokens
            const newAccessToken = createAccessToken(user.id);
            const newRefreshToken = createRefreshToken(user.id);

            // Update session with new refresh token
            await Session.update({ token: newRefreshToken }, { where: { userId: user.id } });

            // Set cookies
            res.cookie('jwt', newAccessToken, {
              httpOnly: true,
              maxAge: ACCESS_TOKEN_EXPIRY * 1000,
              secure: true,
              sameSite: 'Strict'
            });
            res.cookie('refreshToken', newRefreshToken, {
              httpOnly: true,
              maxAge: REFRESH_TOKEN_EXPIRY * 1000,
              secure: true,
              sameSite: 'Strict'
            });

            req.decodedToken = user;
            next();
          });
        } catch (error) {
          console.error("Error refreshing access token:", error.message);
          return res.status(401).json({ successful: false, message: error.message });
        }
      } else {
        console.error("Authentication error:", err.message);
        return res.status(401).json({ successful: false, message: err.message });
      }
    });
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({ successful: false, message: error.message });
  }
};

module.exports = {
  requireAuth
};
