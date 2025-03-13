const nodemailer = require('nodemailer');
require('dotenv').config();
const User = require('../models/userModel');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const generateOtp = () => {
    return Math.floor(1000 + Math.random() * 9000);
};

const sendOtpEmail = async(email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP Code is ${otp}, It expires in 2 minutes.`
    };

    await transporter.sendMail(mailOptions);
}

const loadOtp = async (req, res) => {
    try {
        const userData = req.session.userData ? req.session.userData : null ;
        
        if(userData){
            res.render('verify-otp', {email:req.session.userData.email});
        }else{
            res.redirect('/');
        }
    } catch (error) {
        console.log(error);
    }
}

const verifyOtp = async (req, res) => {
    try {
        const userData = req.session.userData;
        
        const {email,otp} = req.body;

        const expireOtp = new Date(userData.expireOtp).getTime();
        if(userData.otp == otp && userData.email === email && expireOtp > Date.now()){
            const user = new User({
                name: userData.Username,
                email: userData.email,
                password: userData.password,
                is_verified: true
            });
            await user.save();
            req.session.userData = null;

            res.json({success: true});
        }else{
            res.json({success: false});
        }

    } catch (error) {
        console.log(error);
    }
}


const resendOtp = async (req, res)=> {
    try {
        const email = req.session.userData.email;
        const otp = generateOtp();
        console.log('resend otp: ',otp);
        
        const expireOtp = new Date(Date.now() + 2 * 60 * 1000);
        await sendOtpEmail(email, otp);
        req.session.userData.otp = otp;
        req.session.userData.expireOtp = expireOtp;
        res.json({ success: true });


    } catch (error) {
        console.log(error);
    }
}


module.exports = {
    loadOtp,
    generateOtp,
    sendOtpEmail,
    verifyOtp,
    resendOtp,
    transporter
}
