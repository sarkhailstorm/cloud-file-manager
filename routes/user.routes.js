const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const supabase = require('../config/supabase.config');
const fileModel = require('../models/files.models');
const authMiddleWare = require('../middleware/auth');

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Test route
router.get('/test', (req, res) => {
    res.render('register');
});

// Render registration page
router.get('/register', (req, res) => {
    res.render('register');
});

// Render login page
router.get('/login', (req, res) => {
    res.render('login');
});

// Registration route
router.post(
    '/register',
    body('username').trim().isLength({ min: 5 }).withMessage('Username must be at least 5 characters long.'),
    body('email').trim().isEmail().withMessage('Email must be a valid email address.'),
    body('password').trim().isLength({ min: 3 }).withMessage('Password must be at least 3 characters long.'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array(),
                message: 'Invalid Data',
            });
        }

        const { username, email, password } = req.body;

        const hashPassword = await bcrypt.hash(password, 10);

        const newUser = await userModel.create({
            username,
            email,
            password: hashPassword,
        });

        res.redirect('/user/login');
    }
);

// Login route
router.post(
    '/login',
    body('username').isLength({ min: 4 }).withMessage('Username must be at least 4 characters long'),
    body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long'),
    async (req, res) => {
        console.log('Body received:', req.body); 
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array(),
                message: 'Invalid Data',
            });
        }

        const { username, password } = req.body;

        const user = await userModel.findOne({
            username: username,
        });

        if (!user) {
            return res.status(400).json({
                message: 'Username or password is incorrect',
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: 'Username or password is incorrect',
            });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                username: user.username,
            },
            process.env.JWT_SECRET
        );

        res.cookie('token', token);
        res.redirect('/home');
    }
);

// File upload to Supabase
router.post('/upload', authMiddleWare, upload.single('file'), async (req, res) => {


    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const { data, error } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .upload(`${req.file.originalname}-${Date.now()}`, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true,
            });

        if (error) {
            console.error('Supabase Storage Error:', error);
            return res.status(500).send('Error uploading file to Supabase.');
        }

        const { data: publicUrlData } = supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .getPublicUrl(data.path);

        res.json({
            message: 'File uploaded successfully.',
            fileName: req.file.originalname,
            publicUrl: publicUrlData.publicUrl,
        });

        const newFile = await fileModel.create({
            path: data.path,
            originalname: req.file.originalname,
            user: req.user.userId
        })
    
        res.json(newFile);
    } 
    catch (err) {
        console.error('Error:', err);
        res.status(500).send('An error occurred while uploading the file.');
    }
});


module.exports = router;
