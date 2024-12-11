const jwt = require('jsonwebtoken');
const { Account, Session } = require('../models'); // Assuming Sequelize models are properly defined
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

// Create JSON Web Tokens
const maxAge = 10; // 10 seconds
const createAccessToken = (id) => {
  return jwt.sign({ id }, ACCESS_TOKEN_SECRET, {
    expiresIn: maxAge
  });
};

const createRefreshToken = (id) => {
  return jwt.sign({ id }, REFRESH_TOKEN_SECRET, {
    expiresIn: 60 * 60 * 24 * 30 // 30 days
  });
};

const requireAuth = async (req, res, next) => {
  const authorizationHeader = req.headers['authorization'];
  if (!authorizationHeader) {
    return res.status(400).json({
      successful: false,
      message: "Authorization header missing"
    });
  }

  const token = authorizationHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, ACCESS_TOKEN_SECRET, async (err, decodedToken) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
              throw new Error("Refresh token not provided");
            }

            const session = await Session.findOne({ where: { token: refreshToken } });
            if (!session) {
              throw new Error("Invalid refresh token");
            }

            const user = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
            const accessToken = createAccessToken(user.id);
            const newRefreshToken = createRefreshToken(user.id);

            res.cookie('refreshToken', '', { maxAge: 1 });
            res.cookie('jwt', accessToken, { httpOnly: true, maxAge: maxAge * 1000 });
            res.cookie('refreshToken', newRefreshToken, { httpOnly: true, maxAge: (60 * 60 * 24 * 30) * 1000 });

            await Session.destroy({ where: { userId: user.id } });
            await Session.create({
              userId: user.id,
              token: newRefreshToken
            });

            req.decodedToken = user;
            next();
          } catch (err) {
            console.error("Error refreshing access token:", err);
            return res.status(400).json({
              successful: false,
              message: err.message
            });
          }
        } else {
          console.log(err.message);
          res.status(400).json({
            successful: false,
            message: err.message
          });
        }
      } else {
        req.decodedToken = decodedToken;
        next();
      }
    });
  } else {
    console.log("No token found");
    res.status(400).json({
      successful: false,
      message: "No token found"
    });
  }
};

module.exports = {
  requireAuth
};
