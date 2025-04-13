const express = require('express');
const profAvail_ctrl = require('../controllers/profAvail_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.post('/addProfAvail', profAvail_ctrl.addProfessorAvail);
router.get('/getProfAvailByProf/:id', profAvail_ctrl.getProfAvailByProf)
router.get('/getProfAvail/:id', profAvail_ctrl.getProfessorAvail)
router.put('/updateProfAvail/:id', profAvail_ctrl.updateProfessorAvail);
router.delete('/deleteProfAvail/:id', profAvail_ctrl.deleteProfessorAvail);

module.exports = router;