import React, { useState, useEffect } from 'react';
import './UserManagement.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // Get backend URL

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'sales'
    });
    const [editingUser, setEditingUser] = useState(null);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    const loggedInUsername = localStorage.getItem('username'); // Get logged-in user's username

    useEffect(() => {
        if (userRole === 'admin' || userRole === 'manager') {
            fetchUsers();
        } else {
            setMessage("You don't have permission to view user management.");
            setIsError(true);
        }
    }, [token, userRole]);

    const fetchUsers = async () => {
        setMessage('');
        setIsError(false);
        try {
            const response = await fetch(`${BACKEND_URL}/users`, { // Updated URL
                headers: {
                    'x-auth-token': token
                }
            });
            const data = await response.json();

            if (response.ok) {
                // Filter out the currently logged-in user from the list to prevent self-deletion/role change issues
                setUsers(data.filter(user => user.username !== loggedInUsername));
            } else {
                setMessage(data.msg || 'Failed to fetch users.');
                setIsError(true);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            setMessage('Network error while fetching users.');
            setIsError(true);
        }
    };

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onAddOrUpdateSubmit = async e => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        const method = editingUser ? 'POST' : 'POST';
        const url = editingUser ? `${BACKEND_URL}/users/update/${editingUser._id}` : `${BACKEND_URL}/users/register`; // Updated URL

        const payload = editingUser ? { username: formData.username, role: formData.role } : formData;
        if (editingUser && !formData.password) {
            delete payload.password;
        }

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
                setMessage(editingUser ? 'User updated successfully!' : 'User added successfully!');
                setIsError(false);
                setFormData({ username: '', password: '', role: 'sales' });
                setEditingUser(null);
                fetchUsers();
            } else {
                setMessage(data.msg || (editingUser ? 'Failed to update user.' : 'Failed to add user.'));
                setIsError(true);
            }
        } catch (err) {
            console.error('Submit user error:', err);
            setMessage('Network error during user submission.');
            setIsError(true);
        }
    };

    const onEdit = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            role: user.role
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const onDelete = async (id, usernameToDelete) => {
        if (window.confirm(`Are you sure you want to delete user ${usernameToDelete}?`)) {
            setMessage('');
            setIsError(false);
            try {
                const response = await fetch(`${BACKEND_URL}/users/${id}`, { // Updated URL
                    method: 'DELETE',
                    headers: {
                        'x-auth-token': token
                    }
                });
                const data = await response.json();

                if (response.ok) {
                    setMessage('User deleted successfully!');
                    setIsError(false);
                    fetchUsers();
                } else {
                    setMessage(data.msg || 'Failed to delete user.');
                    setIsError(true);
                }
            } catch (err) {
                console.error('Delete user error:', err);
                setMessage('Network error during user deletion.');
                setIsError(true);
            }
        }
    };

    return (
        <div className="user-management-container">
            <h2>User Management</h2>

            {message && (
                <p className={`message ${isError ? 'error' : 'success'}`}>
                    {message}
                </p>
            )}

            {(userRole === 'admin' || userRole === 'manager') ? (
                <>
                    <div className="add-user-section">
                        <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
                        <form onSubmit={onAddOrUpdateSubmit} className="add-user-form">
                            <div className="form-group">
                                <label>Username:</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={onChange}
                                    required
                                    disabled={!!editingUser}
                                />
                            </div>
                            <div className="form-group">
                                <label>Password: {editingUser && <small>(Leave blank to keep current)</small>}</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={onChange}
                                    required={!editingUser}
                                    minLength={editingUser ? undefined : "6"}
                                />
                            </div>
                            <div className="form-group">
                                <label>Role:</label>
                                <select name="role" value={formData.role} onChange={onChange} required>
                                    <option value="sales">Sales</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <button type="submit" className="add-user-button">
                                {editingUser ? 'Update User' : 'Add User'}
                            </button>
                            {editingUser && (
                                <button
                                    type="button"
                                    onClick={() => { setEditingUser(null); setFormData({username: '', password: '', role: 'sales'}); }}
                                    className="cancel-button"
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </form>
                    </div>

                    <div className="user-list-section">
                        <h3>Existing Users</h3>
                        {users.length === 0 ? (
                            <p>No users found (excluding your own account).</p>
                        ) : (
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Role</th>
                                        <th>Created At</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user._id}>
                                            <td>{user.username}</td>
                                            <td>{user.role}</td>
                                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td className="actions-cell">
                                                <button onClick={() => onEdit(user)} className="edit-button">Edit</button>
                                                <button onClick={() => onDelete(user._id, user.username)} className="delete-button">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            ) : (
                <p className="unauthorized-message">You do not have permission to view user management.</p>
            )}
        </div>
    );
};

export default UserManagement;