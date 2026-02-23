import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Onboarding.css';

// ── Constants ─────────────────────────────────────────────────────────────
const TASK_TYPE_LABELS = {
    UPLOAD_PHOTO: { label: '📸 Upload Photo', color: '#8b5cf6' },
    UPLOAD_DOCUMENT: { label: '📄 Upload Document', color: '#3b82f6' },
    FILL_FORM: { label: '📝 Fill Form', color: '#f59e0b' },
    SIGN_DOCUMENT: { label: '✍️ Sign Document', color: '#ec4899' },
    GENERAL: { label: '✅ General Task', color: '#6b7280' },
    ACKNOWLEDGEMENT: { label: '🤝 Acknowledge', color: '#10b981' },
};

const STATUS_CONFIG = {
    PENDING: { label: 'Pending', icon: '⏳', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    IN_REVIEW: { label: 'In Review', icon: '🔍', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    APPROVED: { label: 'Approved', icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    REJECTED: { label: 'Rejected', icon: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    WAIVED: { label: 'Waived', icon: '⏭️', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
};

const DOC_TYPES = [
    'OFFER_LETTER', 'APPOINTMENT_LETTER', 'NDA', 'POLICY_DOCUMENT', 'HANDBOOK',
    'ID_PROOF', 'ADDRESS_PROOF', 'EDUCATIONAL_CERTIFICATE', 'EXPERIENCE_LETTER',
    'PAN_CARD', 'AADHAAR_CARD', 'PASSPORT', 'BANK_DETAILS', 'PHOTO', 'OTHER'
];

// ── Component ─────────────────────────────────────────────────────────────
const Onboarding = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const isHR = ['ADMIN', 'HR'].includes(user?.role);

    // State
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [checklist, setChecklist] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('checklist'); // checklist | documents

    // Modals
    const [showAddTask, setShowAddTask] = useState(false);
    const [showUploadDoc, setShowUploadDoc] = useState(false);
    const [showSubmitTask, setShowSubmitTask] = useState(null);  // task object
    const [showReviewTask, setShowReviewTask] = useState(null);  // task object

    // Forms
    const [addTaskForm, setAddTaskForm] = useState({
        title: '', description: '', taskType: 'GENERAL', dueDate: '', hrNotes: ''
    });
    const [uploadDocForm, setUploadDocForm] = useState({
        documentName: '', description: '', documentType: 'OTHER'
    });
    const [uploadDocFile, setUploadDocFile] = useState(null);
    const [submitFile, setSubmitFile] = useState(null);
    const [submitNotes, setSubmitNotes] = useState('');
    const [reviewAction, setReviewAction] = useState('approve');
    const [reviewReason, setReviewReason] = useState('');

    // ── Data loading ──────────────────────────────────────────────────────
    useEffect(() => {
        if (isHR) {
            employeeAPI.getAll().then(r => setEmployees(r.data || [])).catch(() => { });
        }
    }, [isHR]);

    const loadOnboardingData = useCallback(async (empId) => {
        if (!empId) return;
        setLoading(true);
        try {
            const res = await onboardingAPI.getOnboardingData(empId);
            setChecklist(res.data.checklist || []);
            setDocuments(res.data.documents || []);
            setSummary(res.data.summary || null);
        } catch (e) {
            showToast(e.response?.data?.message || 'Failed to load onboarding data', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (selectedEmp) loadOnboardingData(selectedEmp.id);
    }, [selectedEmp, loadOnboardingData]);

    // For employee role: auto-load their own data using employeeId from login response
    useEffect(() => {
        if (!isHR && user?.employeeId) {
            loadOnboardingData(user.employeeId);
        }
    }, [isHR, user, loadOnboardingData]);

    // ── HR: Start onboarding ─────────────────────────────────────────────
    const handleStartOnboarding = async () => {
        if (!selectedEmp) return;
        setLoading(true);
        try {
            const res = await onboardingAPI.startOnboarding(selectedEmp.id);
            setChecklist(res.data.checklist || []);
            showToast('🎉 Onboarding started! Default checklist seeded.', 'success');
            loadOnboardingData(selectedEmp.id);
        } catch (e) {
            showToast(e.response?.data?.message || 'Failed to start onboarding', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ── HR: Add custom task ───────────────────────────────────────────────
    const handleAddTask = async (e) => {
        e.preventDefault();
        try {
            await onboardingAPI.addChecklistTask(selectedEmp.id, addTaskForm);
            showToast('Task added!', 'success');
            setShowAddTask(false);
            setAddTaskForm({ title: '', description: '', taskType: 'GENERAL', dueDate: '', hrNotes: '' });
            loadOnboardingData(selectedEmp.id);
        } catch (e) {
            showToast(e.response?.data?.message || 'Failed to add task', 'error');
        }
    };

    // ── HR: Upload document ───────────────────────────────────────────────
    const handleUploadDoc = async (e) => {
        e.preventDefault();
        if (!uploadDocFile) { showToast('Please select a file', 'error'); return; }
        const fd = new FormData();
        fd.append('file', uploadDocFile);
        fd.append('documentName', uploadDocForm.documentName);
        fd.append('description', uploadDocForm.description);
        fd.append('documentType', uploadDocForm.documentType);
        try {
            await onboardingAPI.uploadHrDocument(selectedEmp.id, fd);
            showToast('📄 Document uploaded!', 'success');
            setShowUploadDoc(false);
            setUploadDocFile(null);
            setUploadDocForm({ documentName: '', description: '', documentType: 'OTHER' });
            loadOnboardingData(selectedEmp.id);
        } catch (e) {
            showToast(e.response?.data?.message || 'Upload failed', 'error');
        }
    };

    // ── HR: Review task ───────────────────────────────────────────────────
    const handleReview = async (e) => {
        e.preventDefault();
        try {
            await onboardingAPI.reviewChecklist(showReviewTask.id, reviewAction, reviewReason);
            showToast(`Task ${reviewAction}d!`, 'success');
            setShowReviewTask(null);
            setReviewReason('');
            loadOnboardingData(selectedEmp.id);
        } catch (e) {
            showToast(e.response?.data?.message || 'Review failed', 'error');
        }
    };

    // ── HR: Delete task ───────────────────────────────────────────────────
    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Delete this checklist item?')) return;
        try {
            await onboardingAPI.deleteChecklist(taskId);
            showToast('Deleted', 'success');
            loadOnboardingData(selectedEmp.id);
        } catch (e) {
            showToast('Delete failed', 'error');
        }
    };

    // ── Employee: Submit task ─────────────────────────────────────────────
    const handleSubmitTask = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        if (submitFile) fd.append('file', submitFile);
        if (submitNotes) fd.append('notes', submitNotes);
        try {
            await onboardingAPI.submitChecklistTask(showSubmitTask.id, fd);
            showToast('✅ Submitted for review!', 'success');
            setShowSubmitTask(null);
            setSubmitFile(null);
            setSubmitNotes('');
            loadOnboardingData(selectedEmp?.id || user?.employeeId);
        } catch (e) {
            showToast(e.response?.data?.message || 'Submit failed', 'error');
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────
    const approvedCount = checklist.filter(t => t.status === 'APPROVED' || t.status === 'WAIVED').length;
    const totalCount = checklist.length;
    const progressPct = totalCount === 0 ? 0 : Math.round((approvedCount / totalCount) * 100);

    /**
     * Returns a lightweight link card for a file.
     * Opens directly in the browser — no backend streaming, no iframe.
     * The browser (or OS) handles rendering, keeping backend load near zero
     * regardless of file size.
     */
    const getFileLink = (url, name, mimeType, fileSize) => {
        if (!url) return null;
        const fullUrl = `http://localhost:8080${url}`;
        const ext = name?.split('.').pop()?.toLowerCase() || '';
        const isImage = mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
        const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
        const isWord = ['doc', 'docx'].includes(ext) || mimeType?.includes('word');

        const icon = isImage ? '🖼️' : isPdf ? '📋' : isWord ? '📝' : '📄';
        const label = isImage ? 'View Image' : isPdf ? 'View PDF' : isWord ? 'Open Document' : 'Open File';

        return (
            <a
                href={fullUrl}
                target="_blank"
                rel="noreferrer"
                className="ob-file-link-card"
            >
                <span className="ob-file-link-icon">{icon}</span>
                <span className="ob-file-link-info">
                    <span className="ob-file-link-name">{name}</span>
                    {fileSize && <span className="ob-file-link-size">{formatSize(fileSize)}</span>}
                </span>
                <span className="ob-file-link-action">{label} ↗</span>
            </a>
        );
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    // ── RENDER ────────────────────────────────────────────────────────────
    return (
        <div className="ob-page">
            <div className="ob-header">
                <div>
                    <button className="ob-back-btn" onClick={() => navigate('/dashboard')}>
                        ← Dashboard
                    </button>
                    <h1 className="ob-title">🎓 Employee Onboarding</h1>
                    <p className="ob-subtitle">
                        {isHR ? 'Manage onboarding checklists and share documents with new employees'
                            : 'Complete your onboarding tasks to get started'}
                    </p>
                </div>
            </div>

            {/* ── HR: Employee Selector ── */}
            {isHR && (
                <div className="ob-selector-bar">
                    <div className="ob-select-wrap">
                        <span className="ob-select-label">👤 Select Employee</span>
                        <select
                            className="ob-select"
                            value={selectedEmp?.id || ''}
                            onChange={e => {
                                const emp = employees.find(em => em.id === +e.target.value);
                                setSelectedEmp(emp || null);
                            }}
                        >
                            <option value="">— Choose a new employee —</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName} · {emp.designation || emp.employeeId}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedEmp && (
                        <div className="ob-emp-actions">
                            {checklist.length === 0 && (
                                <button className="ob-btn-start" onClick={handleStartOnboarding} disabled={loading}>
                                    🚀 Start Onboarding
                                </button>
                            )}
                            {checklist.length > 0 && (
                                <>
                                    <button className="ob-btn-secondary" onClick={() => setShowAddTask(true)}>
                                        ➕ Add Task
                                    </button>
                                    <button className="ob-btn-secondary" onClick={() => setShowUploadDoc(true)}>
                                        📤 Upload Document
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── No employee selected (HR) ── */}
            {isHR && !selectedEmp && (
                <div className="ob-empty-state">
                    <div className="ob-empty-icon">👋</div>
                    <h3>Select an employee to manage their onboarding</h3>
                    <p>Choose from the dropdown above to view or start their onboarding checklist.</p>
                </div>
            )}

            {/* ── Main content (shown when employee is selected or is an employee) ── */}
            {(selectedEmp || !isHR) && (
                <>
                    {/* Progress Summary Card */}
                    {checklist.length > 0 && (
                        <div className="ob-summary-card">
                            <div className="ob-summary-info">
                                <div className="ob-summary-emp">
                                    <div className="ob-emp-avatar">
                                        {isHR
                                            ? (selectedEmp?.firstName?.[0] || '?') + (selectedEmp?.lastName?.[0] || '')
                                            : (user?.username?.[0]?.toUpperCase() || '?')
                                        }
                                    </div>
                                    <div>
                                        <h3>
                                            {isHR
                                                ? `${selectedEmp?.firstName} ${selectedEmp?.lastName}`
                                                : 'Your Onboarding Progress'
                                            }
                                        </h3>
                                        <p>{isHR ? selectedEmp?.designation || selectedEmp?.employeeId : 'Complete all tasks below'}</p>
                                    </div>
                                </div>
                                <div className="ob-summary-stats">
                                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                                        const count = checklist.filter(t => t.status === key).length;
                                        if (count === 0) return null;
                                        return (
                                            <div key={key} className="ob-stat" style={{ borderColor: cfg.color }}>
                                                <span className="ob-stat-count" style={{ color: cfg.color }}>{count}</span>
                                                <span className="ob-stat-label">{cfg.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="ob-progress-bar-wrap">
                                <div className="ob-progress-label">
                                    <span>Completion</span>
                                    <span className="ob-progress-pct">{progressPct}%</span>
                                </div>
                                <div className="ob-progress-track">
                                    <div
                                        className="ob-progress-fill"
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    {checklist.length > 0 && (
                        <div className="ob-tabs">
                            <button
                                className={`ob-tab ${activeTab === 'checklist' ? 'active' : ''}`}
                                onClick={() => setActiveTab('checklist')}
                            >
                                📋 Checklist <span className="ob-tab-badge">{checklist.length}</span>
                            </button>
                            <button
                                className={`ob-tab ${activeTab === 'documents' ? 'active' : ''}`}
                                onClick={() => setActiveTab('documents')}
                            >
                                📁 Documents <span className="ob-tab-badge">{documents.length}</span>
                            </button>
                        </div>
                    )}

                    {/* ── Checklist Tab ── */}
                    {activeTab === 'checklist' && (
                        <div className="ob-checklist">
                            {loading && <div className="ob-loading">⏳ Loading...</div>}

                            {!loading && checklist.length === 0 && selectedEmp && (
                                <div className="ob-empty-state">
                                    <div className="ob-empty-icon">📋</div>
                                    <h3>No onboarding tasks yet</h3>
                                    <p>Click <strong>"Start Onboarding"</strong> to seed the default checklist, or add tasks manually.</p>
                                </div>
                            )}

                            {checklist.map(task => {
                                const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
                                const tt = TASK_TYPE_LABELS[task.taskType] || TASK_TYPE_LABELS.GENERAL;
                                const isOverdue = task.dueDate && task.status === 'PENDING'
                                    && new Date(task.dueDate) < new Date();

                                return (
                                    <div key={task.id} className={`ob-task-card ${task.status.toLowerCase()}`}>
                                        <div className="ob-task-header">
                                            <div className="ob-task-meta">
                                                <span className="ob-task-type" style={{ background: tt.color + '22', color: tt.color }}>
                                                    {tt.label}
                                                </span>
                                                <span className="ob-task-status" style={{ background: st.bg, color: st.color }}>
                                                    {st.icon} {st.label}
                                                </span>
                                                {isOverdue && (
                                                    <span className="ob-overdue">🔴 Overdue</span>
                                                )}
                                            </div>
                                            {isHR && (
                                                <div className="ob-task-hr-actions">
                                                    {task.status === 'IN_REVIEW' && (
                                                        <button
                                                            className="ob-btn-review"
                                                            onClick={() => { setShowReviewTask(task); setReviewAction('approve'); }}
                                                        >
                                                            🔍 Review
                                                        </button>
                                                    )}
                                                    <button className="ob-btn-del" onClick={() => handleDeleteTask(task.id)}>
                                                        🗑️
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <h4 className="ob-task-title">{task.title}</h4>
                                        {task.description && <p className="ob-task-desc">{task.description}</p>}

                                        {task.hrNotes && (
                                            <div className="ob-task-note hr-note">
                                                <strong>📌 HR Note:</strong> {task.hrNotes}
                                            </div>
                                        )}

                                        {task.rejectionReason && (
                                            <div className="ob-task-note rejection-note">
                                                <strong>❌ Rejected:</strong> {task.rejectionReason}
                                            </div>
                                        )}

                                        {task.employeeNotes && (
                                            <div className="ob-task-note emp-note">
                                                <strong>💬 Employee note:</strong> {task.employeeNotes}
                                            </div>
                                        )}

                                        <div className="ob-task-footer">
                                            <div className="ob-task-dates">
                                                {task.dueDate && (
                                                    <span>📅 Due: <strong>{formatDate(task.dueDate)}</strong></span>
                                                )}
                                                {task.completedAt && (
                                                    <span>⏱ Submitted: {formatDate(task.completedAt)}</span>
                                                )}
                                            </div>

                                            <div className="ob-task-actions-right">
                                                {/* Employee attachment download */}
                                                {task.attachmentPath && (
                                                    <a
                                                        href={`http://localhost:8080${task.attachmentPath}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="ob-btn-download"
                                                    >
                                                        ⬇️ View Submission ({task.attachmentName})
                                                    </a>
                                                )}

                                                {/* Employee submit button */}
                                                {!isHR && (task.status === 'PENDING' || task.status === 'REJECTED') && (
                                                    <button
                                                        className="ob-btn-submit-task"
                                                        onClick={() => { setShowSubmitTask(task); setSubmitNotes(''); setSubmitFile(null); }}
                                                    >
                                                        📤 Submit
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Documents Tab ── */}
                    {activeTab === 'documents' && (
                        <div className="ob-documents">
                            {isHR && (
                                <div className="ob-doc-header">
                                    <h3>HR Shared Documents</h3>
                                    <button className="ob-btn-secondary" onClick={() => setShowUploadDoc(true)}>
                                        📤 Upload Document
                                    </button>
                                </div>
                            )}
                            {documents.length === 0 && (
                                <div className="ob-empty-state">
                                    <div className="ob-empty-icon">📁</div>
                                    <h3>No documents yet</h3>
                                    <p>HR will upload offer letters, policies, NDA, and other onboarding documents here.</p>
                                </div>
                            )}
                            <div className="ob-doc-grid">
                                {documents.map(doc => {
                                    const docUrl = `http://localhost:8080${doc.filePath}`;
                                    const isPdf = doc.mimeType?.includes('pdf') || doc.filePath?.endsWith('.pdf');
                                    const isImg = doc.mimeType?.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.filePath);
                                    const isWord = doc.mimeType?.includes('word') || /\.(doc|docx)$/i.test(doc.filePath);
                                    const icon = isPdf ? '📋' : isImg ? '🖼️' : isWord ? '📝' : '📄';
                                    const viewLabel = isPdf ? 'View PDF' : isImg ? 'View Image' : isWord ? 'Open Doc' : 'Open File';
                                    return (
                                        <div key={doc.id} className={`ob-doc-card ${doc.source === 'HR_UPLOAD' ? 'hr' : 'emp'}`}>
                                            <div className="ob-doc-icon">{icon}</div>
                                            <div className="ob-doc-info">
                                                <h4>{doc.documentName}</h4>
                                                {doc.description && <p>{doc.description}</p>}
                                                <div className="ob-doc-meta">
                                                    <span className="ob-doc-type">{doc.documentType?.replace(/_/g, ' ')}</span>
                                                    <span className="ob-doc-size">{formatSize(doc.fileSize)}</span>
                                                    <span className="ob-doc-source">
                                                        {doc.source === 'HR_UPLOAD' ? '🏢 HR' : '👤 Employee'}
                                                    </span>
                                                </div>
                                                <div className="ob-doc-uploaded">
                                                    By {doc.uploadedBy} · {formatDate(doc.createdAt)}
                                                </div>
                                            </div>
                                            {/* Direct browser link — no backend streaming */}
                                            <a
                                                href={docUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="ob-doc-view-btn"
                                                title={viewLabel}
                                            >
                                                {viewLabel} ↗
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ══════════════ MODALS ══════════════ */}

            {/* Add Task Modal */}
            {showAddTask && (
                <div className="ob-modal-overlay" onClick={() => setShowAddTask(false)}>
                    <div className="ob-modal" onClick={e => e.stopPropagation()}>
                        <h3>➕ Add Checklist Task</h3>
                        <form onSubmit={handleAddTask} className="ob-modal-form">
                            <div className="ob-field">
                                <label>Task Title *</label>
                                <input type="text" required value={addTaskForm.title}
                                    onChange={e => setAddTaskForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g. Upload Aadhaar Card" />
                            </div>
                            <div className="ob-field">
                                <label>Description</label>
                                <textarea rows="3" value={addTaskForm.description}
                                    onChange={e => setAddTaskForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Instructions for the employee..." />
                            </div>
                            <div className="ob-field">
                                <label>Task Type *</label>
                                <select value={addTaskForm.taskType}
                                    onChange={e => setAddTaskForm(p => ({ ...p, taskType: e.target.value }))}>
                                    {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="ob-field">
                                <label>Due Date</label>
                                <input type="date" value={addTaskForm.dueDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setAddTaskForm(p => ({ ...p, dueDate: e.target.value }))} />
                            </div>
                            <div className="ob-field">
                                <label>HR Notes / Instructions</label>
                                <textarea rows="2" value={addTaskForm.hrNotes}
                                    onChange={e => setAddTaskForm(p => ({ ...p, hrNotes: e.target.value }))}
                                    placeholder="Any additional instructions..." />
                            </div>
                            <div className="ob-modal-actions">
                                <button type="button" className="ob-btn-ghost" onClick={() => setShowAddTask(false)}>Cancel</button>
                                <button type="submit" className="ob-btn-primary">Add Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload HR Document Modal */}
            {showUploadDoc && (
                <div className="ob-modal-overlay" onClick={() => setShowUploadDoc(false)}>
                    <div className="ob-modal" onClick={e => e.stopPropagation()}>
                        <h3>📤 Upload HR Document</h3>
                        <form onSubmit={handleUploadDoc} className="ob-modal-form">
                            <div className="ob-field">
                                <label>Document Name *</label>
                                <input type="text" required value={uploadDocForm.documentName}
                                    onChange={e => setUploadDocForm(p => ({ ...p, documentName: e.target.value }))}
                                    placeholder="e.g. Offer Letter 2026" />
                            </div>
                            <div className="ob-field">
                                <label>Document Type *</label>
                                <select value={uploadDocForm.documentType}
                                    onChange={e => setUploadDocForm(p => ({ ...p, documentType: e.target.value }))}>
                                    {DOC_TYPES.map(t => (
                                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="ob-field">
                                <label>Description</label>
                                <textarea rows="2" value={uploadDocForm.description}
                                    onChange={e => setUploadDocForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Short description..." />
                            </div>
                            <div className="ob-field">
                                <label>File *</label>
                                <div className={`ob-file-drop ${uploadDocFile ? 'has-file' : ''}`}
                                    onClick={() => document.getElementById('hr-file-input').click()}>
                                    {uploadDocFile
                                        ? <><span className="ob-file-name">📄 {uploadDocFile.name}</span>
                                            <span className="ob-file-size">({formatSize(uploadDocFile.size)})</span></>
                                        : <><div className="ob-file-icon">📁</div>
                                            <p>Click to choose file</p>
                                            <p className="ob-file-hint">PDF, Word, Image — max 10MB</p></>
                                    }
                                </div>
                                <input id="hr-file-input" type="file" style={{ display: 'none' }}
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={e => setUploadDocFile(e.target.files[0])} />
                            </div>
                            <div className="ob-modal-actions">
                                <button type="button" className="ob-btn-ghost" onClick={() => setShowUploadDoc(false)}>Cancel</button>
                                <button type="submit" className="ob-btn-primary">Upload</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Submit Task Modal (Employee) */}
            {showSubmitTask && (
                <div className="ob-modal-overlay" onClick={() => setShowSubmitTask(null)}>
                    <div className="ob-modal" onClick={e => e.stopPropagation()}>
                        <h3>📤 Submit: {showSubmitTask.title}</h3>
                        {showSubmitTask.description && (
                            <p className="ob-modal-desc">{showSubmitTask.description}</p>
                        )}
                        {showSubmitTask.hrNotes && (
                            <div className="ob-task-note hr-note">📌 {showSubmitTask.hrNotes}</div>
                        )}
                        <form onSubmit={handleSubmitTask} className="ob-modal-form">
                            {showSubmitTask.taskType !== 'ACKNOWLEDGEMENT' && showSubmitTask.taskType !== 'FILL_FORM' && (
                                <div className="ob-field">
                                    <label>Upload File {showSubmitTask.taskType === 'GENERAL' ? '(optional)' : '*'}</label>
                                    <div className={`ob-file-drop ${submitFile ? 'has-file' : ''}`}
                                        onClick={() => document.getElementById('emp-file-input').click()}>
                                        {submitFile
                                            ? <><span className="ob-file-name">📄 {submitFile.name}</span>
                                                <span className="ob-file-size">({formatSize(submitFile.size)})</span></>
                                            : <><div className="ob-file-icon">📁</div>
                                                <p>Click to choose file</p>
                                                <p className="ob-file-hint">PDF, Image, Word — max 10MB</p></>
                                        }
                                    </div>
                                    <input id="emp-file-input" type="file" style={{ display: 'none' }}
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={e => setSubmitFile(e.target.files[0])} />
                                </div>
                            )}
                            <div className="ob-field">
                                <label>Notes / Comments</label>
                                <textarea rows="3" value={submitNotes}
                                    onChange={e => setSubmitNotes(e.target.value)}
                                    placeholder="Add any notes for HR..." />
                            </div>
                            <div className="ob-modal-actions">
                                <button type="button" className="ob-btn-ghost" onClick={() => setShowSubmitTask(null)}>Cancel</button>
                                <button type="submit" className="ob-btn-primary">✅ Submit for Review</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Review Task Modal (HR) */}
            {showReviewTask && (
                <div className="ob-modal-overlay" onClick={() => setShowReviewTask(null)}>
                    <div className="ob-modal ob-modal-wide" onClick={e => e.stopPropagation()}>
                        <h3>🔍 Review: {showReviewTask.title}</h3>

                        {/* Employee notes */}
                        {showReviewTask.employeeNotes && (
                            <div className="ob-task-note emp-note">
                                💬 <strong>Employee note:</strong> {showReviewTask.employeeNotes}
                            </div>
                        )}

                        {/* ── Submitted document link (opens directly in browser, no backend streaming) ── */}
                        {showReviewTask.attachmentPath ? (
                            <div className="ob-review-doc-section">
                                <p className="ob-review-doc-label">📎 Submitted document:</p>
                                {getFileLink(
                                    showReviewTask.attachmentPath,
                                    showReviewTask.attachmentName,
                                    null,  // mimeType derived from extension
                                    null
                                )}
                            </div>
                        ) : (
                            <div className="ob-task-note" style={{ background: 'rgba(245,158,11,0.1)', borderColor: '#f59e0b' }}>
                                ⚠️ No file was attached to this submission.
                            </div>
                        )}

                        <form onSubmit={handleReview} className="ob-modal-form" style={{ marginTop: '16px' }}>
                            <div className="ob-field">
                                <label>Decision *</label>
                                <div className="ob-radio-group">
                                    {[
                                        { value: 'approve', label: '✅ Approve', color: '#10b981' },
                                        { value: 'reject', label: '❌ Reject', color: '#ef4444' },
                                        { value: 'waive', label: '⏭️ Waive', color: '#8b5cf6' },
                                    ].map(opt => (
                                        <label key={opt.value}
                                            className={`ob-radio-label ${reviewAction === opt.value ? 'selected' : ''}`}
                                            style={{ '--radio-color': opt.color }}>
                                            <input type="radio" name="action" value={opt.value}
                                                checked={reviewAction === opt.value}
                                                onChange={() => setReviewAction(opt.value)} />
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {reviewAction === 'reject' && (
                                <div className="ob-field">
                                    <label>Rejection Reason *</label>
                                    <textarea rows="3" required value={reviewReason}
                                        onChange={e => setReviewReason(e.target.value)}
                                        placeholder="Tell the employee what needs to be fixed..." />
                                </div>
                            )}
                            <div className="ob-modal-actions">
                                <button type="button" className="ob-btn-ghost" onClick={() => setShowReviewTask(null)}>Cancel</button>
                                <button type="submit" className="ob-btn-primary">Submit Review</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Onboarding;
