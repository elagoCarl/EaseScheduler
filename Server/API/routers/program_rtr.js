const express = require('express');
const program_ctrl = require('../controllers/program_ctrl');
const router = express.Router();

router.get('/getProgram/:id', program_ctrl.getProgram);
router.get('/getAllProgram', program_ctrl.getAllProgram);
router.post('/addProgram', program_ctrl.addProgram);
router.patch('/updateProgram/:id', program_ctrl.updateProgram);
router.delete('/deleteProgram/:id', program_ctrl.deleteProgram);
router.get('/getAllProgByDept/:id', program_ctrl.getAllProgramByDept);

module.exports = router;