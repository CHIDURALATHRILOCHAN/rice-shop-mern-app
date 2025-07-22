const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    password: { // We'll hash this password later
        type: String,
        required: true,
        minlength: 6 // Minimum length for the password
    },
    role: { // Define roles like 'admin', 'sales', 'manager'
        type: String,
        enum: ['admin', 'sales', 'manager'],
        default: 'sales' // Default role for new users
    }
}, {
    timestamps: true, // Automatically add createdAt and updatedAt fields
});

const User = mongoose.model('User', userSchema);

module.exports = User;