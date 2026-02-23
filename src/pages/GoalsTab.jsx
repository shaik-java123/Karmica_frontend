import React, { useState, useEffect, useRef } from 'react';
import { goalAPI, employeeAPI, appraisalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './GoalsTab.css';

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
const STATUS_CFG = {
    NOT_STARTED: { label: 'Not Started', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    COMPLETED: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    ON_HOLD: { label: 'On Hold', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    CANCELLED: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

const PRIORITY_CFG = {
    LOW: { label: 'Low', color: '#10b981', dot: '🟢' },
    MEDIUM: { label: 'Medium', color: '#f59e0b', dot: '🟡' },
    HIGH: { label: 'High', color: '#ef4444', dot: '🔴' },
    CRITICAL: { label: 'Critical', color: '#7c3aed', dot: '🚨' },
};

const CATEGORY_CFG = {
    PERFORMANCE: { label: 'Performance', icon: '📈' },
    DEVELOPMENT: { label: 'Development', icon: '📚' },
    BEHAVIORAL: { label: 'Behavioral', icon: '🤝' },
    INNOVATION: { label: 'Innovation', icon: '💡' },
    CUSTOMER: { label: 'Customer', icon: '⭐' },
    OPERATIONAL: { label: 'Operational', icon: '⚙️' },
};

// Excel template column headers (same order as the CSV download)
const EXCEL_COLUMNS = [
    'employeeId', 'title', 'description', 'targetMetric',
    'targetValue', 'dueDate', 'priority', 'category', 'weightage', 'cycleId'
];

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
const GoalsTab = () => {
    const { user } = useAuth();
    const toast = useToast();
    const canManage = ['ADMIN', 'HR', 'MANAGER'].includes(user?.role);

    // Data
    const [myGoals, setMyGoals] = useState([]);
    const [teamGoals, setTeamGoals] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI
    const [view, setView] = useState('my');      // my | team
    const [addMode, setAddMode] = useState(null);      // null | form | excel
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterPriority, setFilterPriority] = useState('ALL');
    const [filterEmployee, setFilterEmployee] = useState('ALL');
    const [search, setSearch] = useState('');

    // Form state
    const BLANK_FORM = {
        employeeId: '', title: '', description: '', targetMetric: '',
        targetValue: '', dueDate: '', priority: 'MEDIUM',
        category: 'PERFORMANCE', weightage: 10, cycleId: ''
    };
    const [form, setForm] = useState(BLANK_FORM);

    // Excel import state
    const [csvText, setCsvText] = useState('');
    const [parsedRows, setParsedRows] = useState([]);
    const [parseErrors, setParseErrors] = useState([]);
    const fileRef = useRef(null);

    // Progress update modal
    const [progressModal, setProgressModal] = useState(null); // { goal }
    const [progressForm, setProgressForm] = useState({ achievedValue: '', progressPct: '', selfComments: '' });

    // Comment modal (manager)
    const [commentModal, setCommentModal] = useState(null);
    const [commentText, setCommentText] = useState('');

    /* ── Fetch ── */
    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [myR, empR, cycR] = await Promise.all([
                goalAPI.getMyGoals(),
                canManage ? employeeAPI.getAll() : Promise.resolve({ data: [] }),
                canManage ? appraisalAPI.getAllCycles() : Promise.resolve({ data: { cycles: [] } }),
            ]);
            setMyGoals(myR.data?.goals || []);
            setEmployees(empR.data || []);
            setCycles(cycR.data?.cycles || []);
            if (canManage) {
                const teamR = await goalAPI.getTeamGoals();
                setTeamGoals(teamR.data?.goals || []);
            }
        } catch {
            toast.error('Failed to load goals');
        } finally {
            setLoading(false);
        }
    };

    /* ── Form submit ── */
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await goalAPI.create({
                ...form,
                targetValue: form.targetValue ? parseFloat(form.targetValue) : null,
                weightage: parseInt(form.weightage),
                cycleId: form.cycleId || null,
            });
            toast.success('Goal created successfully!');
            setForm(BLANK_FORM);
            setAddMode(null);
            loadAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create goal');
        }
    };

    /* ── Excel parse ── */
    const parseCSV = (raw) => {
        const lines = raw.trim().split('\n').filter(Boolean);
        if (lines.length < 2) {
            setParseErrors(['File must have a header row and at least one data row']);
            setParsedRows([]);
            return;
        }
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = [];
        const errors = [];
        for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
            // Validate required fields
            if (!row.employeeId) { errors.push(`Row ${i}: employeeId is required`); continue; }
            if (!row.title) { errors.push(`Row ${i}: title is required`); continue; }
            if (!row.dueDate) { errors.push(`Row ${i}: dueDate is required`); continue; }
            rows.push(row);
        }
        setParsedRows(rows);
        setParseErrors(errors);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            setCsvText(evt.target.result);
            parseCSV(evt.target.result);
        };
        reader.readAsText(file);
    };

    const handleBulkSubmit = async () => {
        if (parsedRows.length === 0) { toast.error('No valid rows to import'); return; }
        try {
            const res = await goalAPI.bulkCreate(parsedRows);
            const d = res.data;
            toast.success(`✅ Imported ${d.created} goals${d.failed > 0 ? `, ${d.failed} failed` : ''}`);
            if (d.errors?.length > 0) setParseErrors(d.errors);
            else { setAddMode(null); setCsvText(''); setParsedRows([]); setParseErrors([]); }
            loadAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Bulk import failed');
        }
    };

    /* ── Progress update ── */
    const submitProgress = async () => {
        try {
            await goalAPI.updateProgress(progressModal.goal.id, {
                achievedValue: progressForm.achievedValue ? parseFloat(progressForm.achievedValue) : undefined,
                progressPct: progressForm.progressPct ? parseInt(progressForm.progressPct) : undefined,
                selfComments: progressForm.selfComments,
            });
            toast.success('Progress updated!');
            setProgressModal(null);
            setProgressForm({ achievedValue: '', progressPct: '', selfComments: '' });
            loadAll();
        } catch {
            toast.error('Failed to update progress');
        }
    };

    /* ── Manager comment ── */
    const submitComment = async () => {
        try {
            await goalAPI.addComment(commentModal.goal.id, commentText);
            toast.success('Comment saved!');
            setCommentModal(null);
            setCommentText('');
            loadAll();
        } catch {
            toast.error('Failed to save comment');
        }
    };

    /* ── Delete ── */
    const deleteGoal = async (id) => {
        if (!window.confirm('Delete this goal permanently?')) return;
        try {
            await goalAPI.delete(id);
            toast.success('Goal deleted');
            loadAll();
        } catch {
            toast.error('Failed to delete goal');
        }
    };

    /* ── Download template ── */
    const downloadTemplate = () => {
        const header = EXCEL_COLUMNS.join(',');
        const sample = '101,Increase sales by 20%,Grow Q1 revenue,Revenue in INR,100000,2026-06-30,HIGH,PERFORMANCE,25,';
        const blob = new Blob([header + '\n' + sample], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'goals_template.csv'; a.click();
    };

    /* ── Filtered data ── */
    const activeGoals = view === 'my' ? myGoals : teamGoals;
    const filtered = activeGoals.filter(g => {
        if (filterStatus !== 'ALL' && g.status !== filterStatus) return false;
        if (filterPriority !== 'ALL' && g.priority !== filterPriority) return false;
        if (filterEmployee !== 'ALL' && g.assignedTo?.id?.toString() !== filterEmployee) return false;
        if (search && !g.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    /* ── Stats ── */
    const goalStats = {
        total: myGoals.length,
        completed: myGoals.filter(g => g.status === 'COMPLETED').length,
        inProgress: myGoals.filter(g => g.status === 'IN_PROGRESS').length,
        overdue: myGoals.filter(g => g.status !== 'COMPLETED' && g.dueDate && new Date(g.dueDate) < new Date()).length,
        avgProgress: myGoals.length > 0
            ? Math.round(myGoals.reduce((s, g) => s + (g.progressPct || 0), 0) / myGoals.length)
            : 0,
    };

    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const isOverdue = g => g.status !== 'COMPLETED' && g.status !== 'CANCELLED' && g.dueDate && new Date(g.dueDate) < new Date();

    /* ── Render ── */
    if (loading) return (
        <div className="gt-loading"><div className="gt-spinner" /><p>Loading goals...</p></div>
    );

    return (
        <div className="gt-wrap">

            {/* ── Header ── */}
            <div className="gt-top">
                <div>
                    <h2 className="gt-heading">🎯 Goals & Targets</h2>
                    <p className="gt-sub">Track performance targets for yourself and your team</p>
                </div>
                {canManage && (
                    <div className="gt-header-actions">
                        <button className="gt-btn-ghost" onClick={() => setAddMode(addMode === 'excel' ? null : 'excel')}>
                            📊 Import Excel
                        </button>
                        <button className="gt-btn-primary" onClick={() => setAddMode(addMode === 'form' ? null : 'form')}>
                            + Add Goal
                        </button>
                    </div>
                )}
            </div>

            {/* ── My Stats ── */}
            <div className="gt-stats">
                <div className="gt-stat"><span className="gt-stat-n">{goalStats.total}</span><span className="gt-stat-l">Total Goals</span></div>
                <div className="gt-stat in-progress"><span className="gt-stat-n">{goalStats.inProgress}</span><span className="gt-stat-l">In Progress</span></div>
                <div className="gt-stat completed"><span className="gt-stat-n">{goalStats.completed}</span><span className="gt-stat-l">Completed</span></div>
                <div className="gt-stat overdue"><span className="gt-stat-n">{goalStats.overdue}</span><span className="gt-stat-l">Overdue</span></div>
                <div className="gt-stat progress">
                    <span className="gt-stat-n">{goalStats.avgProgress}%</span>
                    <span className="gt-stat-l">Avg Progress</span>
                    <div className="gt-mini-bar"><div className="gt-mini-fill" style={{ width: `${goalStats.avgProgress}%` }} /></div>
                </div>
            </div>

            {/* ── Add Goal Form ── */}
            {addMode === 'form' && (
                <div className="gt-panel">
                    <div className="gt-panel-head">
                        <h3>📝 Add New Goal</h3>
                        <button className="gt-panel-close" onClick={() => setAddMode(null)}>✕</button>
                    </div>
                    <form onSubmit={handleCreate} className="gt-form">
                        <div className="gt-field-row">
                            <div className="gt-field">
                                <label>Assign To *</label>
                                <select required value={form.employeeId}
                                    onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}>
                                    <option value="">— Select Employee —</option>
                                    {employees.filter(e => e.status === 'ACTIVE').map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.firstName} {emp.lastName}{emp.designation ? ` · ${emp.designation}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="gt-field">
                                <label>Link to Cycle (optional)</label>
                                <select value={form.cycleId}
                                    onChange={e => setForm(p => ({ ...p, cycleId: e.target.value }))}>
                                    <option value="">— No Cycle —</option>
                                    {cycles.map(c => (
                                        <option key={c.id} value={c.id}>{c.cycleName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="gt-field">
                            <label>Goal Title *</label>
                            <input type="text" required value={form.title}
                                placeholder="e.g. Increase quarterly sales by 15%"
                                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                        </div>

                        <div className="gt-field">
                            <label>Description</label>
                            <textarea rows={3} value={form.description}
                                placeholder="Describe what this goal involves and why it matters…"
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                        </div>

                        <div className="gt-field-row">
                            <div className="gt-field">
                                <label>Target Metric</label>
                                <input type="text" value={form.targetMetric}
                                    placeholder="e.g. Revenue in INR, No. of tickets closed"
                                    onChange={e => setForm(p => ({ ...p, targetMetric: e.target.value }))} />
                            </div>
                            <div className="gt-field">
                                <label>Target Value</label>
                                <input type="number" value={form.targetValue}
                                    placeholder="e.g. 100000"
                                    onChange={e => setForm(p => ({ ...p, targetValue: e.target.value }))} />
                            </div>
                        </div>

                        <div className="gt-field-row">
                            <div className="gt-field">
                                <label>Due Date *</label>
                                <input type="date" required value={form.dueDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                            </div>
                            <div className="gt-field">
                                <label>Priority</label>
                                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                                    {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                                        <option key={k} value={k}>{v.dot} {v.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="gt-field">
                                <label>Category</label>
                                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                                    {Object.entries(CATEGORY_CFG).map(([k, v]) => (
                                        <option key={k} value={k}>{v.icon} {v.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="gt-field">
                                <label>Weightage (%)</label>
                                <input type="number" min={1} max={100} value={form.weightage}
                                    onChange={e => setForm(p => ({ ...p, weightage: e.target.value }))} />
                            </div>
                        </div>

                        <div className="gt-form-footer">
                            <button type="button" className="gt-btn-ghost" onClick={() => setAddMode(null)}>Cancel</button>
                            <button type="submit" className="gt-btn-primary">✓ Create Goal</button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Excel Import Panel ── */}
            {addMode === 'excel' && (
                <div className="gt-panel">
                    <div className="gt-panel-head">
                        <h3>📊 Bulk Import Goals from Excel / CSV</h3>
                        <button className="gt-panel-close" onClick={() => setAddMode(null)}>✕</button>
                    </div>

                    <div className="gt-excel-steps">
                        {/* Step 1 */}
                        <div className="gt-excel-step">
                            <div className="gt-step-num">1</div>
                            <div className="gt-step-body">
                                <h4>Download the template</h4>
                                <p>Get the CSV template with the correct column structure</p>
                                <button className="gt-btn-ghost" onClick={downloadTemplate}>⬇ Download Template</button>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="gt-excel-step">
                            <div className="gt-step-num">2</div>
                            <div className="gt-step-body">
                                <h4>Fill in your data</h4>
                                <p>Open in Excel / Google Sheets. Required columns: <code>employeeId, title, dueDate</code></p>
                                <div className="gt-col-list">
                                    {EXCEL_COLUMNS.map(c => <span key={c} className="gt-col-chip">{c}</span>)}
                                </div>
                            </div>
                        </div>

                        {/* Step 3: upload or paste */}
                        <div className="gt-excel-step">
                            <div className="gt-step-num">3</div>
                            <div className="gt-step-body">
                                <h4>Upload CSV or paste content</h4>
                                <div className="gt-upload-row">
                                    <button className="gt-btn-ghost" onClick={() => fileRef.current?.click()}>
                                        📁 Choose CSV file
                                    </button>
                                    <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
                                        onChange={handleFileUpload} />
                                    <span className="gt-or">or paste below</span>
                                </div>
                                <textarea
                                    className="gt-csv-textarea"
                                    rows={8}
                                    placeholder={`employeeId,title,description,targetMetric,targetValue,dueDate,priority,category,weightage,cycleId\n101,Increase sales by 20%,Grow Q1 revenue,Revenue in INR,100000,2026-06-30,HIGH,PERFORMANCE,25,`}
                                    value={csvText}
                                    onChange={e => { setCsvText(e.target.value); parseCSV(e.target.value); }}
                                />
                            </div>
                        </div>

                        {/* Parse preview */}
                        {(parsedRows.length > 0 || parseErrors.length > 0) && (
                            <div className="gt-excel-step">
                                <div className="gt-step-num">4</div>
                                <div className="gt-step-body">
                                    <h4>Preview & confirm</h4>
                                    {parseErrors.length > 0 && (
                                        <div className="gt-parse-errors">
                                            {parseErrors.map((e, i) => <div key={i} className="gt-err-row">⚠ {e}</div>)}
                                        </div>
                                    )}
                                    {parsedRows.length > 0 && (
                                        <>
                                            <p className="gt-preview-count">✅ {parsedRows.length} row(s) ready to import</p>
                                            <div className="gt-preview-table-wrap">
                                                <table className="gt-preview-table">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Employee ID</th>
                                                            <th>Title</th>
                                                            <th>Target</th>
                                                            <th>Due Date</th>
                                                            <th>Priority</th>
                                                            <th>Category</th>
                                                            <th>Weight</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {parsedRows.map((r, i) => (
                                                            <tr key={i}>
                                                                <td>{i + 1}</td>
                                                                <td>{r.employeeId}</td>
                                                                <td>{r.title}</td>
                                                                <td>{r.targetValue || '—'} {r.targetMetric}</td>
                                                                <td>{r.dueDate}</td>
                                                                <td>{r.priority || 'MEDIUM'}</td>
                                                                <td>{r.category || 'PERFORMANCE'}</td>
                                                                <td>{r.weightage || 10}%</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="gt-form-footer">
                                                <button className="gt-btn-ghost" onClick={() => { setParsedRows([]); setCsvText(''); setParseErrors([]); }}>
                                                    Clear
                                                </button>
                                                <button className="gt-btn-primary" onClick={handleBulkSubmit}>
                                                    ⬆ Import {parsedRows.length} Goals
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tabs ── */}
            {canManage && (
                <div className="gt-tabs">
                    <button className={`gt-tab ${view === 'my' ? 'active' : ''}`} onClick={() => setView('my')}>
                        📥 My Goals <span className="gt-badge">{myGoals.length}</span>
                    </button>
                    <button className={`gt-tab ${view === 'team' ? 'active' : ''}`} onClick={() => setView('team')}>
                        👥 Team Goals <span className="gt-badge">{teamGoals.length}</span>
                    </button>
                </div>
            )}

            {/* ── Filters ── */}
            <div className="gt-filters">
                <div className="gt-search-wrap">
                    <span>🔍</span>
                    <input className="gt-search" placeholder="Search goals…" value={search}
                        onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="gt-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="ALL">All Status</option>
                    {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="gt-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                    <option value="ALL">All Priority</option>
                    {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.dot} {v.label}</option>)}
                </select>
                {view === 'team' && (
                    <select className="gt-select" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                        <option value="ALL">All Employees</option>
                        {[...new Map(teamGoals.map(g => [g.assignedTo?.id, g.assignedTo])).values()].filter(Boolean).map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>
                )}
                {(filterStatus !== 'ALL' || filterPriority !== 'ALL' || search || filterEmployee !== 'ALL') && (
                    <button className="gt-clear" onClick={() => { setFilterStatus('ALL'); setFilterPriority('ALL'); setSearch(''); setFilterEmployee('ALL'); }}>
                        ✕ Clear
                    </button>
                )}
            </div>

            {/* ── Goal Cards ── */}
            {filtered.length === 0 ? (
                <div className="gt-empty">
                    <div className="gt-empty-icon">🎯</div>
                    <h3>{view === 'my' ? 'No goals assigned to you yet.' : 'No team goals found.'}</h3>
                    <p>{canManage ? 'Use the "+ Add Goal" button to create one.' : 'Goals set by your manager will appear here.'}</p>
                </div>
            ) : (
                <div className="gt-list">
                    {filtered.map(goal => {
                        const st = STATUS_CFG[goal.status] || STATUS_CFG.NOT_STARTED;
                        const pr = PRIORITY_CFG[goal.priority] || PRIORITY_CFG.MEDIUM;
                        const cat = CATEGORY_CFG[goal.category] || CATEGORY_CFG.PERFORMANCE;
                        const overdue = isOverdue(goal);
                        const pct = goal.progressPct || 0;

                        return (
                            <div key={goal.id} className={`gt-card ${overdue ? 'overdue' : ''}`}>

                                {/* Left accent */}
                                <div className="gt-card-accent" style={{ background: pr.color }} />

                                <div className="gt-card-body">
                                    {/* Row 1: title + badges */}
                                    <div className="gt-card-top">
                                        <div className="gt-card-title-group">
                                            <h3 className="gt-card-title">{cat.icon} {goal.title}</h3>
                                            {overdue && <span className="gt-overdue-tag">🔴 Overdue</span>}
                                        </div>
                                        <div className="gt-card-badges">
                                            <span className="gt-badge-pill" style={{ color: pr.color, background: pr.color + '18', borderColor: pr.color + '44' }}>
                                                {pr.dot} {pr.label}
                                            </span>
                                            <span className="gt-badge-pill" style={{ color: st.color, background: st.bg, borderColor: st.color + '44' }}>
                                                {st.label}
                                            </span>
                                            <span className="gt-badge-pill gt-badge-weight">
                                                ⚖ {goal.weightage}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {goal.description && <p className="gt-card-desc">{goal.description}</p>}

                                    {/* Progress bar */}
                                    <div className="gt-progress-row">
                                        <div className="gt-progress-track">
                                            <div className="gt-progress-fill" style={{
                                                width: `${pct}%`,
                                                background: pct >= 100 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#ef4444'
                                            }} />
                                        </div>
                                        <span className="gt-progress-pct">{pct}%</span>
                                    </div>

                                    {/* Target metric */}
                                    {goal.targetMetric && (
                                        <div className="gt-target-row">
                                            <span className="gt-target-label">Target:</span>
                                            <span className="gt-target-val">
                                                {goal.achievedValue != null ? `${goal.achievedValue} / ` : ''}
                                                {goal.targetValue} {goal.targetMetric}
                                            </span>
                                        </div>
                                    )}

                                    {/* Meta row */}
                                    <div className="gt-card-meta">
                                        {view === 'team' && goal.assignedTo && (
                                            <span className="gt-meta-item">👤 <strong>{goal.assignedTo.name}</strong></span>
                                        )}
                                        <span className="gt-meta-item" style={{ color: overdue ? '#ef4444' : 'inherit' }}>
                                            📅 Due: <strong>{fmtDate(goal.dueDate)}</strong>
                                        </span>
                                        {goal.cycleName && (
                                            <span className="gt-meta-item">🔄 {goal.cycleName}</span>
                                        )}
                                        {goal.completedDate && (
                                            <span className="gt-meta-item" style={{ color: '#10b981' }}>✅ Done: {fmtDate(goal.completedDate)}</span>
                                        )}
                                    </div>

                                    {/* Comments */}
                                    {goal.managerComments && (
                                        <div className="gt-comment-block manager">
                                            💬 <em>Manager: {goal.managerComments}</em>
                                        </div>
                                    )}
                                    {goal.selfComments && (
                                        <div className="gt-comment-block self">
                                            📝 <em>Self: {goal.selfComments}</em>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="gt-card-actions">
                                        {/* Employee can update their progress */}
                                        {(view === 'my' || !canManage) && goal.status !== 'COMPLETED' && goal.status !== 'CANCELLED' && (
                                            <button className="gt-action start"
                                                onClick={() => { setProgressModal({ goal }); setProgressForm({ achievedValue: goal.achievedValue || '', progressPct: goal.progressPct || '', selfComments: goal.selfComments || '' }); }}>
                                                📊 Update Progress
                                            </button>
                                        )}
                                        {/* Manager actions */}
                                        {canManage && view === 'team' && (
                                            <>
                                                <button className="gt-action comment"
                                                    onClick={() => { setCommentModal({ goal }); setCommentText(goal.managerComments || ''); }}>
                                                    💬 Comment
                                                </button>
                                                <button className="gt-action delete"
                                                    onClick={() => deleteGoal(goal.id)}>
                                                    🗑 Delete
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

            {/* ── Progress Modal ── */}
            {progressModal && (
                <div className="gt-overlay" onClick={() => setProgressModal(null)}>
                    <div className="gt-modal" onClick={e => e.stopPropagation()}>
                        <h2>📊 Update Progress</h2>
                        <p className="gt-modal-sub">{progressModal.goal.title}</p>

                        <div className="gt-modal-form">
                            {progressModal.goal.targetValue && (
                                <div className="gt-field">
                                    <label>Achieved Value (out of {progressModal.goal.targetValue} {progressModal.goal.targetMetric})</label>
                                    <input type="number" value={progressForm.achievedValue}
                                        onChange={e => {
                                            const av = parseFloat(e.target.value) || 0;
                                            const tv = progressModal.goal.targetValue;
                                            const auto = tv > 0 ? Math.min(100, Math.round(av / tv * 100)) : '';
                                            setProgressForm(p => ({ ...p, achievedValue: e.target.value, progressPct: auto }));
                                        }}
                                        placeholder={`e.g. ${progressModal.goal.targetValue * 0.5}`} />
                                </div>
                            )}
                            <div className="gt-field">
                                <label>Progress % (0–100)</label>
                                <div className="gt-slider-wrap">
                                    <input type="range" min={0} max={100} value={progressForm.progressPct || 0}
                                        onChange={e => setProgressForm(p => ({ ...p, progressPct: e.target.value }))} />
                                    <span className="gt-slider-val">{progressForm.progressPct || 0}%</span>
                                </div>
                            </div>
                            <div className="gt-field">
                                <label>Notes / Self Assessment (optional)</label>
                                <textarea rows={3} value={progressForm.selfComments}
                                    onChange={e => setProgressForm(p => ({ ...p, selfComments: e.target.value }))}
                                    placeholder="What have you done so far?" />
                            </div>
                            <div className="gt-modal-footer">
                                <button className="gt-btn-ghost" onClick={() => setProgressModal(null)}>Cancel</button>
                                <button className="gt-btn-primary" onClick={submitProgress}>Save Progress</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Manager Comment Modal ── */}
            {commentModal && (
                <div className="gt-overlay" onClick={() => setCommentModal(null)}>
                    <div className="gt-modal" onClick={e => e.stopPropagation()}>
                        <h2>💬 Manager Comment</h2>
                        <p className="gt-modal-sub">{commentModal.goal.title} — {commentModal.goal.assignedTo?.name}</p>
                        <div className="gt-modal-form">
                            <div className="gt-field">
                                <label>Comment / Feedback</label>
                                <textarea rows={4} value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    placeholder="Provide feedback, guidance, or recognition…" />
                            </div>
                            <div className="gt-modal-footer">
                                <button className="gt-btn-ghost" onClick={() => setCommentModal(null)}>Cancel</button>
                                <button className="gt-btn-primary" onClick={submitComment}>Save Comment</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoalsTab;
