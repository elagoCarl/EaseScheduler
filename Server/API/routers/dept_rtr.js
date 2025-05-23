const express = require('express');
const dept_ctrl = require('../controllers/dept_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.post('/addDept', dept_ctrl.addDept)
router.get('/getAllDept', dept_ctrl.getAllDept)
router.get('/getDept/:id', dept_ctrl.getDept)
router.delete('/deleteDept/:id', dept_ctrl.deleteDept)
router.put('/updateDept/:id', dept_ctrl.updateDept)
router.get('/getDeptsByCourse/:id', dept_ctrl.getDeptsByCourse)
router.get('/getDeptsByRoom/:id', dept_ctrl.getDeptsByRoom)

module.exports = router;