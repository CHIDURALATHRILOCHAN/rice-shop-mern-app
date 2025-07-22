const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    type: { // Updated types
        type: String,
        required: true,
        trim: true,
        enum: ['Basmati', 'Raw Rice', 'Steam Rice', 'HMT'], // Restricted types
    },
    // description field REMOVED
    currentStockBags: { // Stock now in Bags
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    pricePerBag: { // Selling price per 25kg Bag
        type: Number,
        required: true,
        min: 0.01
    },
    costPricePerBag: { // Cost price for profit calculation, per 25kg Bag
        type: Number,
        required: false,
        min: 0
    }
}, {
    timestamps: true,
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;