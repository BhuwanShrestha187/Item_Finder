const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user',
    },
    profilePicture: {
        type: DataTypes.STRING,
    },
    phoneNumber: {
        type: DataTypes.STRING,
    },
    preferences: {
        type: DataTypes.JSON,
        defaultValue: {},
    },
    isEmailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'users',
    timestamps: true,
    hooks: {
        beforeSave: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
    }
});

// Instance method to generate JWT token
User.prototype.generateAuthToken = function () {
    return jwt.sign(
        { id: this.id, email: this.email, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Instance method to check password
User.prototype.checkPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = User;