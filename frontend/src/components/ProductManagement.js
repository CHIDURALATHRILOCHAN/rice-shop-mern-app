import React, { useState, useEffect } from 'react';
import './ProductManagement.css';

const BAG_SIZE_KG = 25;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // Get backend URL

const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Basmati',
        currentStockBags: '',
        pricePerBag: '',
        costPricePerBag: ''
    });
    const [editingProduct, setEditingProduct] = useState(null);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const userRole = localStorage.getItem('role');
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchProducts();
    }, []);

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
                setMessage(data.msg || 'Failed to fetch products.');
                setIsError(true);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
            setMessage('Network error while fetching products.');
            setIsError(true);
        }
    };

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        const method = editingProduct ? 'POST' : 'POST';
        const url = editingProduct ? `${BACKEND_URL}/products/update/${editingProduct._id}` : `${BACKEND_URL}/products/add`; // Updated URL

        const payload = {
            name: formData.name,
            type: formData.type,
            currentStockBags: Number(formData.currentStockBags),
            pricePerBag: Number(formData.pricePerBag),
            costPricePerBag: Number(formData.costPricePerBag)
        };

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
                setIsError(false);
                setFormData({
                    name: '', type: 'Basmati',
                    currentStockBags: '', pricePerBag: '', costPricePerBag: ''
                });
                setEditingProduct(null);
                fetchProducts();
            } else {
                setMessage(data.msg || (editingProduct ? 'Failed to update product.' : 'Failed to add product.'));
                setIsError(true);
            }
        } catch (err) {
            console.error('Submit product error:', err);
            setMessage('Network error during product submission.');
            setIsError(true);
        }
    };

    const onEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            type: product.type,
            currentStockBags: product.currentStockBags,
            pricePerBag: product.pricePerBag,
            costPricePerBag: product.costPricePerBag ?? ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const onDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            setMessage('');
            setIsError(false);
            try {
                const response = await fetch(`${BACKEND_URL}/products/${id}`, { // Updated URL
                    method: 'DELETE',
                    headers: {
                        'x-auth-token': token
                    }
                });
                const data = await response.json();

                if (response.ok) {
                    setMessage('Product deleted successfully!');
                    setIsError(false);
                    fetchProducts();
                } else {
                    setMessage(data.msg || 'Failed to delete product.');
                    setIsError(true);
                }
            }
            catch (err) {
                console.error('Delete product error:', err);
                setMessage('Network error during product deletion.');
                setIsError(true);
            }
        }
    };

    return (
        <div className="product-management-container">
            <h2>Product Management</h2>

            {message && (
                <p className={`message ${isError ? 'error' : 'success'}`}>
                    {message}
                </p>
            )}

            {userRole === 'admin' && (
                <div className="product-form-section">
                    <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                    <form onSubmit={onSubmit} className="product-form">
                        <div className="form-group">
                            <label>Name:</label>
                            <input type="text" name="name" value={formData.name} onChange={onChange} required />
                        </div>
                        <div className="form-group">
                            <label>Type:</label>
                            <select name="type" value={formData.type} onChange={onChange} required>
                                <option value="Basmati">Basmati</option>
                                <option value="Raw Rice">Raw Rice</option>
                                <option value="Steam Rice">Steam Rice</option>
                                <option value="HMT">HMT</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Current Stock (Bags - {BAG_SIZE_KG}kg/bag):</label>
                            <input type="number" name="currentStockBags" value={formData.currentStockBags} onChange={onChange} required min="0" />
                        </div>
                        <div className="form-group">
                            <label>Price per Bag (₹):</label>
                            <input type="number" name="pricePerBag" value={formData.pricePerBag} onChange={onChange} required min="0.01" step="0.01" />
                        </div>
                        <div className="form-group">
                            <label>Cost Price per Bag (₹ - Optional):</label>
                            <input type="number" name="costPricePerBag" value={formData.costPricePerBag} onChange={onChange} min="0" step="0.01" />
                        </div>
                        <button type="submit" className="submit-button">
                            {editingProduct ? 'Update Product' : 'Add Product'}
                        </button>
                        {editingProduct && (
                            <button type="button" onClick={() => { setEditingProduct(null); setFormData({name: '', type: 'Basmati', currentStockBags: '', pricePerBag: '', costPricePerBag: ''}); }} className="cancel-button">
                                Cancel Edit
                            </button>
                        )}
                    </form>
                </div>
            )}

            <div className="product-list-section">
                <h3>Available Products</h3>
                {products.length === 0 ? (
                    <p>No products found.</p>
                ) : (
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Stock (Bags)</th>
                                <th>Stock (kg)</th>
                                <th>Price/Bag</th>
                                <th>Price/kg (Loose)</th>
                                {userRole === 'admin' && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product._id}>
                                    <td>{product.name}</td>
                                    <td>{product.type}</td>
                                    <td>{(product.currentStockBags ?? 0)}</td>
                                    <td>{((product.currentStockBags ?? 0) * BAG_SIZE_KG).toFixed(0)}</td>
                                    <td>₹{(product.pricePerBag ?? 0).toFixed(2)}</td>
                                    <td>₹{((product.pricePerBag ?? 0) / BAG_SIZE_KG).toFixed(2)}</td>
                                    {userRole === 'admin' && (
                                        <td className="actions-cell">
                                            <button onClick={() => onEdit(product)} className="edit-button">Edit</button>
                                            <button onClick={() => onDelete(product._id)} className="delete-button">Delete</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ProductManagement;