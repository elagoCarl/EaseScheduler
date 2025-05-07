const express = require('express');
const profLoad_ctrl = require('../controllers/profLoad_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.post('/addProfessorLoad', profLoad_ctrl.addProfessorLoad)
router.get('/getAllProfessorLoads', profLoad_ctrl.getAllProfessorLoads)
router.get('/getProfessorLoad/:id', profLoad_ctrl.getProfessorLoad)
router.get('/getProfessorLoadsById/:id', profLoad_ctrl.getProfessorLoadsById)
router.get('/getLoadsBySchoolYear/:id', profLoad_ctrl.getLoadsBySchoolYear)
router.delete('/deleteProfessorLoad/:id', profLoad_ctrl.deleteProfessorLoad)
router.put('/updateProfessorLoad/:id', profLoad_ctrl.updateProfessorLoad)
router.get('/getProfLoadByProfAndSY', profLoad_ctrl.getProfLoadByProfAndSY)

module.exports = router;