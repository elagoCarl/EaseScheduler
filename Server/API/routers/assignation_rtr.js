const express = require('express');
const assignation_ctrl = require('../controllers/assignation_ctrl');
const router = express.Router();

router.post('/addAssignation', assignation_ctrl.addAssignation);
router.get('/getAllAssignations', assignation_ctrl.getAllAssignations);
router.get('/getAssignation/:id', assignation_ctrl.getAssignation);
router.put('/updateAssignation/:id', assignation_ctrl.updateAssignation);
router.delete('/deleteAssignation/:id', assignation_ctrl.deleteAssignation);

module.exports = router;
