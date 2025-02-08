const express = require('express');
const router = express();
const { loadHome, loadRegister, userRegistration, userLogin, loadLogin, loadAllProducts, loadProductDetails,logout, loadUserProfile, editProfile, addAddress, editAddress, deleteAddress, loadCart, changePassword, loadFilterProducts, loadForgetPassword, sendEmail, loadResetPassword, resetPassword  } = require('../controller/userController');
const { loadOtp, verifyOtp, resendOtp } = require('../controller/otpController');
const passport = require('passport');
const { successGoogleLogin, failureGoogleLogin } = require('../controller/passportController');
const { is_login } = require('../middlewares/auth');
const { addToCart, removeItem, loadCheckout, updateCart } = require('../controller/cartController');
const { placeOrder, loadOrderList, orderList, loadOrderDetails, cancelOrder, confirmPayment, returnOrder, continuePayment } = require('../controller/orderController');
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

router.get('/forget-password', loadForgetPassword);
router.post('/send-email', sendEmail);
router.get('/reset-password/:token', loadResetPassword);
router.post('/resetPassword', resetPassword);

router.get('/profile', is_login, loadUserProfile);
router.post('/editProfile',is_login, editProfile);
router.post('/addAddress',is_login, addAddress);
router.post('/updateAddress/:id',is_login, editAddress);
router.post('/deleteAddress/:id', is_login, deleteAddress);
router.post('/changePassword', is_login, changePassword);

router.get('/shopingCart',is_login, loadCart);
router.post('/addToCart', addToCart);
router.post('/deleteItem', is_login, removeItem);
router.post('/updateCart', is_login, updateCart);

router.get('/checkout', is_login, loadCheckout);
router.post('/placeOrder', is_login, placeOrder);
router.post('/confirm-payment', is_login, confirmPayment);

router.get('/orderList', is_login, orderList);
router.get('/order-details/:id', is_login, loadOrderDetails);
router.post('/cancelOrder', is_login, cancelOrder);
router.post('/returnOrder', is_login, returnOrder);
router.post('/continuePayment', is_login, continuePayment);

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
router.get('/products', loadFilterProducts);
router.get('/productDetails/:id', loadProductDetails);

router.get('/logout', logout);

module.exports = router;