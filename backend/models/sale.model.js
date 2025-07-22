const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const saleItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId, // Reference to the Product model
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    quantitySoldBags: { // Quantity sold in full bags
        type: Number,
        required: true,
        min: 0,
    },
    quantitySoldLooseKg: { // Quantity sold in loose kgs
        type: Number,
        required: true,
        min: 0,
    },
    pricePerBagAtSale: { // Price of bag at sale time
        type: Number,
        required: true,
        min: 0.01
    },
    pricePerKgLooseAtSale: { // NEW: Price per KG for loose sales, manually entered
        type: Number,
        required: false, // Optional, only required if loose kg is > 0
        min: 0
    },
    costPricePerBagAtSale: { // Original cost price of bag at sale time for profit calculation
        type: Number,
        required: false,
        min: 0
    },
    subtotal: { // Derived: (quantitySoldBags * pricePerBagAtSale) + (quantitySoldLooseKg * pricePerKgLooseAtSale)
        type: Number,
        required: true
    },
    profitPerItem: { // Derived profit
        type: Number,
        required: false
    }
});

const saleSchema = new Schema({
    saleItems: [saleItemSchema],
    totalAmount: {
        type: Number,
        required: true
    },
    totalProfit: {
        type: Number,
        required: false
    },
    recordedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    paymentMode: {
        type: String,
        required: true,
        enum: ['Cash', 'Online'],
        default: 'Cash'
    }
}, {
    timestamps: true,
});

const Sale = mongoose.model('Sale', saleSchema);

module.exports = Sale;