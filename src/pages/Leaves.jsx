import React, { useState, useEffect } from 'react';
import { leaveAPI, configAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BackButton from '../components/BackButton';
import './Leaves.css';
import './Employees.css'; // Import Employees.css for table styles

const Leaves = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [leaves, setLeaves] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('my');
    const [formData, setFormData] = useState({
        leaveType: 'CASUAL_LEAVE',
        startDate: '',
        endDate: '',
        reason: ''
    });

    const [leaveTypes, setLeaveTypes] = useState([]);

    const canApproveLeaves = ['ADMIN', 'HR', 'MANAGER'].includes(user?.role);

    useEffect(() => {
        fetchLeaves();
        fetchLeaveTypes();
    }, [activeTab]);

    const fetchLeaveTypes = async () => {
        try {
            const res = await configAPI.getLeaveTypes();
            setLeaveTypes(res.data);
            if (res.data.length > 0) {
                setFormData(prev => ({ ...prev, leaveType: res.data[0].code }));
            }
        } catch (error) {
            console.error(error);
        }
    };




    const fetchLeaves = async () => {
        try {
            setLoading(true);
            let response;
            if (activeTab === 'my') {
                response = await leaveAPI.getMyLeaves();
                setLeaves(response.data.leaves || []);
            } else if (activeTab === 'pending' && canApproveLeaves) {
                response = await leaveAPI.getPending();
                setLeaves(response.data || []);
            } else if (activeTab === 'team' && canApproveLeaves) {
                response = await leaveAPI.getTeamLeaves();
                setLeaves(response.data.leaves || []);
            } else if (activeTab === 'all' && (user?.role === 'ADMIN' || user?.role === 'HR')) {
                response = await leaveAPI.getAll();
                setLeaves(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await leaveAPI.apply(formData);
            toast.success('Leave application submitted successfully!');
            setShowModal(false);
            resetForm();
            fetchLeaves();
        } catch (error) {
            toast.error(error.response?.data?.error || error.message || 'An error occurred');
        }
    };

    const handleApprove = async (id) => {
        const comments = prompt('Approval comments (optional):', 'Approved');
        if (comments !== null) {
            try {
                await leaveAPI.approve(id, { comments });
                toast.success('Leave approved successfully!');
                fetchLeaves();
                if (showViewModal) setShowViewModal(false);
            } catch (error) {
                toast.error('Error approving leave');
            }
        }
    };

    const handleReject = async (id) => {
        const comments = prompt('Rejection reason (required):');
        if (comments) {
            try {
                await leaveAPI.reject(id, { comments });
                toast.success('Leave rejected successfully!');
                fetchLeaves();
                if (showViewModal) setShowViewModal(false);
            } catch (error) {
                toast.error('Error rejecting leave');
            }
        }
    };

    const handleCancel = async (id) => {
        if (window.confirm('Cancel this leave application?')) {
            try {
                await leaveAPI.cancel(id);
                toast.success('Leave cancelled successfully!');
                fetchLeaves();
                if (showViewModal) setShowViewModal(false);
            } catch (error) {
                toast.error('Error cancelling leave');
            }
        }
    };

    const handleView = (leave) => {
        setSelectedLeave(leave);
        setShowViewModal(true);
    };

    const resetForm = () => {
        setFormData({
            leaveType: 'CASUAL_LEAVE',
            startDate: '',
            endDate: '',
            reason: ''
        });
    };

    return (
        <div className="leaves-page">
            <BackButton to="/dashboard" label="Back to Dashboard" />
            <div className="leaves-header">
                <h1>🏖️ Leave Management</h1>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + Apply Leave
                </button>
            </div>

            <div className="tabs">
                <button
                    className={activeTab === 'my' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('my')}
                >
                    My Leaves
                </button>
                {canApproveLeaves && (
                    <>
                        <button
                            className={activeTab === 'pending' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('pending')}
                        >
                            Pending Approvals
                        </button>
                        <button
                            className={activeTab === 'team' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('team')}
                        >
                            Team Leaves
                        </button>
                    </>
                )}
                {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                    <button
                        className={activeTab === 'all' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('all')}
                    >
                        All Leaves
                    </button>
                )}
            </div>

            {loading ? (
                <div className="loading">Loading leaves...</div>
            ) : (
                <div className="table-container glass-card">
                    <table className="employees-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Leave Type</th>
                                <th>Duration</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.length > 0 ? (
                                leaves.map((leave) => (
                                    <tr key={leave.id}>
                                        <td>
                                            <div className="employee-cell">
                                                <div className="employee-avatar-small">
                                                    {leave.employee?.photoUrl ? (
                                                        <img src={leave.employee.photoUrl} alt="Avatar" />
                                                    ) : (
                                                        `${leave.employee?.firstName?.[0] || '?'}${leave.employee?.lastName?.[0] || '?'}`
                                                    )}
                                                </div>
                                                <div className="employee-name-id">
                                                    <span className="name">{leave.employee?.firstName} {leave.employee?.lastName}</span>
                                                    <span className="id">{leave.employee?.employeeId}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{leave.leaveType?.name || leave.leaveType?.code}</td>
                                        <td>
                                            <div className="contact-info">
                                                <span className="info-row">From: {leave.startDate}</span>
                                                <span className="info-row">To: {leave.endDate}</span>
                                                <span className="info-row">({leave.numberOfDays} days)</span>
                                            </div>
                                        </td>
                                        <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {leave.reason}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${leave.status?.toLowerCase()}`}>
                                                {leave.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => handleView(leave)} className="btn-icon" title="View Details">👁️</button>

                                                {leave.status === 'PENDING' && canApproveLeaves && activeTab !== 'my' && (
                                                    <>
                                                        <button onClick={() => handleApprove(leave.id)} className="btn-icon success" title="Approve">✓</button>
                                                        <button onClick={() => handleReject(leave.id)} className="btn-icon danger" title="Reject">✗</button>
                                                    </>
                                                )}
                                                {leave.status === 'PENDING' && activeTab === 'my' && (
                                                    <button onClick={() => handleCancel(leave.id)} className="btn-icon danger" title="Cancel">🗑️</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="no-data">No leave applications found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* View Modal */}
            {showViewModal && selectedLeave && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Leave Details</h2>
                        <div className="view-profile-header">
                            <div className="profile-avatar-large">
                                {selectedLeave.employee?.photoUrl ? (
                                    <img src={selectedLeave.employee.photoUrl} alt="Avatar" />
                                ) : (
                                    `${selectedLeave.employee?.firstName?.[0] || '?'}${selectedLeave.employee?.lastName?.[0] || '?'}`
                                )}
                            </div>
                            <div className="profile-title">
                                <h3>{selectedLeave.employee?.firstName} {selectedLeave.employee?.lastName}</h3>
                                <span className={`status-badge ${selectedLeave.status?.toLowerCase()}`}>
                                    {selectedLeave.status}
                                </span>
                            </div>
                        </div>

                        <div className="view-grid">
                            <div className="view-section">
                                <h4>Leave Information</h4>
                                <div className="info-item"><label>Type:</label> <span>{selectedLeave.leaveType?.name || selectedLeave.leaveType?.code}</span></div>
                                <div className="info-item"><label>From:</label> <span>{selectedLeave.startDate}</span></div>
                                <div className="info-item"><label>To:</label> <span>{selectedLeave.endDate}</span></div>
                                <div className="info-item"><label>Total Days:</label> <span>{selectedLeave.numberOfDays}</span></div>
                            </div>

                            <div className="view-section">
                                <h4>Reason & Comments</h4>
                                <div className="info-item" style={{ flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ width: '100%' }}>Reason:</label>
                                    <p style={{ color: 'white', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                                        {selectedLeave.reason}
                                    </p>
                                </div>
                                {selectedLeave.approverComments && (
                                    <div className="info-item" style={{ flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                                        <label style={{ width: '100%' }}>Approver Comments ({selectedLeave.status}):</label>
                                        <p style={{ color: 'white', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                                            {selectedLeave.approverComments}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-actions">
                            {selectedLeave.status === 'PENDING' && canApproveLeaves && activeTab !== 'my' && (
                                <>
                                    <button onClick={() => handleReject(selectedLeave.id)} className="btn-icon danger" style={{ background: 'rgba(239, 68, 68, 0.2)', width: 'auto', padding: '0.75rem 1.5rem', borderRadius: '8px', color: '#EF4444' }}>Reject</button>
                                    <button onClick={() => handleApprove(selectedLeave.id)} className="btn-primary">Approve</button>
                                </>
                            )}
                            <button type="button" onClick={() => setShowViewModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Apply Leave Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Apply for Leave</h2>
                        <form onSubmit={handleSubmit}>
                            <select
                                value={formData.leaveType}
                                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                                required
                            >
                                <option value="">Select Leave Type</option>
                                {leaveTypes.map(type => (
                                    <option key={type.id} value={type.code}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                required
                            />
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                required
                            />
                            <textarea
                                placeholder="Reason for leave *"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                rows="4"
                                required
                            />
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaves;
