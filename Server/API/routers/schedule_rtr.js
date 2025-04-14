const express = require('express');
const schedule_ctrl = require('../controllers/schedule_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.post('/addSchedule', schedule_ctrl.addSchedule)
router.get('/getAllSchedule', schedule_ctrl.getAllSchedules)
router.get('/getSchedule/:id', schedule_ctrl.getSchedule)
router.delete('/deleteSchedule/:id', schedule_ctrl.deleteSchedule)
router.put('/updateSchedule/:id', schedule_ctrl.updateSchedule)
router.put('/automateSchedule', schedule_ctrl.automateSchedule)
router.get('/getSchedsByRoom/:id', schedule_ctrl.getSchedsByRoom)
router.get('/getSchedsByProf/:id', schedule_ctrl.getSchedsByProf)
router.get('/getSchedsByDept/:id', schedule_ctrl.getSchedsByDept)
router.put('/toggleLock/:id', schedule_ctrl.toggleLock)
router.put('/toggleLockAllSchedules', schedule_ctrl.toggleLockAllSchedules)
router.delete('/deleteAllDepartmentSchedules/:id', schedule_ctrl.deleteAllDepartmentSchedules)


module.exports = router;