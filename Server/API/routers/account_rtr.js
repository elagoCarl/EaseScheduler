const express = require('express');
const account_ctrl = require('../controllers/account_ctrl');
const router = express.Router();

router.post('/addAccount', account_ctrl.addAccount);
router.get('/test', (req, res) => res.status(200).json({ message: "Test endpoint works" }));



module.exports = router;