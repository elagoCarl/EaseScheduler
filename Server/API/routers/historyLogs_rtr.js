const express = require('express');
const historyLogs_ctrl = require('../controllers/historyLogs_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.get('/test', (req, res) => res.status(200).json({ message: "Gumagana yung endpoint" }));
router.get('/getAllHistoryLogs', historyLogs_ctrl.getAllHistoryLogs)

module.exports = router;