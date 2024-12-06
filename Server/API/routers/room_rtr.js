const express = require('express');
const room_ctrl = require('../controllers/room_ctrl');
const router = express.Router();

router.post('/addRoom', room_ctrl.addRoom)
router.get('/getAllRoom', room_ctrl.getAllRoom)
router.get('/getRoom/:id', room_ctrl.getRoom)

module.exports = router;