const express = require('express');
const program_ctrl = require('../controllers/program_ctrl');
const router = express.Router();

router.get('/getProgram/:id', program_ctrl.getProgram);
router.get('/getAllProgram', program_ctrl.getAllProgram);
router.post('/addProgram', program_ctrl.addProgram);
router.put('/updateProgram/:id', program_ctrl.updateProgram);
router.delete('/deleteProgram/:id', program_ctrl.deleteProgram);
router.get('/getAllProgramsByCourse/:id', program_ctrl.getAllProgramByCourse);
router.get('/getAllProgByFac/:id', program_ctrl.getCoursesByProg);
router.put('/updateCourseProg/:id', program_ctrl.updateCourseProg);
router.delete('/deleteCourseProg/:id', program_ctrl.deleteCourseProg);
router.post('/addCourseProg', program_ctrl.addCourseProg);

module.exports = router;