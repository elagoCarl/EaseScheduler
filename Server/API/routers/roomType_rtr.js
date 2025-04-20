const express = require('express');
const roomType_ctrl = require('../controllers/roomType_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.get('/getAllRoomTypes', roomType_ctrl.getAllRoomTypes)
router.get('/getRoomType/:id', roomType_ctrl.getRoomType)
router.post('/addRoomType', roomType_ctrl.addRoomType)
router.put('/updateRoomType/:id', roomType_ctrl.updateRoomType)
router.delete('/deleteRoomType/:id', roomType_ctrl.deleteRoomType)

module.exports = router;