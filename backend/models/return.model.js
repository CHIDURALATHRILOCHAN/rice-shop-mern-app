const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const returnItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    quantityReturnedBags: { // Quantity returned in full bags
        type: Number,
        required: true,
        min: 0,
    },
    quantityReturnedLooseKg: { // Quantity returned in loose kgs
        type: Number,
        required: true,
        min: 0,
    },
    pricePerBagAtReturn: { // Price of bag at time of return (original sale price or current price)
        type: Number,
        required: true,
        min: 0.01
    },
    pricePerKgLooseAtReturn: { // NEW: Price per KG for loose returns, manually entered
        type: Number,
        required: false, // Optional, only required if loose kg is > 0
        min: 0
    },
    costPricePerBagAtReturn: { // Cost price of bag at return for profit recalculation
        type: Number,
        required: false,
        min: 0
    },
    refundAmount: { // The amount refunded for this item
        type: Number,
        required: true
    }
});

const returnSchema = new Schema({
    saleId: {
        type: Schema.Types.ObjectId,
        ref: 'Sale',
        required: false
    },
    returnItems: [returnItemSchema],
    totalRefundAmount: {
        type: Number,
        required: true
    },
    returnDate: {
        type: Date,
        default: Date.now
    },
    processedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    reason: {
        type: String,
        trim: true,
        required: false
    }
}, {
    timestamps: true,
});

const Return = mongoose.model('Return', returnSchema);

module.exports = Return;