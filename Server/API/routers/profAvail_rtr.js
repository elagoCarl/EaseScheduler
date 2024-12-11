const express = require('express');
const profAvail_ctrl = require('../controllers/profAvail_ctrl');
const router = express.Router();

router.post('/addProfAvail', profAvail_ctrl.addProfessorAvail);
router.get('/getAllProfAvail', profAvail_ctrl.getAllProfessorAvail)
router.get('/getProfAvail/:id',profAvail_ctrl.getProfessorAvail)
router.put('/updateProfAvail/:id', profAvail_ctrl.updateProfessorAvail);
router.delete('/deleteProfAvail/:id', profAvail_ctrl.deleteProfessorAvail);

module.exports = router;