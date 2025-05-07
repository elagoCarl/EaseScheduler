const express = require('express');
const schoolYear_ctrl = require('../controllers/schoolYear_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.post('/addSchoolYear', schoolYear_ctrl.addSchoolYear)
router.get('/getAllSchoolYears', schoolYear_ctrl.getAllSchoolYears)
router.get('/getSchoolYear/:id', schoolYear_ctrl.getSchoolYear)
router.delete('/deleteSchoolYear/:id', schoolYear_ctrl.deleteSchoolYear)
router.put('/updateSchoolYear/:id', schoolYear_ctrl.updateSchoolYear)
router.get('/getCurrentSchoolYear', schoolYear_ctrl.getCurrentSchoolYear)

module.exports = router;