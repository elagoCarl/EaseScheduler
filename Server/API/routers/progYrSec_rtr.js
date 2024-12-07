const express = require('express');
const progYrSec_ctrl = require('../controllers/progYrSec_ctrl');
const router = express.Router();

router.post('/addProgYrSec', progYrSec_ctrl.addProgYrSec);
router.get('/getAllProgYrSec', progYrSec_ctrl.getAllProgYrSec)
router.get('/getProgYrSec/:id', progYrSec_ctrl.getAllProgYrSec)
router.patch('/updateProgYrSec/:id', progYrSec_ctrl.updateProgYrSec);
router.delete('/deleteProgYrSec/:id', progYrSec_ctrl.deleteProgYrSec);

module.exports = router;