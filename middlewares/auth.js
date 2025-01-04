const User = require('../models/userModel');

const is_login = async (req, res, next) => {
    const userId = req.session.userid;
    const userData = await User.findOne({_id: userId});
    if(userId && !userData.is_blocked){
        return next();
    }else{
        res.redirect('/login');
    }
}

const ensureAdmin = async (req, res, next) => {
    if(req.session.adminid){
        return next();
    }else{
        res.redirect('/admin');
    }
}

module.exports = {
    is_login,
    ensureAdmin
}