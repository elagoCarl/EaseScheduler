const express = require('express');
const account_ctrl = require('../controllers/account_ctrl');
const router = express.Router();

router.post('/addAccount', account_ctrl.addAccount);
router.post('/loginAccount', account_ctrl.loginAccount);
router.get('/getAccountById/:id', account_ctrl.getAccountById)
router.get('/getAllAccounts', account_ctrl.getAllAccounts)
router.post('/sendOTPverification', account_ctrl.sendOTPVerificationEmail)
router.post('/verifyAccountOTP', account_ctrl.verifyAccountOTP);
router.put('/changePassword', account_ctrl.changePassword)
router.post('/forgotPass', account_ctrl.forgotPass)
router.get('/test', (req, res) => res.status(200).json({ message: "Test endpoint works" }));



module.exports = router;