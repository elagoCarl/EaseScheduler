const express = require('express')
const profStatus_ctrl = require('../controllers/profStatus_ctrl')
const router = express.Router()
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.get('/getProfStatus/:id', profStatus_ctrl.getStatus)
router.get('/getAllStatus', profStatus_ctrl.getAllStatus)
router.post('/addProfStatus', profStatus_ctrl.addStatus)
router.put('/updateProfStatus/:id', profStatus_ctrl.updateStatus)
router.delete('/deleteProfStatus/:id', profStatus_ctrl.deleteStatus)

module.exports = router