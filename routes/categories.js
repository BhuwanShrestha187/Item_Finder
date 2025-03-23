const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const auth = require('../middleware/auth');

// Get all categories for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const categories = await Category.findAll({
            where: { userId: req.user.id },
            order: [['name', 'ASC']]
        });

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
});

// Create a new category
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, color } = req.body;

        const category = await Category.create({
            name,
            description: description || null,
            color: color || '#666666', // Default color if not provided
            userId: req.user.id
        });

        res.status(201).json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating category',
            error: error.message
        });
    }
});

// Update a category
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, description, color } = req.body;

        const category = await Category.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        await category.update({ name, description, color });

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating category',
            error: error.message
        });
    }
});

// Delete a category
router.delete('/:id', auth, async (req, res) => {
    try {
        const category = await Category.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        await category.destroy();

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting category',
            error: error.message
        });
    }
});

module.exports = router; 