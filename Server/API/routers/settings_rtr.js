const express = require('express');
const settings_ctrl = require('../controllers/settings_ctrl');
const router = express.Router();

router.post('/addSettings', settings_ctrl.addSettings)
router.get('/getSettings', settings_ctrl.getSettings)
router.put('/updateSettings', settings_ctrl.updateSettings)

module.exports = router;