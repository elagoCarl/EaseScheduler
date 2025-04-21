const express = require('express');
const settings_ctrl = require('../controllers/settings_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.post('/addSettings', settings_ctrl.addSettings)
router.get('/getSettings', settings_ctrl.getSettings)
router.get('/getSettingsByDept/:id', settings_ctrl.getSettingsByDept)
router.put('/updateSettings', settings_ctrl.updateSettings)
router.put('/updateSettingsByDept/:id', settings_ctrl.updateSettingsByDept)

module.exports = router;