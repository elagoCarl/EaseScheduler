const express = require('express');
const prof_ctrl = require('../controllers/prof_ctrl');
const router = express.Router();

router.post('/addProf', prof_ctrl.addProf)
router.get('/getAllProf', prof_ctrl.getAllProf)
router.get('/getProf/:id', prof_ctrl.getProf)
router.delete('/deleteProf/:id', prof_ctrl.deleteProf)
router.put('/updateProf/:id', prof_ctrl.updateProf)
router.post('/addCourseProf', prof_ctrl.addCourseProf)
router.delete('/deleteCourseProf', prof_ctrl.deleteCourseProf)
// router.get('/getProfsByCourse/:id', prof_ctrl.getProfsByCourse)

module.exports = router;