const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator')
const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer  = require('multer')

router.get('/test', (req, res) => {
    res.send('User test route');
})

router.get('/register', (req, res) => {
    res.render("register");
})

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads');
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  })

  const upload = multer({ storage: storage });

  router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    res.json({
        Message: `File Uploaded Successfully`,
        FileName: req.file
    });
});


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
            })
        }

        const { username, email, password } = req.body;

        const hashPassword = await bcrypt.hash(password, 10);

        const newUser = await userModel.create({
            username,
            email,
            password: hashPassword
        })

        res.json(newUser);
    })

router.get('/login', (req, res) => {
    res.render("login");
})

router.post('/login',
    body('username').trim().isLength({ min: 4 }),
    body('password').trim().isLength({ min: 5 }),
    async (req, res) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array(),
                message: 'Invalid Data'
            })
        }

        const { username, password } = req.body;

        const user = await userModel.findOne({
            username: username,
        })

        if (!user) {
            return res.status(400).json({
                message: 'Username or password is incorrect'
            })
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: 'Username or password is incorrect'
            })
        }

        const token = jwt.sign({
            userId: user._id,
            email: user.email,
            username: user.username
        },
            process.env.JWT_SECRET,
        )

        res.cookie('token', token)

        res.send('Logged In')
    }
)

module.exports = router; 



