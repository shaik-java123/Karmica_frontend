import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BackButton from '../components/BackButton';
import Icon from '../components/Icon';
import './Inventory.css';

const Inventory = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const isHR = ['ADMIN', 'HR'].includes(user?.role);

    const [activeTab, setActiveTab] = useState('items'); // items | myRequests | allRequests (HR Only)

    // Data states
    const [items, setItems] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showItemModal, setShowItemModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);

    // Form states
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemForm, setItemForm] = useState({ name: '', category: 'SYSTEM', description: '', stockQuantity: 0, threshold: 5, status: 'AVAILABLE' });
    const [requestForm, setRequestForm] = useState({ itemId: '', quantity: 1, reason: '' });

    const [processForm, setProcessForm] = useState({ id: null, action: 'APPROVED', comments: '' });

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    useEffect(() => {
        loadData();
    }, [activeTab]); // eslint-disable-next-line react-hooks/exhaustive-deps

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'items') {
                const res = await inventoryAPI.getItems();
                setItems(res.data || []);
            } else if (activeTab === 'myRequests') {
                const res = await inventoryAPI.getMyRequests();
                setMyRequests(res.data || []);
            } else if (activeTab === 'allRequests' && isHR) {
                const res = await inventoryAPI.getAllRequests();
                setAllRequests(res.data || []);
            }
        } catch (error) {
            showToast('Failed to load inventory data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        try {
            if (selectedItem) {
                await inventoryAPI.updateItem(selectedItem.id, itemForm);
                showToast('Item updated successfully', 'success');
            } else {
                await inventoryAPI.createItem(itemForm);
                showToast('Item created successfully', 'success');
            }
            setShowItemModal(false);
            loadData();
        } catch (error) {
            showToast('Failed to save item', 'error');
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm('Are you sure you want to delete this inventory item?')) return;
        try {
            await inventoryAPI.deleteItem(id);
            showToast('Item deleted', 'success');
            loadData();
        } catch (error) {
            showToast('Failed to delete item', 'error');
        }
    };

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        try {
            await inventoryAPI.createRequest(requestForm);
            showToast('Request submitted successfully', 'success');
            setShowRequestModal(false);
            if (activeTab === 'myRequests') loadData();
        } catch (error) {
            showToast('Failed to submit request', 'error');
        }
    };

    const handleProcessRequest = async (e) => {
        e.preventDefault();
        try {
            await inventoryAPI.processRequest(processForm.id, processForm.action, processForm.comments);
            showToast(`Request ${processForm.action.toLowerCase()}`, 'success');
            setShowProcessModal(false);
            loadData();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to process request', 'error');
        }
    };

    const openRequestModal = (item) => {
        setSelectedItem(item);
        setRequestForm({ itemId: item.id, quantity: 1, reason: '' });
        setShowRequestModal(true);
    };

    const openItemModal = (item = null) => {
        setSelectedItem(item);
        if (item) {
            setItemForm({ ...item });
        } else {
            setItemForm({ name: '', category: 'SYSTEM', description: '', stockQuantity: 0, threshold: 5, status: 'AVAILABLE' });
        }
        setShowItemModal(true);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'AVAILABLE':
            case 'APPROVED':
            case 'FULFILLED': return 'status-success';
            case 'PENDING': return 'status-warning';
            case 'REJECTED':
            case 'OUT_OF_STOCK':
            case 'DISCONTINUED': return 'status-danger';
            case 'RETURNED': return 'status-info';
            default: return 'status-neutral';
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'SYSTEM': return 'system';
            case 'PROJECTOR': return 'monitor';
            case 'NOTE': return 'edit';
            case 'ACCESSORY': return 'settings';
            case 'FURNITURE': return 'folder';
            default: return 'folder';
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="inventory-container fade-in">
            <header className="inventory-header glass-card">
                <div className="header-left">
                    <BackButton />
                    <h1>
                        <Icon name="tasks" size={28} className="header-icon" />
                        Office Inventory Procurement
                    </h1>
                </div>
                <div className="header-right">
                    {activeTab === 'items' && isHR && (
                        <button className="btn btn-primary" onClick={() => openItemModal()}>
                            <Icon name="plus" size={16} /> Add New Item
                        </button>
                    )}
                </div>
            </header>

            <div className="inventory-tabs">
                <div className="tabs-main">
                    <button className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>
                        <Icon name="folder" size={18} /> Available Items
                    </button>
                    <button className={`tab-btn ${activeTab === 'myRequests' ? 'active' : ''}`} onClick={() => setActiveTab('myRequests')}>
                        <Icon name="trending" size={18} /> My Requests
                    </button>
                    {isHR && (
                        <button className={`tab-btn ${activeTab === 'allRequests' ? 'active' : ''}`} onClick={() => setActiveTab('allRequests')}>
                            <Icon name="users" size={18} /> Manage Requests
                        </button>
                    )}
                </div>

                {activeTab === 'items' && (
                    <div className="filter-bar glass-card">
                        <div className="search-input-wrapper">
                            <Icon name="info" size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search items (e.g. Notebook, Projector)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="filter-input"
                            />
                        </div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="SYSTEM">Systems</option>
                            <option value="PROJECTOR">Projectors</option>
                            <option value="NOTE">Stationery / Notebooks</option>
                            <option value="ACCESSORY">Accessories</option>
                            <option value="FURNITURE">Furniture</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="inventory-content">
                {loading ? (
                    <div className="loading-state glass-card">
                        <Icon name="loading" size={48} className="animate-spin" color="#60a5fa" />
                        <p>Loading inventory data...</p>
                    </div>
                ) : (
                    <>
                        {/* ITEMS TAB */}
                        {activeTab === 'items' && (
                            <div className="items-grid">
                                {filteredItems.length === 0 ? (
                                    <div className="empty-state glass-card">
                                        <Icon name="info" size={48} color="rgba(255,255,255,0.2)" />
                                        <p>No items found matching your filters.</p>
                                    </div>
                                ) : (
                                    filteredItems.map(item => (
                                        <div key={item.id} className="item-card glass-card">
                                            <div className="item-card-header">
                                                <div className={`item-category-badge ${item.category.toLowerCase()}`}>
                                                    <Icon name="info" size={14} /> {item.category}
                                                </div>
                                                <span className={`status-badge ${getStatusClass(item.status)}`}>{item.status}</span>
                                            </div>
                                            <h3>{item.name}</h3>
                                            <p className="item-desc">{item.description}</p>

                                            <div className="item-stats">
                                                <div className="stat">
                                                    <span className="label">Stock</span>
                                                    <span className={`value ${item.stockQuantity <= item.threshold ? 'low-stock' : ''}`}>
                                                        {item.stockQuantity}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="item-actions">
                                                {item.status === 'AVAILABLE' && item.stockQuantity > 0 ? (
                                                    <button className="btn btn-primary btn-block" onClick={() => openRequestModal(item)}>
                                                        Request Item
                                                    </button>
                                                ) : (
                                                    <button className="btn btn-secondary btn-block disabled" disabled>
                                                        Currently Unavailable
                                                    </button>
                                                )}

                                                {isHR && (
                                                    <div className="hr-actions">
                                                        <button className="icon-btn edit-btn" onClick={() => openItemModal(item)}>
                                                            <Icon name="edit" size={16} />
                                                        </button>
                                                        <button className="icon-btn delete-btn" onClick={() => handleDeleteItem(item.id)}>
                                                            <Icon name="trash" size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* MY REQUESTS TAB */}
                        {activeTab === 'myRequests' && (
                            <div className="requests-container">
                                {myRequests.length === 0 ? (
                                    <div className="empty-state glass-card">You have no pending requests.</div>
                                ) : (
                                    <table className="inventory-table glass-card">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Qty</th>
                                                <th>Status</th>
                                                <th>Date Requested</th>
                                                <th>Comments</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myRequests.map(req => (
                                                <tr key={req.id}>
                                                    <td>
                                                        <div className="table-item-info">
                                                            <span className="font-bold">{req.item.name}</span>
                                                            <span className="text-sm muted">{req.item.category}</span>
                                                        </div>
                                                    </td>
                                                    <td>{req.quantity}</td>
                                                    <td><span className={`status-badge ${getStatusClass(req.status)}`}>{req.status}</span></td>
                                                    <td>{formatDate(req.requestDate)}</td>
                                                    <td className="max-w-xs">{req.comments || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* ALL REQUESTS TAB (HR) */}
                        {activeTab === 'allRequests' && isHR && (
                            <div className="requests-container">
                                {allRequests.length === 0 ? (
                                    <div className="empty-state glass-card">No employee requests found.</div>
                                ) : (
                                    <table className="inventory-table glass-card">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Item</th>
                                                <th>Qty</th>
                                                <th>Reason</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allRequests.map(req => (
                                                <tr key={req.id}>
                                                    <td>
                                                        <div className="table-item-info">
                                                            <span className="font-bold">{req.employee.firstName} {req.employee.lastName}</span>
                                                            <span className="text-sm muted">{req.employee.email}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="table-item-info">
                                                            <span className="font-bold">{req.item.name}</span>
                                                            <span className="text-sm muted">Stock: {req.item.stockQuantity}</span>
                                                        </div>
                                                    </td>
                                                    <td>{req.quantity}</td>
                                                    <td className="max-w-xs">{req.reason}</td>
                                                    <td><span className={`status-badge ${getStatusClass(req.status)}`}>{req.status}</span></td>
                                                    <td>
                                                        {req.status === 'PENDING' && (
                                                            <button
                                                                className="btn btn-sm btn-primary"
                                                                onClick={() => {
                                                                    setProcessForm({ id: req.id, action: 'APPROVED', comments: '' });
                                                                    setShowProcessModal(true);
                                                                }}
                                                            >
                                                                Process
                                                            </button>
                                                        )}
                                                        {req.status === 'APPROVED' && (
                                                            <button
                                                                className="btn btn-sm btn-success"
                                                                onClick={() => {
                                                                    setProcessForm({ id: req.id, action: 'FULFILLED', comments: 'Item distributed to employee' });
                                                                    setShowProcessModal(true);
                                                                }}
                                                            >
                                                                Fulfill
                                                            </button>
                                                        )}
                                                        {req.status === 'FULFILLED' && (
                                                            <button
                                                                className="btn btn-sm btn-secondary"
                                                                onClick={() => {
                                                                    setProcessForm({ id: req.id, action: 'RETURNED', comments: 'Item returned to inventory' });
                                                                    setShowProcessModal(true);
                                                                }}
                                                            >
                                                                Mark Returned
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* REQUEST ITEM MODAL */}
            {showRequestModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card">
                        <div className="modal-header">
                            <h2>Request {selectedItem?.name}</h2>
                            <button className="icon-btn" onClick={() => setShowRequestModal(false)}>
                                <Icon name="x" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitRequest}>
                            <div className="form-group">
                                <label>Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedItem?.stockQuantity}
                                    value={requestForm.quantity}
                                    onChange={e => setRequestForm({ ...requestForm, quantity: e.target.value })}
                                    className="form-input"
                                    required
                                />
                                <small className="text-muted">Available stock: {selectedItem?.stockQuantity}</small>
                            </div>
                            <div className="form-group">
                                <label>Reason for Request</label>
                                <textarea
                                    value={requestForm.reason}
                                    onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })}
                                    className="form-input"
                                    rows="3"
                                    placeholder="Briefly explain why you need this item..."
                                    required
                                ></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MANAGE ITEM MODAL (HR) */}
            {showItemModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card wide">
                        <div className="modal-header">
                            <h2>{selectedItem ? 'Edit Item' : 'Add New Inventory Item'}</h2>
                            <button className="icon-btn" onClick={() => setShowItemModal(false)}>
                                <Icon name="x" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveItem}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Item Name</label>
                                    <input type="text" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className="form-input" required />
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} className="form-input">
                                        <option value="SYSTEM">System/Computer</option>
                                        <option value="PROJECTOR">Projector/Display</option>
                                        <option value="NOTE">Notebooks/Stationery</option>
                                        <option value="ACCESSORY">Accessories (Mouse, KB)</option>
                                        <option value="FURNITURE">Office Furniture</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} className="form-input" rows="2" required></textarea>
                            </div>
                            <div className="form-row three-col">
                                <div className="form-group">
                                    <label>Stock Quantity</label>
                                    <input type="number" min="0" value={itemForm.stockQuantity} onChange={e => setItemForm({ ...itemForm, stockQuantity: parseInt(e.target.value) })} className="form-input" required />
                                </div>
                                <div className="form-group">
                                    <label>Alert Threshold</label>
                                    <input type="number" min="0" value={itemForm.threshold} onChange={e => setItemForm({ ...itemForm, threshold: parseInt(e.target.value) })} className="form-input" required />
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select value={itemForm.status} onChange={e => setItemForm({ ...itemForm, status: e.target.value })} className="form-input">
                                        <option value="AVAILABLE">Available</option>
                                        <option value="OUT_OF_STOCK">Out of Stock</option>
                                        <option value="DISCONTINUED">Discontinued</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PROCESS REQUEST MODAL (HR) */}
            {showProcessModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card">
                        <div className="modal-header">
                            <h2>Process Request</h2>
                            <button className="icon-btn" onClick={() => setShowProcessModal(false)}>
                                <Icon name="x" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleProcessRequest}>
                            <div className="form-group">
                                <label>Action</label>
                                <select
                                    className="form-input"
                                    value={processForm.action}
                                    onChange={e => setProcessForm({ ...processForm, action: e.target.value })}
                                >
                                    {processForm.action === 'APPROVED' || processForm.action === 'REJECTED' || processForm.action === 'PENDING' ? (
                                        <>
                                            <option value="APPROVED">Approve (Deducts Stock)</option>
                                            <option value="REJECTED">Reject</option>
                                        </>
                                    ) : processForm.action === 'FULFILLED' ? (
                                        <option value="FULFILLED">Mark Fulfilled (Handed Over)</option>
                                    ) : (
                                        <option value="RETURNED">Mark Returned (Restocks)</option>
                                    )}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Comments / Notes</label>
                                <textarea
                                    value={processForm.comments}
                                    onChange={e => setProcessForm({ ...processForm, comments: e.target.value })}
                                    className="form-input"
                                    rows="3"
                                    placeholder="HR comments for the employee..."
                                ></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowProcessModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-success">Update Status</button>
                            </div>
                        </form>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default Inventory;
