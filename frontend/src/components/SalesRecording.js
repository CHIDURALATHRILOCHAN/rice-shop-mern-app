import React, { useState, useEffect } from 'react';
import './SalesRecording.css';

const BAG_SIZE_KG = 25;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // Get backend URL

const SalesRecording = () => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [paymentMode, setPaymentMode] = useState('Cash');

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    useEffect(() => {
        if (userRole !== 'sales' && userRole !== 'admin') {
            setMessage("You don't have permission to record sales.");
            setIsError(true);
            return;
        }
        fetchProducts();
    }, [token, userRole]);

    const fetchProducts = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/products`, { // Updated URL
                headers: {
                    'x-auth-token': token
                }
            });
            const data = await response.json();

            if (response.ok) {
                setProducts(data);
            } else {
                setMessage(data.msg || 'Failed to fetch products for sale.');
                setIsError(true);
            }
        } catch (err) {
            console.error('Error fetching products for sales:', err);
            setMessage('Network error while fetching products for sale.');
            setIsError(true);
        }
    };

    const addToCart = (product) => {
        const existingItem = cart.find(item => item.productId === product._id);
        if (existingItem) {
            setMessage('Product already in cart. Adjust quantities directly in cart.');
            setIsError(true);
            return;
        }
        setCart([...cart, {
            productId: product._id,
            name: product.name,
            pricePerBag: product.pricePerBag,
            pricePerKgLooseDefault: (product.pricePerBag / BAG_SIZE_KG),
            currentStockBags: product.currentStockBags,
            quantitySoldBags: 0,
            quantitySoldLooseKg: 0,
            pricePerKgLooseAtSale: (product.pricePerBag / BAG_SIZE_KG), // Initial value for manual entry
            subtotal: 0
        }]);
        setMessage('');
        setIsError(false);
    };

    const updateCartQuantitiesAndPrices = (productId, type, value) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.productId === productId) {
                let updatedItem = { ...item, [type]: Number(value) };

                updatedItem.subtotal = (updatedItem.quantitySoldBags * updatedItem.pricePerBag) +
                                       (updatedItem.quantitySoldLooseKg * updatedItem.pricePerKgLooseAtSale);
                return updatedItem;
            }
            return item;
        }));
    };

    const removeFromCart = (productId) => {
        setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    };

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + item.subtotal, 0);
    };

    const recordSale = async () => {
        setMessage('');
        setIsError(false);

        if (cart.length === 0) {
            setMessage('Cart is empty. Please add products to record a sale.');
            setIsError(true);
            return;
        }

        for (const item of cart) {
            const totalSoldKg = (item.quantitySoldBags * BAG_SIZE_KG) + item.quantitySoldLooseKg;
            const availableStockKg = item.currentStockBags * BAG_SIZE_KG;

            if (totalSoldKg <= 0) {
                setMessage(`Invalid sale quantity for ${item.name}. Total quantity must be positive.`);
                setIsError(true);
                return;
            }
            if (totalSoldKg > availableStockKg) {
                setMessage(`Insufficient stock for ${item.name}. Available: ${item.currentStockBags} bags (${availableStockKg} kg). Trying to sell ${totalSoldKg} kg.`);
                setIsError(true);
                return;
            }
            if (item.quantitySoldLooseKg > 0 && (item.pricePerKgLooseAtSale <= 0 || isNaN(item.pricePerKgLooseAtSale))) {
                setMessage(`Loose kg price must be positive for ${item.name}.`);
                setIsError(true);
                return;
            }
        }

        try {
            const response = await fetch(`${BACKEND_URL}/sales/record`, { // Updated URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ cartItems: cart, paymentMode })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`Sale recorded successfully! Total: ₹${calculateTotal().toFixed(2)} (Mode: ${paymentMode})`);
                setIsError(false);
                setCart([]);
                setPaymentMode('Cash');
                fetchProducts();
            } else {
                setMessage(data.msg || 'Failed to record sale. An unexpected error occurred.');
                setIsError(true);
            }
        } catch (err) {
            console.error('Record sale error:', err.message);
            setMessage('Network error during sale recording.');
            setIsError(true);
        }
    };

    return (
        <div className="sales-recording-container">
            <h2>Record a Sale</h2>

            {message && (
                <p className={`message ${isError ? 'error' : 'success'}`}>
                    {message}
                </p>
            )}

            <div className="products-for-sale-section">
                <h3>Available Products</h3>
                {products.length === 0 ? (
                    <p>No products available for sale.</p>
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
                                            onClick={() => addToCart(product)}
                                            className="add-to-cart-button"
                                            disabled={product.currentStockBags <= 0 || cart.some(item => item.productId === product._id)}
                                        >
                                            {cart.some(item => item.productId === product._id) ? 'In Cart' : (product.currentStockBags <= 0 ? 'Out of Stock' : 'Add to Cart')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="cart-section">
                <h3>Sales Cart</h3>
                {cart.length === 0 ? (
                    <p>Cart is empty. Add products from above.</p>
                ) : (
                    <>
                        <table className="cart-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Price/Bag</th>
                                    <th>Qty (Bags)</th>
                                    <th>Qty (Loose kg)</th>
                                    <th>Loose Price/Kg</th>
                                    <th>Subtotal</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map(item => (
                                    <tr key={item.productId}>
                                        <td>{item.name}</td>
                                        <td>₹{item.pricePerBag.toFixed(2)}</td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.quantitySoldBags}
                                                onChange={(e) => updateCartQuantitiesAndPrices(item.productId, 'quantitySoldBags', e.target.value)}
                                                className="quantity-input"
                                            /> Bags
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                max={BAG_SIZE_KG - 0.01}
                                                step="0.01"
                                                value={item.quantitySoldLooseKg}
                                                onChange={(e) => updateCartQuantitiesAndPrices(item.productId, 'quantitySoldLooseKg', e.target.value)}
                                                className="quantity-input"
                                            /> kg
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={item.pricePerKgLooseAtSale}
                                                onChange={(e) => updateCartQuantitiesAndPrices(item.productId, 'pricePerKgLooseAtSale', e.target.value)}
                                                className="quantity-input price-input"
                                                disabled={item.quantitySoldLooseKg === 0}
                                            />
                                        </td>
                                        <td>₹{item.subtotal.toFixed(2)}</td>
                                        <td>
                                            <button onClick={() => removeFromCart(item.productId)} className="remove-from-cart-button">Remove</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="cart-summary">
                            <div className="payment-mode-selection">
                                <label>Payment Mode:</label>
                                <input
                                    type="radio"
                                    id="cash"
                                    name="paymentMode"
                                    value="Cash"
                                    checked={paymentMode === 'Cash'}
                                    onChange={() => setPaymentMode('Cash')}
                                />
                                <label htmlFor="cash">Cash</label>

                                <input
                                    type="radio"
                                    id="online"
                                    name="paymentMode"
                                    value="Online"
                                    checked={paymentMode === 'Online'}
                                    onChange={() => setPaymentMode('Online')}
                                />
                                <label htmlFor="online">Online</label>
                            </div>

                            <h4>Total: ₹{calculateTotal().toFixed(2)}</h4>
                            <button onClick={recordSale} className="record-sale-button">Record Sale</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SalesRecording;