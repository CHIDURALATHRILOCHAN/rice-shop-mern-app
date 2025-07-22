import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        window.location.href = '/login'; // Redirect to login page
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h2>Welcome, {username} ({role})</h2>
                <button onClick={handleLogout} className="logout-button">Logout</button>
            </header>
            <nav className="dashboard-nav">
                {role === 'admin' && ( // Admin specific links
                    <>
                        <a href="/products-manage">Manage Products</a>
                        <a href="/users-manage">Manage Users</a>
                        <a href="/reports">View Reports</a>
                        <a href="/returns">Process Returns</a> {/* <-- ADD THIS LINK for Admin */}
                    </>
                )}
                {role === 'sales' && ( // Sales specific links
                    <>
                        <a href="/sales">Record Sale</a>
                        <a href="/products-list">View Products</a>
                        <a href="/returns">Process Returns</a> {/* <-- ADD THIS LINK for Sales */}
                    </>
                )}
                {/* Add other role-based links as needed */}
            </nav>
            <div className="dashboard-content">
                <p>Select an option from the navigation above.</p>
            </div>
        </div>
    );
};

export default Dashboard;