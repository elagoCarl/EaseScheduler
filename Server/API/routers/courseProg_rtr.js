const express = require('express');
const courseProg_ctrl = require('../controllers/courseProg_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.post('/addCourseProg', courseProg_ctrl.addCourseProg)
router.delete('/deleteCourseProg/:id', courseProg_ctrl.deleteCourseProg)
router.get('/getCoursesByProg/:id', courseProg_ctrl.getCoursesByProg)
router.put('/updateCourseProg/:id', courseProg_ctrl.updateCourseProg)
module.exports = router;