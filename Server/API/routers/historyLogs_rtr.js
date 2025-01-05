const express = require('express');
const historyLogs_ctrl = require('../controllers/historyLogs_ctrl');
const router = express.Router();

router.get('/test', (req, res) => res.status(200).json({ message: "Gumagana yung endpoint" }));
router.get('/getAllHistoryLogs', historyLogs_ctrl.getAllHistoryLogs)

module.exports = router;