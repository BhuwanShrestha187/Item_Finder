const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Category = require('../models/Category');

// @route   GET api/categories
// @desc    Get all categories for the current user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const categories = await Category.findAll({
            where: { userId: req.user.id },
            order: [['name', 'ASC']]
        });

        res.json(categories);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/categories
// @desc    Create a new category
// @access  Private
router.post('/', [
    auth,
    [
        check('name', 'Name is required').not().isEmpty(),
        check('type', 'Type must be either expense or income').isIn(['expense', 'income'])
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, description, icon } = req.body;

    try {
        const newCategory = await Category.create({
            name,
            type,
            description,
            icon,
            userId: req.user.id
        });

        res.status(201).json(newCategory);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/categories/:id
// @desc    Update a category
// @access  Private
router.put('/:id', [
    auth,
    [
        check('name', 'Name is required').not().isEmpty(),
        check('type', 'Type must be either expense or income').isIn(['expense', 'income'])
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, description, icon } = req.body;

    try {
        // Find the category
        let category = await Category.findByPk(req.params.id);

        // Check if category exists
        if (!category) {
            return res.status(404).json({ msg: 'Category not found' });
        }

        // Check if the category belongs to the user
        if (category.userId !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Update category
        category.name = name;
        category.type = type;
        category.description = description;
        category.icon = icon;

        await category.save();

        res.json(category);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/categories/:id
// @desc    Delete a category
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        // Find the category
        const category = await Category.findByPk(req.params.id);

        // Check if category exists
        if (!category) {
            return res.status(404).json({ msg: 'Category not found' });
        }

        // Check if the category belongs to the user
        if (category.userId !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Delete category
        await category.destroy();

        res.json({ msg: 'Category removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; 