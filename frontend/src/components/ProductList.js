import React, { useState, useEffect } from 'react';
import './ProductList.css';

const BAG_SIZE_KG = 25;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // Get backend URL

const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    useEffect(() => {
        if (userRole === 'admin' || userRole === 'sales' || userRole === 'manager') {
            fetchProducts();
        } else {
            setMessage("You don't have permission to view the product list.");
            setIsError(true);
        }
    }, [token, userRole]);

    const fetchProducts = async () => {
        setMessage('');
        setIsError(false);
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
                setMessage(data.msg || 'Failed to fetch products.');
                setIsError(true);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
            setMessage('Network error while fetching products.');
            setIsError(true);
        }
    };

    return (
        <div className="product-list-view-container">
            <h2>Available Products</h2>

            {message && (
                <p className={`message ${isError ? 'error' : 'success'}`}>
                    {message}
                </p>
            )}

            {(userRole === 'admin' || userRole === 'sales' || userRole === 'manager') ? (
                <div className="product-display-section">
                    {products.length === 0 ? (
                        <p>No products found.</p>
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            ) : (
                <p className="unauthorized-message">You do not have permission to view the product list.</p>
            )}
        </div>
    );
};

export default ProductList;