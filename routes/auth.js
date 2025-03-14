const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post(
    '/register',
    [
        check('email', 'Please include a valid email').isEmail().normalizeEmail(),
        check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
        check('firstName', 'First name is required').trim().notEmpty(),
        check('lastName', 'Last name is required').trim().notEmpty()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password, firstName, lastName } = req.body;

        // Check if user exists
        let user = await User.findOne({ where: { email } });
        if (user) {
            throw new ApiError(400, 'User already exists');
        }

        // Create user
        user = await User.create({
            email,
            password,
            firstName,
            lastName
        });

        // Create default categories for the new user
        if (req.app.locals.createDefaultCategories) {
            await req.app.locals.createDefaultCategories(user.id);
        }

        // Generate JWT token
        const token = user.generateAuthToken();

        res.status(201).json({
            success: true,
            token
        });
    })
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
    '/login',
    [
        check('email', 'Please include a valid email').isEmail().normalizeEmail(),
        check('password', 'Password is required').notEmpty()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new ApiError(400, 'Invalid credentials');
        }

        // Check password
        const isMatch = await user.checkPassword(password);
        if (!isMatch) {
            throw new ApiError(400, 'Invalid credentials');
        }

        // Generate JWT token
        const token = user.generateAuthToken();

        res.json({
            success: true,
            token
        });
    })
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get(
    '/me',
    auth,
    asyncHandler(async (req, res) => {
        // Return user data without password
        const user = req.user;
        const userData = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            createdAt: user.createdAt
        };

        res.json({
            success: true,
            data: userData
        });
    })
);

module.exports = router; 