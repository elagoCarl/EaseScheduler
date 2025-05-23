const express = require('express');
const account_ctrl = require('../controllers/account_ctrl');
const router = express.Router();
const { requireAuth } = require('../controllers/authMiddleware')

// puclic routes
router.post('/loginAccount', account_ctrl.loginAccount);
router.post('/logoutAccount', account_ctrl.logoutAccount)
router.post('/forgotPass', account_ctrl.forgotPass)
router.post('/verifyAccountOTP', account_ctrl.verifyAccountOTP);
router.get('/getCurrentAccount', account_ctrl.getCurrentAccount)//getCurrentAccount without requireAuth kasi meron ng requireAuth sa getCurrentAccount sa account_ctrl


// protected routes authenticated with JWT token
router.post('/addAccount', requireAuth, account_ctrl.addAccount);
router.get('/getAccountById/:id', requireAuth, account_ctrl.getAccountById)
router.get('/getAllAccounts', requireAuth, account_ctrl.getAllAccounts)
router.post('/sendOTPverification', requireAuth, account_ctrl.sendOTPVerificationEmail)
router.put('/changePassword', requireAuth, account_ctrl.changePassword)
router.get('/test', (req, res) => res.status(200).json({ message: "Test endpoint works" }));



module.exports = router;