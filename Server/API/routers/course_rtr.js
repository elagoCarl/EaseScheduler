const express = require('express');
const course_ctrl = require('../controllers/course_ctrl');
const router = express.Router();

router.get('/test', (req, res) => res.status(200).json({ message: "Gumagana yung endpoint" }));
router.post('/addCourse', course_ctrl.addCourse)
router.get('/getAllCourses', course_ctrl.getAllCourses)
router.delete('/deleteCourse/:id', course_ctrl.deleteCourse)
router.get('/getCourse/:id', course_ctrl.getCourse)
router.put('/updateCourse/:id', course_ctrl.updateCourse)

module.exports = router;