const express = require('express');
const profAvailSched_ctrl = require('../controllers/profAvailSched_ctrl');
const router = express.Router();

router.post('/addProfAvailSched', profAvailSched_ctrl.addProfAvailSched);
router.get('/getAllProfAvailSched', profAvailSched_ctrl.getAllProfAvailSched)
router.get('/getProfAvailSched/:id',profAvailSched_ctrl.getProfAvailSched)
router.patch('/updateProfAvailSched/:id', profAvailSched_ctrl.updateProfAvailSched);
router.delete('/deleteProfAvailSched/:id', profAvailSched_ctrl.deleteProfAvailSched);

module.exports = router;