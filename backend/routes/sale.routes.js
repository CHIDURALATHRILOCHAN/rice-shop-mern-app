const router = require('express').Router();
let Sale = require('../models/sale.model');
let Product = require('../models/product.model');
const auth = require('../middleware/auth');

const BAG_SIZE_KG = 25;

// RECORD A NEW SALE: /sales/record
router.route('/record').post(auth(['admin', 'sales']), async (req, res) => {
    const { cartItems, paymentMode } = req.body;
    const recordedBy = req.user.id;

    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json('Error: Cart is empty.');
    }
    if (!paymentMode || !['Cash', 'Online'].includes(paymentMode)) {
        return res.status(400).json('Error: Invalid payment mode provided.');
    }

    let totalAmount = 0;
    let totalProfit = 0;
    const saleItems = [];
    const stockUpdates = [];

    try {
        for (const item of cartItems) {
            const product = await Product.findById(item.productId);

            if (!product) {
                return res.status(404).json(`Error: Product ${item.productName} not found.`);
            }

            if (item.quantitySoldLooseKg > 0 && (item.pricePerKgLooseAtSale === undefined || isNaN(item.pricePerKgLooseAtSale) || item.pricePerKgLooseAtSale <= 0)) {
                return res.status(400).json(`Error: Price per loose kg must be a positive number for ${item.productName}.`);
            }

            const totalQuantitySoldKg = (item.quantitySoldBags * BAG_SIZE_KG) + item.quantitySoldLooseKg;
            const currentStockKg = product.currentStockBags * BAG_SIZE_KG;

            if (currentStockKg < totalQuantitySoldKg) {
                return res.status(400).json(`Error: Insufficient stock for ${item.productName}. Available: ${product.currentStockBags} bags (${currentStockKg} kg). Trying to sell ${totalQuantitySoldKg} kg.`);
            }

            const pricePerKgLooseToUse = item.pricePerKgLooseAtSale !== undefined ? item.pricePerKgLooseAtSale : (product.pricePerBag / BAG_SIZE_KG);
            const costPricePerKgLoose = (product.costPricePerBag || 0) / BAG_SIZE_KG;

            const subtotal = (item.quantitySoldBags * product.pricePerBag) + (item.quantitySoldLooseKg * pricePerKgLooseToUse);
            const profitPerItem = (
                (item.quantitySoldBags * (product.pricePerBag - (product.costPricePerBag || 0))) +
                (item.quantitySoldLooseKg * (pricePerKgLooseToUse - costPricePerKgLoose))
            );

            saleItems.push({
                productId: product._id,
                productName: product.name,
                quantitySoldBags: item.quantitySoldBags,
                quantitySoldLooseKg: item.quantitySoldLooseKg,
                pricePerBagAtSale: product.pricePerBag,
                pricePerKgLooseAtSale: pricePerKgLooseToUse,
                costPricePerBagAtSale: product.costPricePerBag || 0,
                subtotal: subtotal,
                profitPerItem: profitPerItem
            });

            totalAmount += subtotal;
            totalProfit += profitPerItem;

            const newStockKg = currentStockKg - totalQuantitySoldKg;
            const newStockBags = Math.ceil(newStockKg / BAG_SIZE_KG);

            stockUpdates.push(
                Product.findByIdAndUpdate(
                    product._id,
                    { currentStockBags: newStockBags },
                    { new: true, runValidators: true }
                )
            );
        }

        await Promise.all(stockUpdates);

        const newSale = new Sale({
            saleItems,
            totalAmount,
            totalProfit,
            recordedBy,
            paymentMode
        });

        await newSale.save();

        res.json('Sale recorded successfully!');

    } catch (err) {
        console.error('Error recording sale:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});

// GET ALL SALES (for reporting)
router.route('/').get(auth(['admin', 'manager']), async (req, res) => {
    try {
        const sales = await Sale.find().populate('recordedBy', 'username role');
        res.json(sales);
    } catch (err) {
        console.error('Error fetching sales:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});

// GET SALES BY DATE RANGE (for daily/monthly reports)
router.route('/report/daily-monthly').get(auth(['admin', 'manager']), async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json('Error: startDate and endDate are required query parameters.');
    }

    const startOfDay = new Date(startDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(endDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    try {
        const sales = await Sale.find({
            createdAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        const dailySales = {};
        let totalPeriodProfit = 0;
        let totalPeriodSales = 0;
        let totalCashSales = 0;
        let totalOnlineSales = 0;

        sales.forEach(sale => {
            const saleDate = sale.createdAt.toISOString().split('T')[0];

            if (!dailySales[saleDate]) {
                dailySales[saleDate] = {
                    totalSales: 0,
                    totalProfit: 0,
                    totalCash: 0,
                    totalOnline: 0,
                    transactions: []
                };
            }

            dailySales[saleDate].totalSales += sale.totalAmount;
            dailySales[saleDate].totalProfit += sale.totalProfit;
            dailySales[saleDate].transactions.push(sale);

            if (sale.paymentMode === 'Cash') {
                dailySales[saleDate].totalCash += sale.totalAmount;
                totalCashSales += sale.totalAmount;
            } else if (sale.paymentMode === 'Online') {
                dailySales[saleDate].totalOnline += sale.totalAmount;
                totalOnlineSales += sale.totalAmount;
            } else {
                console.warn(`Sale ${sale._id} has unrecognized or missing paymentMode: ${sale.paymentMode}`);
            }

            totalPeriodProfit += sale.totalProfit;
            totalPeriodSales += sale.totalAmount;
        });

        res.json({
            reportPeriod: { startDate, endDate },
            totalPeriodSales,
            totalPeriodProfit,
            totalCashSales,
            totalOnlineSales,
            dailyBreakdown: dailySales
        });

    } catch (err) {
        console.error('Error fetching daily/monthly sales report:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});

// GET MAX PROFIT PRODUCT ON A SPECIFIC DAY: /sales/report/max-profit-product
router.route('/report/max-profit-product').get(auth(['admin', 'manager']), async (req, res) => {
    const { date } = req.query; // Expecting YYYY-MM-DD

    if (!date) {
        return res.status(400).json('Error: date query parameter is required.');
    }

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    try {
        const result = await Sale.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    }
                }
            },
            { $unwind: '$saleItems' },
            {
                $group: {
                    _id: '$saleItems.productId',
                    productName: { $first: '$saleItems.productName' },
                    totalProfit: { $sum: '$saleItems.profitPerItem' },
                    totalQuantitySoldKg: { $sum: { $add: [{ $multiply: ['$saleItems.quantitySoldBags', BAG_SIZE_KG] }, '$saleItems.quantitySoldLooseKg'] } },
                    totalRevenue: { $sum: '$saleItems.subtotal' }
                }
            },
            { $sort: { totalProfit: -1 } },
            { $limit: 1 }
        ]);

        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.json(null);
        }

    } catch (err) {
        console.error('Error fetching max profit product:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});


// NEW ROUTE: GET SALES TRENDS (Daily/Monthly aggregated by total sales/profit)
router.route('/report/trends').get(auth(['admin', 'manager']), async (req, res) => {
    const { period = 'daily', startDate, endDate } = req.query; // period can be 'daily', 'monthly'

    if (!startDate || !endDate) {
        return res.status(400).json('Error: startDate and endDate are required query parameters.');
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    let groupByFormat;
    if (period === 'monthly') {
        groupByFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } }; // Group by Year-Month
    } else { // default to daily
        groupByFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }; // Group by Year-Month-Day
    }

    try {
        const trends = await Sale.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: start,
                        $lte: end
                    }
                }
            },
            {
                $group: {
                    _id: groupByFormat,
                    totalSales: { $sum: "$totalAmount" },
                    totalProfit: { $sum: "$totalProfit" }
                }
            },
            { $sort: { "_id": 1 } } // Sort by date/month
        ]);

        res.json(trends);
    } catch (err) {
        console.error('Error fetching sales trends:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});


// NEW ROUTE: GET PRODUCT PERFORMANCE BY TYPE
router.route('/report/by-product-type').get(auth(['admin', 'manager']), async (req, res) => {
    const { startDate, endDate } = req.query;

    let matchQuery = {};
    if (startDate && endDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        matchQuery.createdAt = { $gte: start, $lte: end };
    }

    try {
        const productTypePerformance = await Sale.aggregate([
            { $match: matchQuery },
            { $unwind: "$saleItems" }, // Deconstruct saleItems array
            {
                $lookup: { // Join with products collection to get product type
                    from: "products", // The collection name (MongoDB typically pluralizes model names)
                    localField: "saleItems.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" }, // Deconstruct productDetails array
            {
                $group: {
                    _id: "$productDetails.type", // Group by product type
                    totalSales: { $sum: "$saleItems.subtotal" },
                    totalProfit: { $sum: "$saleItems.profitPerItem" },
                    totalQuantitySoldKg: { $sum: { $add: [{ $multiply: ['$saleItems.quantitySoldBags', BAG_SIZE_KG] }, '$saleItems.quantitySoldLooseKg'] } }
                }
            },
            { $sort: { "totalSales": -1 } } // Sort by total sales
        ]);

        res.json(productTypePerformance);
    } catch (err) {
        console.error('Error fetching product performance by type:', err);
        res.status(500).json('Server Error: ' + err.message);
    }
});


// CLEAR ALL SALES
router.route('/clear-all').delete(auth('admin'), async (req, res) => {
    try {
        await Sale.deleteMany({});
        res.json('All sales history cleared successfully!');
    } catch (err) {
        console.error('Error clearing all sales:', err);
        res.status(500).json('Error: ' + err.message);
    }
});

module.exports = router;