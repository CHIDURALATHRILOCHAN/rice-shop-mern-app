import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProductManagement from './components/ProductManagement';
import SalesRecording from './components/SalesRecording';
import Reports from './components/Reports';
import UserManagement from './components/UserManagement';
import ProductList from './components/ProductList';
import ReturnsProcessing from './components/ReturnsProcessing'; // <-- ADD THIS LINE

// A simple PrivateRoute component to protect routes (same as before)
const PrivateRoute = ({ children, allowedRoles = [] }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return <div className="unauthorized-message">You do not have permission to view this page.</div>;
    }

    return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default/Root Route - Always show Login component */}
          <Route path="/" element={<Login />} />

          {/* Explicit Login Route (can still exist for direct navigation) */}
          <Route path="/login" element={<Login />} />

          {/* Protected Dashboard Route - Accessible to any logged-in user */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={['admin', 'sales', 'manager']}>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Product Management for Admins only */}
          <Route
            path="/products-manage"
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <ProductManagement />
              </PrivateRoute>
            }
          />

          {/* Sales Recording for Sales or Admin users */}
          <Route
            path="/sales"
            element={
              <PrivateRoute allowedRoles={['sales', 'admin']}>
                <SalesRecording />
              </PrivateRoute>
            }
          />

          {/* Reports for Admin or Manager users */}
          <Route
            path="/reports"
            element={
              <PrivateRoute allowedRoles={['admin', 'manager']}>
                <Reports />
              </PrivateRoute>
            }
          />

          {/* User Management for Admin or Manager users */}
          <Route
            path="/users-manage"
            element={
              <PrivateRoute allowedRoles={['admin', 'manager']}>
                <UserManagement />
              </PrivateRoute>
            }
          />

          {/* Product List for Sales, Admin, or Manager users */}
          <Route
            path="/products-list"
            element={
              <PrivateRoute allowedRoles={['sales', 'admin', 'manager']}>
                <ProductList />
              </PrivateRoute>
            }
          />

          {/* Returns Processing for Sales or Admin users */}
          <Route
            path="/returns" // <-- ADD THIS ROUTE
            element={
              <PrivateRoute allowedRoles={['sales', 'admin']}>
                <ReturnsProcessing /> {/* <-- ADD THIS COMPONENT */}
              </PrivateRoute>
            }
          />

          {/* Add more routes here for other features */}

        </Routes>
      </div>
    </Router>
  );
}

export default App;