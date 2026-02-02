import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BackButton from '../components/BackButton';
import './Employees.css'; // Reusing common styles from Employees.css

const Departments = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedDept, setSelectedDept] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        active: true
    });

    const canManageDept = user?.role === 'ADMIN' || user?.role === 'HR';

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const response = await departmentAPI.getAll();
            setDepartments(response.data);
        } catch (error) {
            console.error('Error fetching departments:', error);
            toast.error('Failed to fetch departments');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedDept) {
                await departmentAPI.update(selectedDept.id, formData);
                toast.success('Department updated successfully!');
            } else {
                await departmentAPI.create(formData);
                toast.success('Department created successfully!');
            }
            setShowModal(false);
            resetForm();
            fetchDepartments();
        } catch (error) {
            toast.error(error.response?.data?.error || error.message || 'An error occurred');
        }
    };

    const handleEdit = (dept) => {
        setSelectedDept(dept);
        setFormData({
            name: dept.name || '',
            description: dept.description || '',
            active: dept.active ?? true
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            active: true
        });
        setSelectedDept(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this department?')) {
            try {
                await departmentAPI.delete(id);
                toast.success('Department deleted successfully!');
                fetchDepartments();
            } catch (error) {
                toast.error('Error deleting department');
            }
        }
    };

    return (
        <div className="employees-page">
            <BackButton to="/dashboard" label="Back to Dashboard" />
            <div className="employees-header">
                <h1>🏢 Departments</h1>
                {canManageDept && (
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                    >
                        + Add Department
                    </button>
                )}
            </div>

            {loading ? (
                <div className="loading">Loading departments...</div>
            ) : (
                <div className="table-container glass-card">
                    <table className="employees-table">
                        <thead>
                            <tr>
                                <th>Department</th>
                                <th>Description</th>
                                <th>Status</th>
                                {canManageDept && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {departments.length > 0 ? (
                                departments.map((dept) => (
                                    <tr key={dept.id}>
                                        <td>
                                            <div className="employee-cell">
                                                <div className="employee-avatar-small" style={{ borderRadius: '8px' }}>
                                                    {dept.name?.[0]?.toUpperCase()}
                                                </div>
                                                <div className="employee-name-id">
                                                    <span className="name">{dept.name}</span>
                                                    <span className="id">ID: {dept.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{dept.description || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${dept.active ? 'active' : 'exited'}`}>
                                                {dept.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        {canManageDept && (
                                            <td>
                                                <div className="action-buttons">
                                                    <button onClick={() => handleEdit(dept)} className="btn-icon" title="Edit">✏️</button>
                                                    <button onClick={() => handleDelete(dept.id)} className="btn-icon danger" title="Delete">🗑️</button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={canManageDept ? 4 : 3} className="no-data">No departments found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {departments.length === 0 && !loading && (
                <div className="no-data">No departments found</div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{selectedDept ? 'Edit Department' : 'Add New Department'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                                <input
                                    type="text"
                                    placeholder="Department Name *"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                                <textarea
                                    placeholder="Description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={{
                                        padding: '0.75rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        minHeight: '100px'
                                    }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                                    <input
                                        type="checkbox"
                                        id="active"
                                        checked={formData.active}
                                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                        style={{ width: 'auto' }}
                                    />
                                    <label htmlFor="active">Active</label>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">
                                    {selectedDept ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Departments;
