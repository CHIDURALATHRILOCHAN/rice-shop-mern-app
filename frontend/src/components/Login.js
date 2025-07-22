import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

// Get backend URL from environment variable
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const { username, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        try {
            const response = await fetch(`${BACKEND_URL}/users/login`, { // Updated URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Login successful! Welcome, ' + data.username);
                setIsError(false);
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role);
                localStorage.setItem('username', data.username);

                navigate('/dashboard');
            } else {
                setMessage(data.msg || data.Error || 'Login failed. Please check your credentials.');
                setIsError(true);
            }
        } catch (err) {
            console.error('Login error:', err);
            setMessage('Network error or server unavailable.');
            setIsError(true);
        }
    };

    return (
        <div className="login-container">
            <h2>Login to Rice Shop Management</h2>
            <form onSubmit={onSubmit}>
                <div className="form-group">
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={username}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={password}
                        onChange={onChange}
                        required
                    />
                </div>
                <button type="submit" className="login-button">Login</button>
            </form>
            {message && (
                <p className={`message ${isError ? 'error' : 'success'}`}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default Login;