const router = require('express').Router();
let Return = require('../models/return.model');
let Product = require('../models/product.model');
const auth = require('../middleware/auth');

const BAG_SIZE_KG = 25; // Define the bag size

// PROCESS A NEW RETURN: /returns/process
router.route('/process').post(auth(['admin', 'sales']), async (req, res) => {
    const { returnItems, saleId, reason } = req.body;
    const processedBy = req.user.id;

    if (!returnItems || returnItems.length === 0) {
        return res.status(400).json('Error: No items provided for return.');
    }

    let totalRefundAmount = 0;
    const processedReturnItems = [];
    const stockUpdates = [];

    try {
        for (const item of returnItems) {
            const product = await Product.findById(item.productId);

            if (!product) {
                return res.status(404).json(`Error: Product ${item.productName} not found.`);
            }
            const totalQuantityReturnedKg = (item.quantityReturnedBags * BAG_SIZE_KG) + item.quantityReturnedLooseKg;
            if (totalQuantityReturnedKg <= 0) {
                return res.status(400).json(`Error: Invalid return quantity for ${item.productName}. Must be positive.`);
            }

            // Validate loose kg price if loose kgs are returned
            if (item.quantityReturnedLooseKg > 0 && item.pricePerKgLooseAtReturn === undefined) {
                return res.status(400).json(`Error: Price per loose kg is required for returned item ${item.productName}.`);
            }

            // Calculate refund amount based on bag price for bags and *manually entered loose price* for loose kgs
            const pricePerKgLooseToUse = item.pricePerKgLooseAtReturn !== undefined ? item.pricePerKgLooseAtReturn : (product.pricePerBag / BAG_SIZE_KG);
            const costPriceAtReturn = product.costPricePerBag || 0; // Cost price is per bag

            const refundAmount = (item.quantityReturnedBags * product.pricePerBag) + (item.quantityReturnedLooseKg * pricePerKgLooseToUse);

            processedReturnItems.push({
                productId: product._id,
                productName: product.name,
                quantityReturnedBags: item.quantityReturnedBags,
                quantityReturnedLooseKg: item.quantityReturnedLooseKg,
                pricePerBagAtReturn: product.pricePerBag, // Store the product's bag price at return time
                pricePerKgLooseAtReturn: pricePerKgLooseToUse, // Store the actual price used for loose kgs returned
                costPricePerBagAtReturn: costPriceAtReturn,
                refundAmount: refundAmount
            });

            totalRefundAmount += refundAmount;

            // Prepare stock update: increment stock in BAGS
            const currentStockKg = product.currentStockBags * BAG_SIZE_KG;
            const newStockKg = currentStockKg + totalQuantityReturnedKg;
            const newStockBags = Math.ceil(newStockKg / BAG_SIZE_KG); // Round up to next full bag if loose kg returned

            stockUpdates.push(
                Product.findByIdAndUpdate(
                    product._id,
                    { currentStockBags: newStockBags }, // Update stock in bags
                    { new: true, runValidators: true }
                )
            );
        }

        await Promise.all(stockUpdates);

        const newReturn = new Return({
            saleId,
            returnItems: processedReturnItems,
            totalRefundAmount,
            reason,
            processedBy
        });

        await newReturn.save();

        res.json('Return processed successfully!');

    } catch (err) {
        console.error('Error processing return:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});

// GET ALL RETURNS (for admin/manager viewing)
router.route('/').get(auth(['admin', 'manager']), async (req, res) => {
    try {
        const returns = await Return.find()
            .populate('processedBy', 'username role')
            .populate('returnItems.productId', 'name type');

        res.json(returns);
    } catch (err) {
        console.error('Error fetching returns:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});

// CLEAR ALL RETURNS
router.route('/clear-all').delete(auth('admin'), async (req, res) => {
    try {
        await Return.deleteMany({});
        res.json('All returns history cleared successfully!');
    } catch (err) {
        console.error('Error clearing all returns:', err);
        res.status(500).json('Error: ' + err.message);
    }
});

module.exports = router;