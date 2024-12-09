const express = require('express');
const course_ctrl = require('../controllers/course_ctrl');
const router = express.Router();

router.get('/test', (req, res) => res.status(200).json({ message: "Gumagana yung endpoint" }));
router.post('/addCourse', course_ctrl.addCourse)
router.get('/getAllCourses', course_ctrl.getAllCourses)
router.delete('/deleteCourse/:id', course_ctrl.deleteCourse)
router.get('/getCourse/:id', course_ctrl.getCourse)
router.put('/updateCourse/:id', course_ctrl.updateCourse)
router.get('/getCoursesByProf/:id', course_ctrl.getCourseByProf)
router.post('/addDeptCourse', course_ctrl.addDeptCourse)
router.delete('/deleteDeptCourse', course_ctrl.deleteDeptCourse)
router.get('/getCoursesByDept/:id', course_ctrl.getCoursesByDept)

module.exports = router;