const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const { generateOtp, sendOtpEmail } = require('./otpController');
const productModel = require('../models/productModel');

const loadHome = async (req, res)=>{
   try{
          const user = req.session.userid;
        const products = await productModel.find().limit(4);
        res.render('home', {products, user});
   }catch(error){
        console.log(error);
   };
};

const loadLogin = async (req, res)=>{
     try{
         const message = req.flash('message');
          res.render('login', {message});
     }catch(error){
          console.log(error);
     };
};

const userLogin = async (req, res)=>{
     try {
          const {email, password} = req.body;

          // Basic validation for empty fields
          if(!email || !password){
               return res.status(400).json({error: 'All fields are required'});
          }

         const userData = await User.findOne({email});
         //  console.log(userData);
          
         if(!userData){
          res.status(400).json({error: 'User not found'});
         }

         if(userData.is_blocked){
               res.status(400).json({error: `U can't login now!!`});
         }

         const checkPassword = await bcrypt.compare(password, userData.password);
         console.log(checkPassword)
         // console.log(checkPassword);
         if(checkPassword){

          req.session.userid = userData._id;
          req.session.user = {
               name: userData.name,
               email: userData.email
          }

          res.status(200).json({sucess: true});
         }else{
          res.status(400).json({error: 'Wrong password!.'});
         }

     } catch (error) {
          console.log(error);
     }
};

const loadRegister = async (req, res)=>{
     try {
          res.render('register');
     } catch (error) {
          console.log(error);
     };
};

const userRegistration = async (req, res) => {
     try {
         const { Username, email, password, confirmPassword } = req.body;
         
         // Basic validation for empty fields
         if (!Username || !email || !password || !confirmPassword) {
             return res.status(400).json({ error: "All fields are required." });
         }
 
         // Email validation regex
         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
         if (!emailRegex.test(email)) {
             return res.status(400).json({ error: "Invalid email format." });
         }
 
         // Password strength regex
         const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
         if (!passwordRegex.test(password)) {
             return res.status(400).json({ error: "Password must be at least 8 characters, include an uppercase letter, a lowercase letter, and a number." });
         }
 
         // Check if passwords match
         if (password !== confirmPassword) {
             return res.status(400).json({ error: "Passwords do not match." });
         }
 
         // Check if the email is already registered
         const existingUser = await User.findOne({ email });
         if (existingUser) {
             return res.status(400).json({ error: "Email is already registered." });
         }
 
         // Hash the password
         const saltRounds = 10;
         const hashedPassword = await bcrypt.hash(password, saltRounds);
         
         const otp = generateOtp();
         console.log('otp code:', otp);
         const expireOtp = new Date(Date.now() + 2 * 60 * 1000);

         req.session.userData = {Username, email, password: hashedPassword, otp, expireOtp};
         
         await sendOtpEmail(email, otp);
         
         res.status(200).json({ message: "Registration successful!" });

     } catch (error) {
         console.error("Error during registration:", error);
         res.status(500).json({ error: "An error occurred during registration. Please try again later." });
     }
 };

 const loadUserProfile = async(req, res) => {
     try {
          const user = req.session.userid
          // console.log(user);
          res.render('user-profile', {user});
     } catch (error) {
          console.log(error);
     }
 }


 const loadAllProducts = async (req, res) => {
     try {
          const user = req.session.userid;
          const products = await productModel.find({is_listed: true});
          res.render('product', {products, user});
     } catch (error) {
          console.log(error);
     }
 }
  

 const loadProductDetails = async(req, res) => {
     try {
          const user = req.session.userid ? req.sesssion.userid : null;
          console.log(user.id);
          
          const products = await productModel.find({is_listed: true}).limit(4);
          const {id} = req.params;
          // console.log(id);
          const product = await productModel.findOne({_id: id});
          res.render('product-details', {product, products, user});
     } catch (error) {
          console.log(error);
     }
 }

 const logout = async (req, res) => {
     try {
          req.session.destroy((error) => {
               if(error) {
                    console.log(error);
               } else{ 
                    res.redirect('/');
               }
          });
     } catch (error) {
          console.log(error);
     }
 }

module.exports = {
    loadHome,
    loadLogin,
    userLogin,
    loadRegister,
    userRegistration,
    loadAllProducts,
    loadProductDetails,
    loadUserProfile,
    logout
}