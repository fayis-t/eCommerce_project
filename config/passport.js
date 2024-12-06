const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const User = require('../models/userModel');

// Serialize user to the session
passport.serializeUser((user, done) => { 
    done(null, user._id); 
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.error('Error during deserialization:', error);
        done(error, null);
    }
});

// Configure Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL:  'http://localhost:3005/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value; // Extract email from profile

                // Check if user exists
                let user = await User.findOne({ email });
                
                if (!user) {
                    user = new User({
                        name: profile.displayName,
                        email,
                        is_verified: true,
                        is_admin: false,
                    });
                    user = await user.save(); 
                }

                return done(null, user);
            } catch (error) {
                console.error('Error in GoogleStrategy:', error);
                return done(error, null);
            }
        }
    )
);

module.exports = passport;
