const User = require('../models/userModel');

const is_login = async (req, res, next) => {
    const user = req.session.userid;
    const userData = await User.findOne({_id: id});
    if(user && !userData.is_blocked){
        return next();
    }else{
        req.redirect('/login');
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