import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';
import './Worklist.css';

// ── Constants ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
    TODO: { label: 'To Do', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: 'clock' },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: 'edit' },
    COMPLETED: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: 'check' },
    CANCELLED: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.15)', icon: 'back' },
};

const PRIORITY_CFG = {
    LOW: { label: 'Low', color: '#10b981', icon: 'check' },
    MEDIUM: { label: 'Medium', color: '#f59e0b', icon: 'info' },
    HIGH: { label: 'High', color: '#ef4444', icon: 'flame' },
    URGENT: { label: 'Urgent', color: '#dc2626', icon: 'target' },
};

// ── Component ──────────────────────────────────────────────────────────────
const Worklist = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const canAssign = ['ADMIN', 'HR', 'MANAGER'].includes(user?.role);

    // Data
    const [myTasks, setMyTasks] = useState([]);
    const [delegated, setDelegated] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI state
    const [activeTab, setActiveTab] = useState('mine');       // mine | delegated | all
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterPriority, setFilterPriority] = useState('ALL');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [commentModal, setCommentModal] = useState(null); // { task, targetStatus }
    const [reassignModal, setReassignModal] = useState(null); // { task }

    // New task form
    const [form, setForm] = useState({
        title: '', description: '', assignedToId: '', dueDate: '', priority: 'MEDIUM',
    });

    // ── Fetch ──────────────────────────────────────────────────────────────
    const loadTasks = useCallback(async () => {
        setLoading(true);
        try {
            const [mine, del] = await Promise.all([
                taskAPI.getMyTasks(),
                canAssign ? taskAPI.getAssignedByMe() : Promise.resolve({ data: { tasks: [] } }),
            ]);
            setMyTasks(mine.data?.tasks || []);
            setDelegated(del.data?.tasks || []);
        } catch {
            showToast('Failed to load worklist', 'error');
        } finally {
            setLoading(false);
        }
    }, [canAssign, showToast]);

    useEffect(() => { loadTasks(); }, [loadTasks]);

    useEffect(() => {
        if (canAssign) {
            employeeAPI.getAll().then(r => setEmployees(r.data || [])).catch(() => { });
        }
    }, [canAssign]);

    // ── Actions ────────────────────────────────────────────────────────────
    const updateStatus = async (taskId, status, comments = '') => {
        try {
            await taskAPI.updateStatus(taskId, { status, comments });
            showToast(`Task marked as ${STATUS_CFG[status]?.label}!`, 'success');
            setCommentModal(null);
            loadTasks();
        } catch {
            showToast('Failed to update status', 'error');
        }
    };

    const handleDelete = async (taskId) => {
        if (!window.confirm('Delete this task? This cannot be undone.')) return;
        try {
            await taskAPI.delete(taskId);
            showToast('Task deleted', 'success');
            loadTasks();
        } catch {
            showToast('Failed to delete task', 'error');
        }
    };

    const handleReassign = async (taskId, newAssigneeId, reason) => {
        try {
            const res = await taskAPI.reassign(taskId, newAssigneeId, reason);
            showToast(res.data?.message || 'Task reassigned successfully!', 'success');
            setReassignModal(null);
            loadTasks();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to reassign task', 'error');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await taskAPI.create(form);
            showToast('Task assigned successfully!', 'success');
            setShowModal(false);
            setForm({ title: '', description: '', assignedToId: '', dueDate: '', priority: 'MEDIUM' });
            loadTasks();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to create task', 'error');
        }
    };

    // ── Derived data ───────────────────────────────────────────────────────
    const activeTasks = activeTab === 'mine' ? myTasks : delegated;

    const filtered = activeTasks.filter(t => {
        if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
        if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
        if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
            !(t.description || '').toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const stats = {
        mine: {
            todo: myTasks.filter(t => t.status === 'TODO').length,
            inProgress: myTasks.filter(t => t.status === 'IN_PROGRESS').length,
            completed: myTasks.filter(t => t.status === 'COMPLETED').length,
            overdue: myTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
                && new Date(t.dueDate) < new Date()).length,
        },
        delegated: {
            total: delegated.length,
            todo: delegated.filter(t => t.status === 'TODO').length,
            inProgress: delegated.filter(t => t.status === 'IN_PROGRESS').length,
            completed: delegated.filter(t => t.status === 'COMPLETED').length,
        },
    };

    const formatDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const isOverdue = t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && new Date(t.dueDate) < new Date();

    // ── RENDER ─────────────────────────────────────────────────────────────
    return (
        <div className="wl-page">

            {/* Header */}
            <div className="wl-header">
                <div className="wl-header-left">
                    <button className="wl-back" onClick={() => navigate('/dashboard')}><Icon name="back" size={16} /> Dashboard</button>
                    <div>
                        <h1 className="wl-title"><Icon name="tasks" size={32} className="header-icon" /> My Worklist</h1>
                        <p className="wl-sub">All your work items in one place — assigned to you and delegated by you</p>
                    </div>
                </div>
                {canAssign && (
                    <button className="wl-btn-assign" onClick={() => setShowModal(true)}>
                        <Icon name="plus" size={18} /> Assign Task
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="wl-stats-row">
                <div className="wl-stat-card todo">
                    <span className="wl-stat-num">{stats.mine.todo}</span>
                    <span className="wl-stat-label">To Do</span>
                </div>
                <div className="wl-stat-card inprogress">
                    <span className="wl-stat-num">{stats.mine.inProgress}</span>
                    <span className="wl-stat-label">In Progress</span>
                </div>
                <div className="wl-stat-card completed">
                    <span className="wl-stat-num">{stats.mine.completed}</span>
                    <span className="wl-stat-label">Completed</span>
                </div>
                <div className="wl-stat-card overdue">
                    <span className="wl-stat-num">{stats.mine.overdue}</span>
                    <span className="wl-stat-label">Overdue</span>
                </div>
                {canAssign && (
                    <div className="wl-stat-card delegated">
                        <span className="wl-stat-num">{stats.delegated.total}</span>
                        <span className="wl-stat-label">Delegated</span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="wl-tabs">
                <button className={`wl-tab ${activeTab === 'mine' ? 'active' : ''}`} onClick={() => setActiveTab('mine')}>
                    📥 My Work Items
                    <span className="wl-tab-badge">{myTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}</span>
                </button>
                {canAssign && (
                    <button className={`wl-tab ${activeTab === 'delegated' ? 'active' : ''}`} onClick={() => setActiveTab('delegated')}>
                        📤 Delegated by Me
                        <span className="wl-tab-badge">{delegated.length}</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="wl-filters">
                <div className="wl-search-wrap">
                    <span className="wl-search-icon"><Icon name="search" size={16} /></span>
                    <input
                        className="wl-search"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className="wl-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="ALL">All Status</option>
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                <select className="wl-filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                    <option value="ALL">All Priority</option>
                    {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                {(filterStatus !== 'ALL' || filterPriority !== 'ALL' || search) && (
                    <button className="wl-clear-filters" onClick={() => { setFilterStatus('ALL'); setFilterPriority('ALL'); setSearch(''); }}>
                        ✕ Clear
                    </button>
                )}
            </div>

            {/* Task List */}
            {loading ? (
                <div className="wl-loading">
                    <div className="wl-spinner" />
                    <p>Loading your worklist...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="wl-empty">
                    <div className="wl-empty-icon"><Icon name={activeTab === 'mine' ? 'star' : 'folder'} size={48} /></div>
                    <h3>{activeTab === 'mine' ? 'All clear! No tasks found.' : 'No delegated tasks yet.'}</h3>
                    <p>{activeTab === 'mine' ? 'You have no work items matching your filters.' : 'Assign tasks to your team members to track them here.'}</p>
                </div>
            ) : (
                <div className="wl-list">
                    {filtered.map(task => {
                        const st = STATUS_CFG[task.status] || STATUS_CFG.TODO;
                        const pr = PRIORITY_CFG[task.priority] || PRIORITY_CFG.MEDIUM;
                        const overdue = isOverdue(task);
                        const isMine = activeTab === 'mine';

                        return (
                            <div key={task.id} className={`wl-item ${overdue ? 'overdue' : ''} ${task.status.toLowerCase().replace('_', '-')}`}>

                                {/* Left accent bar colored by priority */}
                                <div className="wl-item-accent" style={{ background: pr.color }} />

                                <div className="wl-item-body">
                                    {/* Row 1: title + badges */}
                                    <div className="wl-item-top">
                                        <div className="wl-item-title-wrap">
                                            <h3 className="wl-item-title">{task.title}</h3>
                                            {overdue && <span className="wl-overdue-tag"><Icon name="target" size={12} /> Overdue</span>}
                                        </div>
                                        <div className="wl-item-badges">
                                            <span className="wl-badge-priority" style={{ color: pr.color, borderColor: pr.color + '55', background: pr.color + '18' }}>
                                                <Icon name={pr.icon} size={14} /> {pr.label}
                                            </span>
                                            <span className="wl-badge-status" style={{ color: st.color, borderColor: st.color + '55', background: st.bg }}>
                                                <Icon name={st.icon} size={14} /> {st.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Row 2: description */}
                                    {task.description && (
                                        <p className="wl-item-desc">{task.description}</p>
                                    )}

                                    {/* Row 3: comments */}
                                    {task.comments && (
                                        <div className="wl-item-comments">
                                            <Icon name="search" size={14} /> <em>{task.comments}</em>
                                        </div>
                                    )}

                                    {/* Row 4: meta */}
                                    <div className="wl-item-meta">
                                        <span className="wl-meta-item">
                                            <Icon name="calendar" size={14} /> Due: <strong style={{ color: overdue ? '#ef4444' : 'inherit' }}>{formatDate(task.dueDate)}</strong>
                                        </span>
                                        {isMine && task.assignedBy && (
                                            <span className="wl-meta-item">
                                                <Icon name="users" size={14} /> From: <strong>{task.assignedBy.firstName} {task.assignedBy.lastName}</strong>
                                            </span>
                                        )}
                                        {!isMine && task.assignedTo && (
                                            <span className="wl-meta-item">
                                                <Icon name="users" size={14} /> To: <strong>{task.assignedTo.firstName} {task.assignedTo.lastName}</strong>
                                            </span>
                                        )}
                                        {task.completedAt && (
                                            <span className="wl-meta-item wl-meta-done">
                                                <Icon name="check" size={14} /> Done: {formatDate(task.completedAt)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Row 5: actions */}
                                    <div className="wl-item-actions">
                                        {isMine && task.status === 'TODO' && (
                                            <button className="wl-action-btn start" onClick={() => updateStatus(task.id, 'IN_PROGRESS')}>
                                                <Icon name="check" size={16} /> Start Working
                                            </button>
                                        )}
                                        {isMine && task.status === 'IN_PROGRESS' && (
                                            <button className="wl-action-btn complete" onClick={() => setCommentModal({ task, targetStatus: 'COMPLETED' })}>
                                                <Icon name="check" size={16} /> Mark Complete
                                            </button>
                                        )}
                                        {isMine && task.status === 'REJECTED' && (
                                            <button className="wl-action-btn start" onClick={() => updateStatus(task.id, 'IN_PROGRESS')}>
                                                <Icon name="refresh" size={16} /> Restart
                                            </button>
                                        )}
                                        {!isMine && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                                            <button className="wl-action-btn cancel" onClick={() => setCommentModal({ task, targetStatus: 'CANCELLED' })}>
                                                <Icon name="back" size={16} /> Cancel Task
                                            </button>
                                        )}
                                        {!isMine && (
                                            <>
                                                <button className="wl-action-btn reassign" onClick={() => setReassignModal({ task })}>
                                                    <Icon name="refresh" size={16} /> Reassign
                                                </button>
                                                <button className="wl-action-btn delete" onClick={() => handleDelete(task.id)}>
                                                    <Icon name="trash" size={16} /> Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Assign Task Modal ── */}
            {showModal && (
                <div className="wl-overlay" onClick={() => setShowModal(false)}>
                    <div className="wl-modal" onClick={e => e.stopPropagation()}>
                        <h2><Icon name="tasks" size={24} /> Assign New Task</h2>
                        <form onSubmit={handleCreate} className="wl-modal-form">
                            <div className="wl-field">
                                <label>Task Title *</label>
                                <input type="text" required value={form.title}
                                    placeholder="e.g. Prepare Q1 report"
                                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                            </div>
                            <div className="wl-field">
                                <label>Description</label>
                                <textarea rows="3" value={form.description}
                                    placeholder="Describe what needs to be done..."
                                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                            </div>
                            <div className="wl-field">
                                <label>Assign To *</label>
                                <select required value={form.assignedToId}
                                    onChange={e => setForm(p => ({ ...p, assignedToId: e.target.value }))}>
                                    <option value="">— Select employee —</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.firstName} {emp.lastName}{emp.designation ? ` · ${emp.designation}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="wl-field-row">
                                <div className="wl-field">
                                    <label>Due Date *</label>
                                    <input type="date" required value={form.dueDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                                </div>
                                <div className="wl-field">
                                    <label>Priority *</label>
                                    <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div className="wl-modal-footer">
                                <button type="button" className="wl-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="wl-btn-primary">Assign Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Comment / Confirm Modal ── */}
            {commentModal && (
                <div className="wl-overlay" onClick={() => setCommentModal(null)}>
                    <div className="wl-modal wl-modal-sm" onClick={e => e.stopPropagation()}>
                        <h2>{commentModal.targetStatus === 'COMPLETED' ? <><Icon name="check" size={24} /> Complete Task</> : <><Icon name="back" size={24} /> Cancel Task</>}</h2>
                        <p className="wl-modal-task-name">{commentModal.task.title}</p>
                        <CommentForm
                            label={commentModal.targetStatus === 'COMPLETED' ? 'Completion notes (optional)' : 'Reason for cancellation (optional)'}
                            actionLabel={commentModal.targetStatus === 'COMPLETED' ? 'Mark as Completed' : 'Cancel Task'}
                            actionClass={commentModal.targetStatus === 'COMPLETED' ? 'wl-btn-success' : 'wl-btn-danger'}
                            actionIcon={commentModal.targetStatus === 'COMPLETED' ? 'check' : 'back'}
                            onSubmit={(comment) => updateStatus(commentModal.task.id, commentModal.targetStatus, comment)}
                            onCancel={() => setCommentModal(null)}
                        />
                    </div>
                </div>
            )}

            {/* ── Reassign Modal ── */}
            {reassignModal && (
                <ReassignModal
                    task={reassignModal.task}
                    employees={employees}
                    onConfirm={(newAssigneeId, reason) => handleReassign(reassignModal.task.id, newAssigneeId, reason)}
                    onClose={() => setReassignModal(null)}
                />
            )}
        </div>
    );
};

// Small sub-component for comment capture
const CommentForm = ({ label, actionLabel, actionClass, onSubmit, onCancel }) => {
    const [comment, setComment] = useState('');
    return (
        <div className="wl-modal-form">
            <div className="wl-field">
                <label>{label}</label>
                <textarea rows="3" value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Add a note..." />
            </div>
            <div className="wl-modal-footer">
                <button type="button" className="wl-btn-ghost" onClick={onCancel}>Cancel</button>
                <button type="button" className={actionClass} onClick={() => onSubmit(comment)}>
                    {actionIcon && <Icon name={actionIcon} size={18} />} {actionLabel}
                </button>
            </div>
        </div>
    );
};

// Reassign Modal — pick a new employee and optional reason
const ReassignModal = ({ task, employees, onConfirm, onClose }) => {
    const currentAssigneeId = task.assignedTo?.id;
    const [newAssigneeId, setNewAssigneeId] = useState('');
    const [reason, setReason] = useState('');

    const otherEmployees = employees.filter(e => e.id !== currentAssigneeId);

    return (
        <div className="wl-overlay" onClick={onClose}>
            <div className="wl-modal wl-modal-sm" onClick={e => e.stopPropagation()}>
                <h2><Icon name="refresh" size={24} /> Reassign Task</h2>
                <p className="wl-modal-task-name">{task.title}</p>

                {/* Show current assignee */}
                <div className="wl-reassign-current">
                    <span className="wl-reassign-label">Currently assigned to:</span>
                    <span className="wl-reassign-name">
                        <Icon name="users" size={16} /> {task.assignedTo?.firstName} {task.assignedTo?.lastName}
                    </span>
                </div>

                <div className="wl-modal-form">
                    <div className="wl-field">
                        <label>Reassign To *</label>
                        <select
                            value={newAssigneeId}
                            onChange={e => setNewAssigneeId(e.target.value)}
                            required
                        >
                            <option value="">— Select new assignee —</option>
                            {otherEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName}{emp.designation ? ` · ${emp.designation}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="wl-field">
                        <label>Reason for reassigning (optional)</label>
                        <textarea
                            rows="3"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Original assignee is on leave, skill mismatch..."
                        />
                    </div>
                    <div className="wl-reassign-note">
                        ℹ️ The task will be reset to <strong>To Do</strong> and the new assignee will be notified.
                    </div>
                    <div className="wl-modal-footer">
                        <button type="button" className="wl-btn-ghost" onClick={onClose}>Cancel</button>
                        <button
                            type="button"
                            className="wl-btn-primary"
                            disabled={!newAssigneeId}
                            onClick={() => onConfirm(newAssigneeId, reason)}
                        >
                            <Icon name="refresh" size={18} /> Reassign Task
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Worklist;
