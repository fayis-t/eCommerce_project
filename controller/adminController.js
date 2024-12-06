const bcrypt = require('bcrypt');
const Admin = require('../models/userModel');
const Users = require('../models/userModel')

const loadLogin = async (req, res) => {
    try {
        if(req.session.adminid){
            res.redirect('/admin/dashboard');
        }
        res.render('login');
    } catch (error) {
        console.log(error);
    }
};

const adminLogin = async (req, res) => {
    try {
        
        const {email, password} = req.body;

        // Basic validation for empty fields
        if(!email || !password){
            return res.status(400).json({error: 'All fields are required'})
        }

        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            return res.status(400).json({error: 'Invalid email format.'});
        }

        //Password strength regex
        const passwordRegex =  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ error: 'Invalid password'});
        }

        const adminData = await Admin.findOne({email, is_admin: true});
        // console.log(adminData);
        if(adminData){
            const checkPassword = await bcrypt.compare(password, adminData.password);
        if(checkPassword){
            req.session.adminid = adminData._id;
            req.session.admin = {
                email: adminData.email
            }

            res.status(200).json({success: true});
        }else{
            res.status(400).json({error: 'Invalid password'});
        }
        }else{
            res.status(404).json({success: false});
        }

    } catch (error) {
        console.log(error);
    }
}

const loadDashboard = async (req, res) => {
    try {
        res.render('dashboard');
    } catch (error) {
        console.log(error);
    }
}

const loadUserList = async (req, res) => {
    try {
        const userDatas = await Users.find({is_admin: false}); 
        // console.log(userDatas);
        res.render('users-list', { users: userDatas });
    } catch (error) {
        console.log(error);
    }
}

const blockUser = async (req, res) => {
    try {
        const {id} = req.query;
        // console.log(req.query);
        const user = await Users.findOne({_id: id});
        // console.log(user);

        if(!user){
            return res.status(400).json({ success: true, message: 'User not found!' });
        }

        if(user.is_blocked){
            user.is_blocked = false;
        }else{
            user.is_blocked = true;
        }

        const save = await user.save();
        if(save){
            res.send({ success: true });
        }else{
            res.send({ success: false });
        }

    } catch (error) {
        console.log(error);
    }
}


module.exports = {
    loadLogin,
    adminLogin,
    loadDashboard,
    loadUserList,
    blockUser
}