const express = require('express');
const authMiddleware = require('../controllers/authMiddleware'); // Import the refresh function
const router = express.Router();

// Define a GET endpoint for refreshing tokens
router.get('/refresh', authMiddleware.refresh);

module.exports = router;
