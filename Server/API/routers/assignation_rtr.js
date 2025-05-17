const express = require('express');
const assignation_ctrl = require('../controllers/assignation_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.post('/addAssignation', assignation_ctrl.addAssignation);
router.get('/getAllAssignations', assignation_ctrl.getAllAssignations);
router.get('/getAssignation/:id', assignation_ctrl.getAssignation);
router.get('/getAllAssignationsByDept/:id', assignation_ctrl.getAllAssignationsByDept);
router.get('/getAllAssignationsByDeptInclude/:id', assignation_ctrl.getAllAssignationsByDeptInclude);
router.put('/updateAssignation/:id', assignation_ctrl.updateAssignation);
router.delete('/deleteAssignation/:id', assignation_ctrl.deleteAssignation);
router.get('/getSchedulableAssignationsByDept/:id', assignation_ctrl.getSchedulableAssignationsByDept)
router.get('/getAllAssignations', assignation_ctrl.getAllAssignations);
module.exports = router;
