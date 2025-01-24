const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const userRouter = require('./routes/user.routes');
const indexRouter = require('./routes/index.routes');
const connectToDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to the database
connectToDB();

const path = require('path');
app.set('views', path.join(__dirname, 'views'));

// Set view engine
app.set('view engine', 'ejs');

// Middleware configuration
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser()); 

// Routes
app.use('/', indexRouter);
app.use('/user', userRouter);
app.get('/', (req, res) => {
    res.render('register');
})

// Start server
app.listen(3000, () => {
    console.log('Server is running on port 3000.');
});