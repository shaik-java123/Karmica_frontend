import React, { useState, useEffect } from 'react';
import { holidayAPI, policyAPI, configAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BackButton from '../components/BackButton';
import './Organization.css';

const Organization = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('holidays');
    const [loading, setLoading] = useState(false);

    // Data
    const [holidays, setHolidays] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);

    // Modals
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    // Form Data
    const [holidayForm, setHolidayForm] = useState({ name: '', date: '', type: 'PUBLIC', description: '' });
    const [policyForm, setPolicyForm] = useState({ title: '', description: '', content: '', version: '1.0' });
    const [editingId, setEditingId] = useState(null);

    const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

    useEffect(() => {
        fetchData();
        fetchLeaveTypes();
    }, [activeTab]);

    const fetchData = () => {
        if (activeTab === 'holidays') fetchHolidays();
        if (activeTab === 'policies') fetchPolicies();
    };

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const res = await holidayAPI.getAll();
            setHolidays(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const res = await policyAPI.getAll();
            setPolicies(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaveTypes = async () => {
        try {
            const res = await configAPI.getLeaveTypes();
            setLeaveTypes(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    // ----- Holiday Handlers -----
    const handleSaveHoliday = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await holidayAPI.update(editingId, holidayForm);
                showToast('Holiday updated successfully', 'success');
            } else {
                await holidayAPI.create(holidayForm);
                showToast('Holiday created successfully', 'success');
            }
            setShowHolidayModal(false);
            setEditingId(null);
            setHolidayForm({ name: '', date: '', type: 'PUBLIC', description: '' });
            fetchHolidays();
        } catch (error) {
            showToast('Failed to save holiday', 'error');
        }
    };

    const handleDeleteHoliday = async (id) => {
        if (!window.confirm('Delete this holiday?')) return;
        try {
            await holidayAPI.delete(id);
            showToast('Holiday deleted', 'success');
            fetchHolidays();
        } catch (error) {
            showToast('Failed to delete holiday', 'error');
        }
    };

    // ----- Policy Handlers -----
    const handleSavePolicy = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await policyAPI.update(editingId, policyForm);
                showToast('Policy updated successfully', 'success');
            } else {
                await policyAPI.create(policyForm);
                showToast('Policy created successfully', 'success');
            }
            setShowPolicyModal(false);
            setEditingId(null);
            setPolicyForm({ title: '', description: '', content: '', version: '1.0' });
            fetchPolicies();
        } catch (error) {
            showToast('Failed to save policy', 'error');
        }
    };

    const handleDeletePolicy = async (id) => {
        if (!window.confirm('Delete this policy?')) return;
        try {
            await policyAPI.delete(id);
            showToast('Policy deleted', 'success');
            fetchPolicies();
        } catch (error) {
            showToast('Failed to delete policy', 'error');
        }
    };

    const openEditHoliday = (h) => {
        setHolidayForm({ name: h.name, date: h.date, type: h.type, description: h.description || '' });
        setEditingId(h.id);
        setShowHolidayModal(true);
    };

    const openEditPolicy = (p) => {
        setPolicyForm({ title: p.title, description: p.description, content: p.content, version: p.version });
        setEditingId(p.id);
        setShowPolicyModal(true);
    };

    const [leaveTypeForm, setLeaveTypeForm] = useState({ name: '', code: '', description: '', active: true, defaultDaysPerYear: 0 });
    const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);

    // ... (fetchLeaveTypes stays same, just updates state)

    // ----- Leave Type Handlers -----
    const handleSaveLeaveType = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await leaveTypeAPI.update(editingId, leaveTypeForm);
                showToast('Leave Type updated successfully', 'success');
            } else {
                await leaveTypeAPI.create(leaveTypeForm);
                showToast('Leave Type created successfully', 'success');
            }
            setShowLeaveTypeModal(false);
            setEditingId(null);
            setLeaveTypeForm({ name: '', code: '', description: '', active: true, defaultDaysPerYear: 0 });
            fetchLeaveTypes();
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to save leave type', 'error');
        }
    };

    const handleDeleteLeaveType = async (id) => {
        if (!window.confirm('Delete this leave type? Warning: This may fail if used by existing records.')) return;
        try {
            await leaveTypeAPI.delete(id);
            showToast('Leave Type deleted', 'success');
            fetchLeaveTypes();
        } catch (error) {
            showToast('Failed to delete leave type (it might be in use)', 'error');
        }
    };

    const openEditLeaveType = (lt) => {
        setLeaveTypeForm({ name: lt.name, code: lt.code, description: lt.description || '', active: lt.active, defaultDaysPerYear: lt.defaultDaysPerYear });
        setEditingId(lt.id);
        setShowLeaveTypeModal(true);
    };

    return (
        <div className="organization-page">
            <BackButton to="/dashboard" label="Back to Dashboard" />
            <div className="page-header">
                <h1>🏢 Organization</h1>
                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'holidays' ? 'active' : ''}`} onClick={() => setActiveTab('holidays')}>📅 Holiday Calendar</button>
                    <button className={`tab-btn ${activeTab === 'policies' ? 'active' : ''}`} onClick={() => setActiveTab('policies')}>📜 Policies</button>
                    <button className={`tab-btn ${activeTab === 'leavetypes' ? 'active' : ''}`} onClick={() => setActiveTab('leavetypes')}>📝 Leave Types</button>
                </div>
            </div>

            <div className="content-area glass-card">
                {/* ... Holidays and Policies tabs remain same ... */}
                {activeTab === 'holidays' && (
                    <div className="tab-content animate-fadeIn">
                        {/* ... existing holiday content ... */}
                        <div className="section-header">
                            <h2>Holiday Calendar</h2>
                            {isAdminOrHR && (
                                <button className="btn btn-primary" onClick={() => {
                                    setEditingId(null);
                                    setHolidayForm({ name: '', date: '', type: 'PUBLIC', description: '' });
                                    setShowHolidayModal(true);
                                }}>+ Add Holiday</button>
                            )}
                        </div>

                        {loading ? <div className="loading">Loading...</div> : (
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Day</th>
                                            <th>Holiday Name</th>
                                            <th>Type</th>
                                            {isAdminOrHR && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {holidays.length > 0 ? holidays.map(h => (
                                            <tr key={h.id} className={new Date(h.date) < new Date() ? 'past-date' : ''}>
                                                <td>{h.date}</td>
                                                <td>{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' })}</td>
                                                <td>
                                                    <strong>{h.name}</strong>
                                                    {h.description && <div className="small-text">{h.description}</div>}
                                                </td>
                                                <td><span className={`badge badge-${h.type?.toLowerCase()}`}>{h.type}</span></td>
                                                {isAdminOrHR && (
                                                    <td>
                                                        <button onClick={() => openEditHoliday(h)} className="btn-icon">✏️</button>
                                                        <button onClick={() => handleDeleteHoliday(h.id)} className="btn-icon danger">🗑️</button>
                                                    </td>
                                                )}
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="5">No holidays found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'policies' && (
                    <div className="tab-content animate-fadeIn">
                        {/* ... existing policy content ... */}
                        <div className="section-header">
                            <h2>Organization Policies</h2>
                            {isAdminOrHR && (
                                <button className="btn btn-primary" onClick={() => {
                                    setEditingId(null);
                                    setPolicyForm({ title: '', description: '', content: '', version: '1.0' });
                                    setShowPolicyModal(true);
                                }}>+ Add Policy</button>
                            )}
                        </div>

                        <div className="policies-grid">
                            {policies.length > 0 ? policies.map(p => (
                                <div key={p.id} className="policy-card glass-card">
                                    <div className="policy-header">
                                        <h3>{p.title}</h3>
                                        <span className="version">v{p.version}</span>
                                    </div>
                                    <p className="policy-desc">{p.description}</p>
                                    <div className="policy-actions">
                                        <button className="btn btn-outline" onClick={() => alert(p.content)}>View Content</button>
                                        {isAdminOrHR && (
                                            <>
                                                <button onClick={() => openEditPolicy(p)} className="btn-icon">✏️</button>
                                                <button onClick={() => handleDeletePolicy(p.id)} className="btn-icon danger">🗑️</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <p>No policies found.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* --- LEAVE TYPES TAB --- */}
                {activeTab === 'leavetypes' && (
                    <div className="tab-content animate-fadeIn">
                        <div className="section-header">
                            <h2>Leave Types</h2>
                            {isAdminOrHR && (
                                <button className="btn btn-primary" onClick={() => {
                                    setEditingId(null);
                                    setLeaveTypeForm({ name: '', code: '', description: '', active: true });
                                    setShowLeaveTypeModal(true);
                                }}>+ Add Leave Type</button>
                            )}
                        </div>

                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Code</th>
                                        <th>Description</th>
                                        <th>Status</th>
                                        {isAdminOrHR && <th>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaveTypes.map(lt => (
                                        <tr key={lt.id}>
                                            <td>{lt.name}</td>
                                            <td><code>{lt.code}</code></td>
                                            <td>{lt.description}</td>
                                            <td>
                                                <span className={`badge ${lt.active ? 'badge-public' : 'badge-restricted'}`}>
                                                    {lt.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {isAdminOrHR && (
                                                <td>
                                                    <button onClick={() => openEditLeaveType(lt)} className="btn-icon">✏️</button>
                                                    <button onClick={() => handleDeleteLeaveType(lt.id)} className="btn-icon danger">🗑️</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {leaveTypes.length === 0 && <tr><td colSpan="5">No leave types defined.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Holiday Modal (Keep existing) */}
            {showHolidayModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingId ? 'Edit Holiday' : 'Add Holiday'}</h3>
                        <form onSubmit={handleSaveHoliday}>
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" className="form-input" required
                                    value={holidayForm.name}
                                    onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input type="date" className="form-input" required
                                    value={holidayForm.date}
                                    onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Type</label>
                                <select className="form-input" value={holidayForm.type}
                                    onChange={e => setHolidayForm({ ...holidayForm, type: e.target.value })}>
                                    <option value="PUBLIC">Public Holiday</option>
                                    <option value="OPTIONAL">Optional Holiday</option>
                                    <option value="RESTRICTED">Restricted Holiday</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea className="form-input"
                                    value={holidayForm.description}
                                    onChange={e => setHolidayForm({ ...holidayForm, description: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowHolidayModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Policy Modal (Keep existing) */}
            {showPolicyModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingId ? 'Edit Policy' : 'Add Policy'}</h3>
                        <form onSubmit={handleSavePolicy}>
                            <div className="form-group">
                                <label>Title</label>
                                <input type="text" className="form-input" required
                                    value={policyForm.title}
                                    onChange={e => setPolicyForm({ ...policyForm, title: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea className="form-input" required
                                    value={policyForm.description}
                                    onChange={e => setPolicyForm({ ...policyForm, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Content (HTML/Text)</label>
                                <textarea className="form-input" rows="5" required
                                    value={policyForm.content}
                                    onChange={e => setPolicyForm({ ...policyForm, content: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Version</label>
                                <input type="text" className="form-input"
                                    value={policyForm.version}
                                    onChange={e => setPolicyForm({ ...policyForm, version: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowPolicyModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Leave Type Modal */}
            {showLeaveTypeModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingId ? 'Edit Leave Type' : 'Add Leave Type'}</h3>
                        <form onSubmit={handleSaveLeaveType}>
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" className="form-input" placeholder="e.g. Casual Leave" required
                                    value={leaveTypeForm.name}
                                    onChange={e => setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Code (Unique)</label>
                                <input type="text" className="form-input" placeholder="e.g. CASUAL_LEAVE" required
                                    value={leaveTypeForm.code}
                                    disabled={!!editingId} // Code not editable after creation usually
                                    onChange={e => setLeaveTypeForm({ ...leaveTypeForm, code: e.target.value.toUpperCase().replace(/\s/g, '_') })} />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea className="form-input"
                                    value={leaveTypeForm.description}
                                    onChange={e => setLeaveTypeForm({ ...leaveTypeForm, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Default Days Per Year</label>
                                <input type="number" className="form-input"
                                    value={leaveTypeForm.defaultDaysPerYear}
                                    onChange={e => setLeaveTypeForm({ ...leaveTypeForm, defaultDaysPerYear: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="form-group">
                                <label>
                                    <input type="checkbox"
                                        checked={leaveTypeForm.active}
                                        onChange={e => setLeaveTypeForm({ ...leaveTypeForm, active: e.target.checked })} />
                                    {' '}Active
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowLeaveTypeModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Organization;
