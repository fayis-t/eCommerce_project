const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const { generateOtp, sendOtpEmail, transporter } = require('./otpController');
const productModel = require('../models/productModel');
const addressModel = require('../models/addressModel');
const cartModel = require('../models/cart');
const orderModel = require('../models/orderModel');
const categoryModel = require('../models/categoryModel');
const transactionModel = require('../models/transactionModel');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Offer = require('../models/offerModel');
const { application } = require('express');

const loadHome = async (req, res) => {
     try {
          const user = req.session.userid;
          const products = await productModel.find({ is_listed: true }).limit(4).populate('category');

          const activeOffers = await Offer.find({
               status: true,
               expiryDate: {$gte: new Date()}
          });

          const visibleProducts = products.filter(product => {
               return product.is_listed === true && product.category && product.category.is_listed === true;
          });

          const productData = visibleProducts.map(product => {
               let applicableOffer = null;
               let offerPrice = null;

               const productOffer = activeOffers.find(offer => offer.offerType === 'product' && offer.selectItem.equals(product._id));
               const categoryOffer = activeOffers.find(offer => offer.offerType === 'category' && offer.selectItem.equals(product.category._id));

               if(productOffer) applicableOffer = productOffer;
               else if(categoryOffer) applicableOffer = categoryOffer;

               if(applicableOffer){
                    offerPrice = product.price - (product.price * (applicableOffer.discountPercentage / 100));
               }

               return {
                    ...product._doc,
                    offer: applicableOffer,
                    offerPrice,
                    discountPercentage: applicableOffer ? applicableOffer.discountPercentage : 0
               };
          });

          res.render('home', { products: productData, user });
     } catch (error) {
          console.log(error);
     };
};

const loadLogin = async (req, res) => {
     try {
          if (!req.session.userid) {
               const message = req.flash('message');
               res.render('login', { message });
          } else {
               res.redirect('/');
          }
     } catch (error) {
          console.log(error);
     };
};

const userLogin = async (req, res) => {
     try {
          const { email, password } = req.body;

          // Basic validation for empty fields
          if (!email || !password) {
               return res.status(400).json({ error: 'All fields are required' });
          }

          // Email validation regex
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
               return res.status(400).json({ error: "Invalid email format." });
          }

          const userData = await User.findOne({ email });

          if (!userData) {
               res.status(400).json({ error: 'User not found' });
          }

          //     console.log(userData.is_blocked);
          if (userData.is_blocked) {
               res.status(400).json({ error: `U can't login now!!` });
          }

          const checkPassword = await bcrypt.compare(password, userData.password);
          // console.log(checkPassword)

          if (checkPassword) {

               req.session.userid = userData._id;
               req.session.user = {
                    name: userData.name,
                    email: userData.email
               }

               res.status(200).json({ sucess: true });
          } else {
               res.status(400).json({ error: 'Wrong password!.' });
          }

     } catch (error) {
          console.log(error);
     }
};

const loadRegister = async (req, res) => {
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

          req.session.userData = { Username, email, password: hashedPassword, otp, expireOtp };

          await sendOtpEmail(email, otp);

          res.status(200).json({ message: "Registration successful!" });

     } catch (error) {
          console.error("Error during registration:", error);
          res.status(500).json({ error: "An error occurred during registration. Please try again later." });
     }
};

const loadForgetPassword = async (req, res) => {
     try {
          res.render('forgetPassword');
     } catch (error) {
          console.log('error on loading forget passwrod:', error);
          res.status(500).json({ error: 'Failed to load forget password' });
     }
}

const sendEmail = async (req, res) => {
     try {
          const { email } = req.body;

          if (!email) {
               return res.status(404).json({ success: false, message: 'Email is required' });
          }

          // Email validation regex
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
               return res.status(400).json({ success: false,  message: "Invalid email format." });
          }

          const user = await User.findOne({ email });

          if (!user) {
               return res.status(404).json({ success: false, message: 'User with this email does not exist' });
          }

          const resetToken = crypto.randomBytes(8).toString('hex');
          const tokenExpiry = Date.now() + 3600000;
          // console.log(resetToken);
          user.resetPasswordToken = resetToken;
          user.resetPasswordExpires = tokenExpiry;
          await user.save();

          const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
          const mailOptions = {
               from: process.env.EMAIL_USER,
               to: user.email,
               subject: 'Password Reset',
               html: `
                <div style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #2E8B57; text-align: center;">Reset Your Password</h2>
    <p style="font-size: 16px; text-align: center; margin: 20px 0; color: #555;">
        Need to reset your password? Don’t worry, it happens to the best of us. Click the button below to securely reset your password.
    </p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="${resetURL}" 
           style="display: inline-block; padding: 12px 25px; font-size: 16px; font-weight: bold; 
                  color: #fff; background: linear-gradient(to right, #43A047, #2E7D32); text-decoration: none; 
                  border-radius: 8px; transition: background 0.3s ease;">
           Reset Password
        </a>
    </div>
    <p style="font-size: 14px; color: #666; text-align: center;">
        If you didn’t request this, you can safely ignore this email.
    </p>
    <p style="font-size: 14px; text-align: center; color: #777; margin-top: 20px;">
        If you have any questions, feel free to <a href="mailto:admin@gmail.com" style="color: #2E7D32; text-decoration: none;">contact us</a>.
    </p>
</div>

            `,
          };

          await transporter.sendMail(mailOptions);

          res.status(200).json({ success: true, message: 'We have sent link to reset your password. please check your mail.' });

     } catch (error) {
          console.log('error on sending email', error);
          res.status(500).json({ error: 'Failed to send email' });
     }
}

const loadResetPassword = async (req, res) => {
     try {
          const resetToken = req.params.token;
          const user = await User.findOne({
               resetPasswordToken: resetToken,
               resetPasswordExpires: { $gt: Date.now() }
          });

          if(!user){
               return res.status(404).json({ success: false, message: 'Reset password token is invalid or has expired', token:null  });
          }

          res.render('resetPassword', { token: resetToken });
     } catch (error) {
          console.log('error on loading reset password', error);
          res.status(404).json({ error: 'Failed to load reset password' });
     }
}

const resetPassword = async (req, res) => {
     try {
          const { token, newPassword, confirmPassword } = req.body;

          if(!newPassword || !confirmPassword){
               return res.status(404).json({ success: false, message: 'All fields are required', token });
          }

          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
          if (!passwordRegex.test(newPassword)) {
               return res.status(400).json({success: false, message: "Password must be at least 8 characters, include an uppercase letter, a lowercase letter, and a number." });
          }

          if(newPassword !== confirmPassword){
               return res.status(404).json({ success: false, message: `Password dosn't match!`, token });
          }

          const user = await User.findOne({
               resetPasswordToken: token,
               resetPasswordExpires: { $gt: Date.now() }
          });

          if(!user){
               return res.status(404).json({ success: false, message: `Invalid token or token has expired, please try again.`, token });
          }

          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

          user.password = hashedPassword;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;
          await user.save();

          res.status(200).json({ success: true, message: `Reset password successfully` });

     } catch (error) {
          console.log('error on resetting password', error);
          res.status(404).json({ error: 'Failed to reset password' });
     }
}

const loadUserProfile = async (req, res) => {
     try {
          const user = req.session.userid;
          const userData = await User.findById(user);
          const addresses = await addressModel.find({ userId: user });
          const orders = await orderModel.find({ userId: user });
          const transactions = await transactionModel.find({ userId: user });
          // console.log(orders);
          if (!userData.is_blocked) {
               res.render('user-profile', { user, userData, addresses, orders, transactions });
          } else {
               res.redirect('/login');
          }
     } catch (error) {
          console.log(error);
     }
}

const editProfile = async (req, res) => {
     try {
          const userId = req.session.userid;
          const userData = await User.findById(userId);
          const { name } = req.body;
          // console.log(userData);
          userData.name = name;
          const saved = await userData.save();

          if (saved) {
               res.status(200).json({ success: true });
          } else {
               res.status(400).json({ success: false });
          }

     } catch (error) {
          console.log(error);
     }
}

const addAddress = async (req, res) => {
     try {
          const userId = req.session.userid;
          const { name, address, country, city, state, pincode, mobile } = req.body;
          const addressData = await new addressModel({
               userId: userId,
               name: name,
               address: address,
               country: country,
               city: city,
               state: state,
               pincode: pincode,
               mobile: mobile
          });
          // console.log(addressData);

          const saved = await addressData.save();
          if (saved) {
               res.status(200).json({ success: true });
          } else {
               res.status(400).json({ success: false });
          }

     } catch (error) {
          console.log(error);
     }
}

const editAddress = async (req, res) => {
     try {
          const addressId = req.params.id;
          const addressData = await addressModel.findById(addressId);
          const { name, address, country, city, state, pincode, mobile } = req.body;

          addressData.name = name;
          addressData.address = address;
          addressData.country = country;
          addressData.city = city;
          addressData.state = state;
          addressData.pincode = pincode;
          addressData.mobile = mobile;

          const saved = await addressData.save();
          if (saved) {
               res.status(200).json({ success: true });
          } else {
               res.status(400).json({ success: false });
          }
     } catch (error) {
          console.log(error);
     }
}

const changePassword = async (req, res) => {
     try {
          const userId = req.session.userid;
          const userData = await User.findById(userId);
          const { currentPassword, newPassword, conformPassword } = req.body;
          // console.log(currentPassword, newPassword, conformPassword);

          if (newPassword !== conformPassword) {
               return res.status(400).json({ message: 'New password and Re-enter password not match!' });
          }

          const checkPassword = await bcrypt.compare(currentPassword, userData.password);
          // console.log(checkPassword);

          if (checkPassword) {
               const saltRounds = 10;
               const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
               userData.password = hashedPassword;

               const saved = await userData.save();
               if (saved) {
                    res.status(200).json({ success: true });
               } else {
                    res.status(400).json({ success: false });
               }
          } else {
               res.status(404).json({ message: 'Wrong current password!!' });
          }
     } catch (error) {
          console.log(error);
     }
}

const loadCart = async (req, res) => {
     try {
          const user = req.session.userid;

          if (!user) return res.redirect('/login');

          let cartData = await cartModel.findOne({ userId: user })
               .populate({
                    path: 'items.productId',
                    select: ' _id name price images stock category',
               });

          if(!cartData){
               return res.render('shop-cart', { user, cartData:{items: [] }, totalPrice: 0, cartProducts: [] });
          }

          const activeOffers = await Offer.find({
               status: true,
               expiryDate: { $gte: new Date() }
          });

          let totalPrice = 0;

          const cartProducts = cartData.items.map(item => {
               const product = item.productId;
               let offerPrice = null;
               let applicableOffer = null;

               const productOffer = activeOffers.find(offer => offer.offerType === 'product' && offer.selectItem.equals(product._id));
               
               const categoryOffer = activeOffers.find(offer => offer.offerType === 'category' && product.category && offer.selectItem.equals(product.category._id));

               if (productOffer && categoryOffer) {
                    applicableOffer = productOffer.discountPercentage > categoryOffer.discountPercentage ? productOffer : categoryOffer;
                } else {
                    applicableOffer = productOffer || categoryOffer;
                }
               
               if(applicableOffer){
                    offerPrice = product.price - (product.price * (applicableOffer.discountPercentage / 100));
               }

               const finalPrice = offerPrice !== null ? offerPrice : product.price;

               totalPrice += (item.quantity || 1) * finalPrice;

               return {
                    ...item._doc,
                    offerPrice,
                    discountPercentage: applicableOffer ? applicableOffer.discountPercentage : 0
               }
          });

          cartData = cartData.toObject();
          
          // const totalPrice = cartData.items.reduce((acc, item) => {
          //      const itemTotal = item.productId.price * (item.quantity || 1); // Default quantity to 1 if not present
          //      return acc + itemTotal;
          // }, 0);
          //  console.log(totalPrice);

          // console.log('here is the cartProducts: ',JSON.stringify(cartProducts, null, 2));
          cartData.items = cartProducts;
          // console.log('cart data aftere:', JSON.stringify(cartData, null, 2));

          res.render('shop-cart', { user, cartData, totalPrice });
     } catch (error) {
          console.log(error);
          res.status(500).send('Error loading cart');
     }
};                            


const deleteAddress = async (req, res) => {
     try {
          const addressId = req.params.id;
          const deleted = await addressModel.findByIdAndDelete(addressId);
          if (deleted) {
               res.status(200).json({ success: true });
          } else {
               res.status(400).json({ success: false });
          }
     } catch (error) {
          console.log(error);
     }
}

const loadAllProducts = async (req, res) => {
     try {
          const user = req.session.userid;
          const products = await productModel.find({ is_listed: true }).populate('category');
          const categories= await categoryModel.find({ is_listed: true });
          
          const activeOffers = await Offer.find({
               status: true,
               expiryDate: {$gte: new Date()}
          });

          const visibleProducts = products.filter(product => {
               return product.is_listed === true && product.category && product.category.is_listed === true;
          });
          
          const productData = visibleProducts.map(product => {
               let applicableOffer = null;
               let offerPrice = null;

               const productOffer = activeOffers.find(offer => offer.offerType === 'product' && offer.selectItem.equals(product._id));
               const categoryOffer = activeOffers.find(offer => offer.offerType === 'category' && offer.selectItem.equals(product.category._id));

               if(productOffer) applicableOffer = productOffer;
               else if(categoryOffer) applicableOffer = categoryOffer;

               if(applicableOffer){
                    offerPrice = product.price - (product.price * (applicableOffer.discountPercentage / 100));
               }

               return {
                    ...product._doc,
                    offer: applicableOffer,
                    offerPrice,
                    discountPercentage: applicableOffer ? applicableOffer.discountPercentage : 0
               };
               
          });
          res.render('product', { products: productData, user, categories });
     } catch (error) {
          console.log(error);
     }
}


const loadFilterProducts = async (req, res) => {
     try {
          const { category, sort, search } = req.query;
          let query = { is_listed: true };

          // Filter by category
          if (category && category !== '*') {
               const categoryDoc = await categoryModel.findOne({ name: category });
               if (categoryDoc) {
                    query.category = categoryDoc._id;
               } else {
                    return res.status(400).json({ error: 'Invalid category name' });
               }
          }

          // Filter by search
          if (search) {
               query.name = { $regex: search, $options: 'i' }; 
          }

          // Fetch active offers
          const activeOffers = await Offer.find({ 
               status: true,
               expiryDate: {$gte: new Date()}
          });

          // Fetch products from the database
          let productsQuery = productModel.find(query).populate('category');

          // Apply sorting at the database level
          if (sort) {
               if (sort === 'price:-low to high') {
                    productsQuery = productsQuery.sort({ price: 1 }); // Ascending
               } else if (sort === 'price:-high to low') {
                    productsQuery = productsQuery.sort({ price: -1 }); // Descending
               } else if (sort === 'popularity') {
                    productsQuery = productsQuery.sort({ sales: -1 }); // Descending
               } else if (sort === 'new-arrivals') {
                    productsQuery = productsQuery.sort({ createdAt: -1 }); // Most recent
               } else if (sort === 'default') {
                    productsQuery = productsQuery.sort();
               }
          }

          const products = await productsQuery.exec();

          const productData = products.map(product =>{
               let applicableOffer = null;
               let offerPrice = null;

               const productOffer = activeOffers.find(offer => offer.offerType === 'product' && offer.selectItem.equals(product._id));
               const categoryOffer = activeOffers.find(offer => offer.offerType === 'category' && offer.selectItem.equals(product.category._id));

               if(productOffer) applicableOffer = productOffer;
               else if(categoryOffer) applicableOffer = categoryOffer;

               if(productOffer){
                    applicableOffer = productOffer;
               }else if(categoryOffer){
                    applicableOffer = categoryOffer;
               }

               if(applicableOffer){
                    offerPrice = product.price - (product.price * (applicableOffer.discountPercentage / 100));
               }

               return {
                    ...product._doc,
                    offer: applicableOffer ? applicableOffer : null,
                    offerPrice: offerPrice !== null ? offerPrice : product.price,
                    discountPercentage: applicableOffer ? applicableOffer.discountPercentage : 0
               }
          });

          res.json({ products, productData });

     } catch (error) {
          console.error('Error on loading filter products:', error);
          res.status(500).json({ error: 'Failed to load products' });
     }
};


const loadProductDetails = async (req, res) => {
     try {
          const user = req.session.userid ? req.session.userid : null;
          const products = await productModel.find({ is_listed: true }).limit(4);
          const { id } = req.params;
          const product = await productModel.findOne({ _id: id }).populate('category');

          const activeOffers = await Offer.find({
               status: true,
               expiryDate: {$gte: new Date()}
          });

          let applicableOffer = null;
          let offerPrice = null;

          const productOffer = activeOffers.find(offer => offer.offerType === 'product' && offer.selectItem.equals(product._id));
          const categoryOffer = activeOffers.find(offer => offer.offerType === 'category' && offer.selectItem.equals(product.category._id));

          if(productOffer) applicableOffer = productOffer;
          else if(categoryOffer) applicableOffer = categoryOffer;

          if(applicableOffer){
               offerPrice = product.price - (product.price * (applicableOffer.discountPercentage / 100));
          }

          const relatedProducts = await productModel.find({
               category: product.category._id,
               _id: { $ne: product._id }
          }).limit(4);

          res.render('product-details', {
               product: {
                    ...product._doc,
                    offerPrice,
                    discountPercentage: applicableOffer ? applicableOffer.discountPercentage : 0
               },
               offer: applicableOffer,
               products: relatedProducts, user });
     } catch (error) {
          console.log(error);
     }
}

const logout = async (req, res) => {
     try {   
          // console.log(req.session.userid);
          req.session.userid = null;
          res.redirect('/');
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
     loadForgetPassword,
     sendEmail,
     loadResetPassword,
     resetPassword,
     loadAllProducts,
     loadFilterProducts,
     loadProductDetails,
     loadUserProfile,
     editProfile,
     addAddress,
     editAddress,
     changePassword,
     deleteAddress,
     loadCart,
     logout
}