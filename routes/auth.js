const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const sendEmail = require('../utils/email');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  check('firstName', 'First name is required').not().isEmpty(),
  check('lastName', 'Last name is required').not().isEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, firstName, lastName } = req.body;

  try {
    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
    }

    user = await User.create({
      email,
      password,
      firstName,
      lastName,
      isEmailVerified: true
    });

    if (req.app.locals.createDefaultCategories) {
      await req.app.locals.createDefaultCategories(user.id);
    }

    const token = user.generateAuthToken();

    res.status(201).json({ token });
  } catch (err) {
    res.status(500).json({ errors: [{ msg: 'Server error', error: err.message }] });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
    }

    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
    }

    const token = user.generateAuthToken();

    res.json({ token });
  } catch (err) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

// @route   GET api/auth/verify-email
// @desc    Verify email
// @access  Public
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ errors: [{ msg: 'Invalid token' }] });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(400).json({ errors: [{ msg: 'Invalid token' }] });
    }

    if (user.emailVerificationTokenExpires < new Date()) {
      return res.status(400).json({ errors: [{ msg: 'Token expired' }] });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpires = null;
    await user.save();

    res.json({ msg: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

// @route   POST api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post('/forgot-password', [
  check('email', 'Please include a valid email').isEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ errors: [{ msg: 'User not found' }] });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.json({ msg: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', [
  check('token', 'Token is required').not().isEmpty(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(400).json({ errors: [{ msg: 'Invalid token' }] });
    }

    if (user.passwordResetTokenExpires < new Date()) {
      return res.status(400).json({ errors: [{ msg: 'Token expired' }] });
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetTokenExpires = null;
    await user.save();

    res.json({ msg: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

// @route   PUT api/auth/me
// @desc    Update current user
// @access  Private
router.put('/me', auth, [
  check('firstName', 'First name is required').not().isEmpty(),
  check('lastName', 'Last name is required').not().isEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { firstName, lastName, phoneNumber, preferences } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ errors: [{ msg: 'User not found' }] });
    }

    user.firstName = firstName;
    user.lastName = lastName;
    
    if (phoneNumber !== undefined) {
      user.phoneNumber = phoneNumber;
    }
    
    if (preferences !== undefined) {
      user.preferences = preferences;
    }
    
    await user.save();

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });
    
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

module.exports = router; 