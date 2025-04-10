const express = require('express');
const accArchive_ctrl = require('../controllers/accArchive_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')
router.use(requireAuth)

router.get('/test', (req, res) => res.status(200).json({ message: "Gumagana yung endpoint" }));
router.post('/archiveAccount/:id', accArchive_ctrl.archiveAccount)
router.get('/getAllArchivedAccounts', accArchive_ctrl.getAllArchivedAccounts)

module.exports = router;