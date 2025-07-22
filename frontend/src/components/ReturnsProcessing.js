import React, { useState, useEffect } from 'react';
import './ReturnsProcessing.css';

const BAG_SIZE_KG = 25;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // Get backend URL

const ReturnsProcessing = () => {
    const [products, setProducts] = useState([]);
    const [returnCart, setReturnCart] = useState([]);
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    useEffect(() => {
        if (userRole !== 'sales' && userRole !== 'admin') {
            setMessage("You don't have permission to process returns.");
            setIsError(true);
            return;
        }
        fetchProducts();
    }, [token, userRole]);

    const fetchProducts = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/products`, { // Updated URL
                headers: { 'x-auth-token': token }
            });
            const data = await response.json();

            if (response.ok) {
                setProducts(data);
            } else {
                setMessage(data.msg || 'Failed to fetch products for returns.');
                setIsError(true);
            }
        } catch (err) {
            console.error('Error fetching products for returns:', err);
            setMessage('Network error while fetching products for returns.');
            setIsError(true);
        }
    };

    const addProductToReturn = (product) => {
        const existingItem = returnCart.find(item => item.productId === product._id);
        if (existingItem) {
            setMessage('Product already in return cart.');
            setIsError(true);
            return;
        }
        setReturnCart([...returnCart, {
            productId: product._id,
            name: product.name,
            pricePerBag: product.pricePerBag,
            pricePerKgLooseDefault: (product.pricePerBag / BAG_SIZE_KG),
            currentStockBags: product.currentStockBags,
            quantityToReturnBags: 0,
            quantityToReturnLooseKg: 0,
            pricePerKgLooseAtReturn: (product.pricePerBag / BAG_SIZE_KG), // Initial value for manual entry
            refundAmount: 0
        }]);
        setMessage('');
        setIsError(false);
    };

    const updateReturnQuantitiesAndPrices = (productId, type, value) => {
        setReturnCart(prevCart => prevCart.map(item => {
            if (item.productId === productId) {
                let updatedItem = { ...item, [type]: Number(value) };
                updatedItem.refundAmount = (updatedItem.quantityToReturnBags * updatedItem.pricePerBag) +
                                            (updatedItem.quantityToReturnLooseKg * updatedItem.pricePerKgLooseAtReturn);
                return updatedItem;
            }
            return item;
        }));
    };

    const removeProductFromReturn = (productId) => {
        setReturnCart(prevCart => prevCart.filter(item => item.productId !== productId));
    };

    const calculateTotalRefund = () => {
        return returnCart.reduce((total, item) => total + item.refundAmount, 0).toFixed(2);
    };

    const processReturn = async () => {
        setMessage('');
        setIsError(false);

        if (returnCart.length === 0) {
            setMessage('Return cart is empty. Please add products to process a return.');
            setIsError(true);
            return;
        }

        for (const item of returnCart) {
            const totalReturnedKg = (item.quantityToReturnBags * BAG_SIZE_KG) + item.quantityToReturnLooseKg;
            if (totalReturnedKg <= 0) {
                setMessage(`Invalid return quantity for ${item.name}. Total quantity must be positive.`);
                setIsError(true);
                return;
            }
            if (item.quantityToReturnLooseKg > 0 && (item.pricePerKgLooseAtReturn <= 0 || isNaN(item.pricePerKgLooseAtReturn))) {
                setMessage(`Loose kg price must be positive for returned item ${item.name}.`);
                setIsError(true);
                return;
            }
        }

        try {
            const payload = {
                returnItems: returnCart.map(item => ({
                    productId: item.productId,
                    productName: item.name,
                    quantityReturnedBags: item.quantityToReturnBags,
                    quantityReturnedLooseKg: item.quantityToReturnLooseKg,
                    pricePerBagAtReturn: item.pricePerBag,
                    pricePerKgLooseAtReturn: item.pricePerKgLooseAtReturn
                })),
                reason: reason || 'Not specified'
            };

            const response = await fetch(`${BACKEND_URL}/returns/process`, { // Updated URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`Return processed successfully! Total Refund: ₹${calculateTotalRefund()}`);
                setIsError(false);
                setReturnCart([]);
                setReason('');
                fetchProducts();
            } else {
                setMessage(data.msg || 'Failed to process return. An unexpected error occurred.');
                setIsError(true);
            }
        } catch (err) {
            console.error('Process return error:', err.message);
            setMessage('Network error during return processing.');
            setIsError(true);
        }
    };

    return (
        <div className="returns-processing-container">
            <h2>Process Product Returns</h2>

            {message && (
                <p className={`message ${isError ? 'error' : 'success'}`}>
                    {message}
                </p>
            )}

            <div className="products-for-return-section">
                <h3>Available Products for Return</h3>
                {products.length === 0 ? (
                    <p>No products available.</p>
                ) : (
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Current Stock (Bags)</th>
                                <th>Current Stock (kg)</th>
                                <th>Price/Bag</th>
                                <th>Price/kg (Loose)</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product._id}>
                                    <td>{product.name}</td>
                                    <td>{product.type}</td>
                                    <td>{product.currentStockBags} Bags</td>
                                    <td>{(product.currentStockBags * BAG_SIZE_KG).toFixed(0)} kg</td>
                                    <td>₹{product.pricePerBag.toFixed(2)}</td>
                                    <td>₹{(product.pricePerBag / BAG_SIZE_KG).toFixed(2)}</td>
                                    <td>
                                        <button
                                            onClick={() => addProductToReturn(product)}
                                            className="add-to-return-button"
                                            disabled={returnCart.some(item => item.productId === product._id)}
                                        >
                                            {returnCart.some(item => item.productId === product._id) ? 'In Cart' : 'Add to Return Cart'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="return-cart-section">
                <h3>Return Cart</h3>
                {returnCart.length === 0 ? (
                    <p>Return cart is empty. Add products from above.</p>
                ) : (
                    <>
                        <table className="return-cart-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Price/Bag</th>
                                    <th>Qty (Bags)</th>
                                    <th>Qty (Loose kg)</th>
                                    <th>Loose Price/Kg</th>
                                    <th>Refund Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnCart.map(item => (
                                    <tr key={item.productId}>
                                        <td>{item.name}</td>
                                        <td>₹{item.pricePerBag.toFixed(2)}</td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.quantityToReturnBags}
                                                onChange={(e) => updateReturnQuantitiesAndPrices(item.productId, 'quantityToReturnBags', e.target.value)}
                                                className="quantity-input"
                                            /> Bags
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                max={BAG_SIZE_KG - 0.01}
                                                step="0.01"
                                                value={item.quantityToReturnLooseKg}
                                                onChange={(e) => updateReturnQuantitiesAndPrices(item.productId, 'quantityToReturnLooseKg', e.target.value)}
                                                className="quantity-input"
                                            /> kg
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={item.pricePerKgLooseAtReturn}
                                                onChange={(e) => updateReturnQuantitiesAndPrices(item.productId, 'pricePerKgLooseAtReturn', e.target.value)}
                                                className="quantity-input price-input"
                                                disabled={item.quantityToReturnLooseKg === 0}
                                            />
                                        </td>
                                        <td>₹{(item.refundAmount).toFixed(2)}</td>
                                        <td>
                                            <button onClick={() => removeProductFromReturn(item.productId)} className="remove-from-return-button">Remove</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="return-summary">
                            <div className="form-group">
                                <label htmlFor="returnReason">Reason for Return (Optional):</label>
                                <textarea
                                    id="returnReason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="e.g., Damaged product, customer changed mind"
                                    className="reason-input"
                                ></textarea>
                            </div>
                            <h4>Total Refund: ₹{calculateTotalRefund()}</h4>
                            <button onClick={processReturn} className="process-return-button">Process Return</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ReturnsProcessing;