const express = require('express');
const program_ctrl = require('../controllers/program_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.get('/getProgram/:id', program_ctrl.getProgram)
router.get('/getAllProgram', program_ctrl.getAllProgram)
router.post('/addProgram', program_ctrl.addProgram)
router.put('/updateProgram/:id', program_ctrl.updateProgram)
router.delete('/deleteProgram/:id', program_ctrl.deleteProgram)
router.get('/getAllProgramsByCourse/:id', program_ctrl.getAllProgramByCourse)
router.get('/getAllProgByDept/:id', program_ctrl.getAllProgramByDept)
router.get('/getAllCourseProgByCourse/:id', program_ctrl.getAllCourseProgByCourse)

module.exports = router;