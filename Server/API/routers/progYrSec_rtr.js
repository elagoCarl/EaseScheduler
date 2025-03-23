const express = require('express');
const progYrSec_ctrl = require('../controllers/progYrSec_ctrl');
const router = express.Router();

router.post('/addProgYrSec', progYrSec_ctrl.addProgYrSec);
router.get('/getAllProgYrSec', progYrSec_ctrl.getAllProgYrSec)
router.get('/getProgYrSec/:id', progYrSec_ctrl.getProgYrSec)
router.put('/updateProgYrSec/:id', progYrSec_ctrl.updateProgYrSec);
router.delete('/deleteProgYrSec/:id', progYrSec_ctrl.deleteProgYrSec);
router.get('/getAllProgYrSecByProgram/:id', progYrSec_ctrl.getAllProgYrSecByProgram)
router.get('/getProgYrSecByDept/:id', progYrSec_ctrl.getProgYrSecByDept)
router.post('/getProgYrSecByCourse', progYrSec_ctrl.getProgYrSecByCourse)

module.exports = router;