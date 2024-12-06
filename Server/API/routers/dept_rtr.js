const express = require('express');
const dept_ctrl = require('../controllers/dept_ctrl');
const router = express.Router();

router.post('/addDept', dept_ctrl.addDept)
router.get('/getAllDept', dept_ctrl.getAllDept)
router.get('/getDept/:id', dept_ctrl.getDept)

module.exports = router;