const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const { generateOtp, sendOtpEmail } = require('./otpController');
const productModel = require('../models/productModel');
const addressModel = require('../models/addressModel');
const cartModel = require('../models/cart');
const orderModel = require('../models/orderModel');
const categoryModel = require('../models/categoryModel');
const mongoose = require('mongoose');

const loadHome = async (req, res) => {
     try {
          const user = req.session.userid;
          const products = await productModel.find().limit(4);
          res.render('home', { products, user });
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

          const userData = await User.findOne({ email });

          // console.log(userData);

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

const loadUserProfile = async (req, res) => {
     try {
          const user = req.session.userid;
          const userData = await User.findById(user);
          const addresses = await addressModel.find({ userId: user });
          const orders = await orderModel.find({userId: user});
          // console.log(orders);
          if (!userData.is_blocked) {
               res.render('user-profile', { user, userData, addresses, orders });
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

          if(newPassword !== conformPassword){
              return res.status(400).json({message: 'New password and Re-enter password not match!'});
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
         const cartData = await cartModel.findOne({ userId: user })
             .populate({
                 path: 'items.productId',
                 select: ' _id name price images stock',
             });
             const totalPrice = cartData.items.reduce((acc, item) => {
               const itemTotal = item.productId.price * (item.quantity || 1); // Default quantity to 1 if not present
               return acc + itemTotal;
           }, 0);
          //  console.log(totalPrice);
     
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
          const products = await productModel.find({ is_listed: true });
          res.render('product', { products, user });
     } catch (error) {
          console.log(error);
     }
}


const loadFilterProducts = async (req, res) => {
     try {   
         console.log(req.query);
         const { category, sort, search } = req.query;
         let query = {};
 
         // Filter by category
         if (category && category !== '*') {
             const categoryDoc = await categoryModel.findOne({ name: category });
             console.log(categoryDoc);
             if (categoryDoc) {
                 query.category = categoryDoc._id;
             } else {
                 return res.status(400).json({ error: 'Invalid category name' });
             }
         }
 
         // Filter by search
         if (search) {
             query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
         }
 
         // Fetch products from the database
         let productsQuery = productModel.find(query);
 
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
         res.json({ products });
 
     } catch (error) {
         console.error('Error on loading filter products:', error);
         res.status(500).json({ error: 'Failed to load products' });
     }
 };




const loadProductDetails = async (req, res) => {
     try {
          const user = req.session.userid ? req.session.userid : null;
          // console.log(user);

          const products = await productModel.find({ is_listed: true }).limit(4);
          const { id } = req.params;
          // console.log(id);
          const product = await productModel.findOne({ _id: id });
          
          res.render('product-details', { product, products, user });
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