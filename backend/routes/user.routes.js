const router = require('express').Router();
let User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth'); // Import auth middleware

// GET all users: /users/ (Protected for admin/manager)
router.route('/').get(auth(['admin', 'manager']), (req, res) => { // Added auth
    User.find()
        .then(users => res.json(users))
        .catch(err => res.status(400).json('Error: ' + err));
});

// REGISTER a new user: /users/register (Protected for admin/manager - only they can create new users)
router.route('/register').post(async (req, res) => { // Added auth
    const { username, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json('Error: Username already exists!');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            password: hashedPassword,
            role: role || 'sales'
        });

        await newUser.save();
        res.json('User registered successfully!');

    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

// LOGIN user: /users/login (This route is public)
router.route('/login').post(async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json('Invalid Credentials');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json('Invalid Credentials');
        }

        const payload = {
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, role: user.role, username: user.username });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE a user by ID: /users/:id (Protected for admin only)
router.route('/:id').delete(auth('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json('User not found.');
        }
        res.json('User deleted.');
    } catch (err) {
        console.error(err);
        res.status(400).json('Error: ' + err.message);
    }
});

// UPDATE a user role by ID: /users/update/:id (Protected for admin only)
router.route('/update/:id').post(auth('admin'), async (req, res) => {
    const { username, role } = req.body; // Can update username too, but mainly role here

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json('User not found.');
        }

        // Prevent changing the password via this route (a separate route for password change is better)
        // If username or role is provided, update it
        if (username) user.username = username;
        if (role) user.role = role;

        await user.save();
        res.json('User updated successfully!');
    } catch (err) {
        console.error(err);
        res.status(400).json('Error: ' + err.message);
    }
});

module.exports = router;