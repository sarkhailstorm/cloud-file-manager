const express = require('express');
const authMiddleWare = require('../middleware/auth');
const fileModel = require('../models/files.models');
const supabase = require('../config/supabase.config');

const router = express.Router();

router.get('/home', authMiddleWare, async (req, res) => {
    const userFiles = await fileModel.find({
        user: req.user.userId
    })
    console.log(userFiles);
    res.render('home', {
        files: userFiles
    });
})

router.get('/download/:path', authMiddleWare, async (req, res) => {
    const loggedInUserId = req.user.userId;
    const path = req.params.path;

    const file = await fileModel.findOne({
        user: loggedInUserId,
        path: path
    });

    if (!file) {
        return res.status(401).json({
            message: 'Unauthorized or file not found'
        });
    }

    const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .createSignedUrl(path, 300);

    if (error) {
        return res.status(500).json({ message: 'Error generating signed URL', error });
    }
    

    res.redirect(data.signedUrl);
});

router.get('/delete/:path', authMiddleWare, async (req, res) => {
    const loggedInUserId = req.user.userId;
    const path = req.params.path;

    try {
        const file = await fileModel.findOne({
            user: loggedInUserId,
            path: path
        })
    
        if (!file) {
            return res.status(404).json({
                message: "File not found or unauthorized."
            })
        }
        const { data, error } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .remove([path]);
        
        if (error) {
            return res.status(500).json({
                message: 'Error deleting file from storage.', error
            })
        }
        
        await fileModel.deleteOne({path: path});
    
        res.redirect('/home');
    }
    catch (error) {
        return res.status(404).json({
            message: 'File not found or unauthorized.'
        })
    }

})


module.exports = router