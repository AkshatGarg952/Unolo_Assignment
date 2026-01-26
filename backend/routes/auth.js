const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        // BUG 3.1: Fixed Case Sensitive Login
        // Incorrect Code (Case sensitive email):
        // const [users] = await pool.execute(
        //     'SELECT * FROM users WHERE email = ?',
        //     [email]
        // );

        // Correct Code: Normalize email to lowercase
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];

        // BUG 2.1: Fixed Critical Auth Bypass
        // Incorrect Code (Missing await):
        // const isValidPassword = bcrypt.compare(password, user.password);

        // Correct Code: Added await
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // BUG 2.2: Fixed Password Exposure in JWT
        // Incorrect Code (Password included in token):
        // const token = jwt.sign(
        //     { id: user.id, email: user.email, role: user.role, name: user.name, password: user.password },
        //     process.env.JWT_SECRET,
        //     { expiresIn: '24h' }
        // );

        // Correct Code: Removed password from token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// Get current user profile
router.get('/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await pool.execute(
            'SELECT id, name, email, role FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: users[0] });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

module.exports = router;
