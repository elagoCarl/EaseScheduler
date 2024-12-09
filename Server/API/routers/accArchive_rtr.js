const express = require('express');
const accArchive_ctrl = require('../controllers/accArchive_ctrl');
const router = express.Router();

router.get('/test', (req, res) => res.status(200).json({ message: "Gumagana yung endpoint" }));
router.post('/archiveAccount/:id', accArchive_ctrl.archiveAccount)

module.exports = router;