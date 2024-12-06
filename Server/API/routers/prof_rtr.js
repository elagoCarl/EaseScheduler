const express = require('express');
const prof_ctrl = require('../controllers/prof_ctrl');
const router = express.Router();

router.post('/addProf', prof_ctrl.addProf)
router.get('/getAllProf', prof_ctrl.getAllProf)
router.get('/getProf/:id', prof_ctrl.getProf)

module.exports = router;