require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;
mongoose.connect(uri)
.then(() => console.log('Database connected successfully'))
.catch(err => console.error('Database connection error:', err));

const express = require('express');
const app = express();
const nocache = require("nocache");
const path = require('path');
const userRoute = require('./routes/user-route');
const adminRoute = require('./routes/admin-route');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const passport = require('passport');
const flash = require('connect-flash');

app.use(session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use(nocache());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.set("view engine", "ejs");

app.use('/', userRoute);
app.use('/admin', adminRoute);

app.listen(3005, ()=>{
    console.log(`server running on http://localhost:3005`);
});

