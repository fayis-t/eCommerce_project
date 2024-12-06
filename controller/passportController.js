const successGoogleLogin = async (req, res) => {
    try {
        if(!req.user){
            return res.redirect('/failure');
        }

        if(req.user.is_blocked){
            req.flash('message', 'Google authentication failed. Please try again.');
           return res.redirect('/login');
        }

        req.session.userid = req.user._id;
        res.redirect('/');
    } catch (error) {
        console.log(error.message);
        res.redirect('/failure');
    }
}

const failureGoogleLogin = (req, res) => {
    try {
        res.redirect('/login');
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    successGoogleLogin,
    failureGoogleLogin
}