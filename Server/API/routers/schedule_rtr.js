const express = require('express');
const schedule_ctrl = require('../controllers/schedule_ctrl');
const router = express.Router();

router.post('/addSchedule', schedule_ctrl.addSchedule)
router.get('/getAllSchedule', schedule_ctrl.getAllSchedules)
router.get('/getSchedule/:id', schedule_ctrl.getSchedule)
router.delete('/deleteSchedule/:id', schedule_ctrl.deleteSchedule)
router.put('/updateSchedule/:id', schedule_ctrl.updateSchedule)
router.patch('/automateSchedule', schedule_ctrl.automateSchedule)
router.get('/getSchedsByRoom/:id', schedule_ctrl.getSchedsByRoom)
router.get('/getSchedsByProf/:id', schedule_ctrl.getSchedsByProf)
router.get('/getSchedsByDept/:id', schedule_ctrl.getSchedsByDept)

module.exports = router;