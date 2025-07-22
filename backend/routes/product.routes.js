const router = require('express').Router();
let Product = require('../models/product.model');
const auth = require('../middleware/auth');

// GET ALL PRODUCTS: /products/
router.route('/').get(auth(['admin', 'sales', 'manager']), async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});

// ADD NEW PRODUCT: /products/add (Only 'admin' can add)
router.route('/add').post(auth('admin'), async (req, res) => {
    const { name, type, currentStockBags, pricePerBag, costPricePerBag } = req.body;

    if (!name || !type || currentStockBags === undefined || pricePerBag === undefined) {
        return res.status(400).json('Error: Missing required fields.');
    }

    try {
        const newProduct = new Product({
            name,
            type,
            currentStockBags: Number(currentStockBags),
            pricePerBag: Number(pricePerBag),
            costPricePerBag: Number(costPricePerBag) || 0 // Default to 0 if not provided
        });

        await newProduct.save();
        res.json('Product added!');
    } catch (err) {
        console.error('Error adding product:', err);
        // Check for duplicate key error (name must be unique)
        if (err.code === 11000) {
            return res.status(400).json('Error: Product with this name already exists.');
        }
        res.status(500).json('Server Error: ' + err.message);
    }
});

// GET PRODUCT BY ID: /products/:id
router.route('/:id').get(auth(['admin', 'sales', 'manager']), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json('Error: Product not found.');
        }
        res.json(product);
    } catch (err) {
        console.error('Error fetching product by ID:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});

// DELETE PRODUCT: /products/:id (Only 'admin' can delete)
router.route('/:id').delete(auth('admin'), async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json('Error: Product not found.');
        }
        res.json('Product deleted.');
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});

// UPDATE PRODUCT: /products/update/:id (Only 'admin' can update)
router.route('/update/:id').post(auth('admin'), async (req, res) => {
    const { name, type, currentStockBags, pricePerBag, costPricePerBag } = req.body;

    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json('Error: Product not found.');
        }

        product.name = name;
        product.type = type;
        // description field REMOVED
        product.currentStockBags = Number(currentStockBags);
        product.pricePerBag = Number(pricePerBag);
        product.costPricePerBag = Number(costPricePerBag) || 0; // Default to 0 if not provided

        await product.save();
        res.json('Product updated!');
    } catch (err) {
        console.error('Error updating product:', err);
        // Check for duplicate name error during update
        if (err.code === 11000) {
            return res.status(400).json('Error: Product with this name already exists.');
        }
        res.status(500).json('Server Error: ' + err.message);
    }
});

// CLEAR ALL PRODUCTS: /products/clear-all (Only 'admin' can clear)
router.delete('/clear-all', auth('admin'), async (req, res) => {
    try {
        await Product.deleteMany({}); // Deletes all documents in the Product collection
        res.json('All products cleared successfully!');
    } catch (err) {
        console.error('Error clearing all products:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});

module.exports = router;