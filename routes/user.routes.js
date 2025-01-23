const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const supabase = require('../config/supabase.config');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Test Route
router.get('/test', (req, res) => {
    res.send('User test route');
});

// Register Route
router.post('/register',
    body('username').trim().isLength({ min: 5 }),
    body('email').trim().isEmail().isLength({ min: 12 }),
    body('password').trim().isLength({ min: 3 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array(),
                message: "Invalid Data"
            });
        }

        const { username, email, password } = req.body;

        const hashPassword = await bcrypt.hash(password, 10);

        const newUser = await userModel.create({
            username,
            email,
            password: hashPassword
        });

        res.json(newUser);
    }
);

// Login Route
router.post('/login',
    body('username').trim().isLength({ min: 4 }),
    body('password').trim().isLength({ min: 5 }),
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array(),
                message: 'Invalid Data'
            });
        }

        const { username, password } = req.body;

        const user = await userModel.findOne({ username });

        if (!user) {
            return res.status(400).json({
                message: 'Username or password is incorrect'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: 'Username or password is incorrect'
            });
        }

        const token = jwt.sign({
            userId: user._id,
            email: user.email,
            username: user.username
        }, process.env.JWT_SECRET);

        res.cookie('token', token);

        res.send('Logged In');
    }
);

// File Upload to Supabase Route
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    try {
        const { data, error } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .upload(`${Date.now()}-${req.file.originalname}`, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true,
            });

        if (error) {
            console.error("Supabase Storage Error:", error);
            return res.status(500).send("Error uploading file to Supabase.");
        }

        const { data: publicUrlData } = supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .getPublicUrl(data.path);

        res.json({
            message: "File uploaded successfully.",
            fileName: req.file.originalname,
            publicUrl: publicUrlData.publicUrl,
        });
    }
    catch (err) {
        console.error("Error:", err);
        res.status(500).send("An error occurred while uploading the file.");
    }
});

module.exports = router;
