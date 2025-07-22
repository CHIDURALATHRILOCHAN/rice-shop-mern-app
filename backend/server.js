require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = process.env.MONGO_URI;

mongoose.connect(uri)
    .then(() => console.log('MongoDB database connection established successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Import routes
const productsRouter = require('./routes/product.routes');
const usersRouter = require('./routes/user.routes');
const salesRouter = require('./routes/sale.routes');
const returnsRouter = require('./routes/return.routes'); // <-- ADD THIS LINE

// Use routes
app.use('/products', productsRouter);
app.use('/users', usersRouter);
app.use('/sales', salesRouter);
app.use('/returns', returnsRouter); // <-- ADD THIS LINE

// Basic route to test the server (keep it for now, can remove later)
app.get('/api', (req, res) => {
    res.send('Welcome to the Rice Shop Backend API!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});