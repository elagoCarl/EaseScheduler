const express = require('express');
const room_ctrl = require('../controllers/room_ctrl');
const router = express.Router();

router.post('/addRoom', room_ctrl.addRoom)
router.get('/getAllRoom', room_ctrl.getAllRoom)
router.get('/getRoom/:id', room_ctrl.getRoom)
router.delete('/deleteRoom/:id', room_ctrl.deleteRoom)
router.put('/updateRoom/:id', room_ctrl.updateRoom)
router.post('/addDeptRoom', room_ctrl.addDeptRoom)
router.delete('/deleteDeptRoom', room_ctrl.deleteDeptRoom)
router.get('/getRoomsByDept/:id', room_ctrl.getRoomsByDept)
router.put('/updateDeptRoom', room_ctrl.updateDeptRoom)

module.exports = router;