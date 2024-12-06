const express = require('express');
const router = express();
const { loadHome, loadRegister, userRegistration, userLogin, loadLogin, loadAllProducts, loadProductDetails,logout, loadUserProfile  } = require('../controller/userController');
const { loadOtp, verifyOtp, resendOtp } = require('../controller/otpController');
const passport = require('passport');
const { successGoogleLogin, failureGoogleLogin } = require('../controller/passportController');
require('../config/passport');

router.set('view engine', 'ejs');
router.set('views', './view/userPages');

router.get('/', loadHome);
router.get('/login', loadLogin);
router.post('/login', userLogin);
router.get('/register', loadRegister);
router.post('/register', userRegistration);
router.get('/otp', loadOtp);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.get('/profile', loadUserProfile);

router.get('/auth/google', passport.authenticate('google', {scope: ['email', 'profile'] }));
router.get('/auth/google/callback', 
    passport.authenticate('google', {failureRedirect: '/failure',
        failureFlash: 'Google authentication failed. Please try again.',
    }),
    successGoogleLogin
);
router.get('/success', successGoogleLogin);
router.get('/failure', failureGoogleLogin);

router.get('/allProducts', loadAllProducts);
router.get('/productDetails/:id', loadProductDetails);

router.get('/logout', logout);

module.exports = router;