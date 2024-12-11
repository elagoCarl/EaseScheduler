const express = require('express');
const progYrSec_ctrl = require('../controllers/progYrSec_ctrl');
const router = express.Router();

router.post('/addProgYrSec', progYrSec_ctrl.addProgYrSec);
router.get('/getAllProgYrSec', progYrSec_ctrl.getAllProgYrSec)
router.get('/getProgYrSec/:id', progYrSec_ctrl.getProgYrSec)
router.patch('/updateProgYrSec/:id', progYrSec_ctrl.updateProgYrSec);
router.delete('/deleteProgYrSec/:id', progYrSec_ctrl.deleteProgYrSec);
router.get('/getAllProgYrSecByProgram/:id', progYrSec_ctrl.getAllProgYrSecByProgram)

module.exports = router;