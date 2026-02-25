import React, { useState, useEffect, useRef } from 'react';
import { goalTemplateAPI, appraisalAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './GoalsTab.css';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const PILLAR_CFG = {
    DELIVERY_EXECUTION: { label: 'Delivery & Execution', icon: '🚀', color: '#3b82f6', bg: '#eff6ff' },
    QUALITY: { label: 'Quality', icon: '🛡️', color: '#10b981', bg: '#ecfdf5' },
    ENGINEERING_EXCELLENCE: { label: 'Engineering Excellence', icon: '⚙️', color: '#8b5cf6', bg: '#f5f3ff' },
    COLLABORATION: { label: 'Collaboration', icon: '🤝', color: '#f59e0b', bg: '#fffbeb' },
    CUSTOM: { label: 'Custom', icon: '✏️', color: '#6b7280', bg: '#f9fafb' },
};

const PRESET_CATALOGUE = {
    DELIVERY_EXECUTION: [
        { key: 'SPRINT_COMMITMENT_PCT', label: '% of sprint commitments completed', unit: '%' },
        { key: 'ON_TIME_DELIVERY_RATE', label: 'On-time delivery rate', unit: '%' },
        { key: 'SLA_ADHERENCE', label: 'SLA adherence', unit: '%' },
    ],
    QUALITY: [
        { key: 'DEFECT_LEAKAGE_RATE', label: 'Defect leakage rate', unit: 'defects/story' },
        { key: 'CODE_REVIEW_DEFECTS', label: 'Code review defects', unit: 'count' },
        { key: 'PRODUCTION_INCIDENTS', label: 'Production incidents', unit: 'count/month' },
    ],
    ENGINEERING_EXCELLENCE: [
        { key: 'CODE_COVERAGE_PCT', label: 'Code coverage %', unit: '%' },
        { key: 'PERFORMANCE_IMPROVEMENTS', label: 'Performance improvements', unit: 'count' },
        { key: 'AUTOMATION_CONTRIBUTION', label: 'Automation contribution', unit: 'scripts' },
    ],
    COLLABORATION: [
        { key: 'FEEDBACK_360_SCORE', label: '360° feedback score', unit: 'score 1-5' },
        { key: 'STAKEHOLDER_SATISFACTION', label: 'Stakeholder satisfaction rating', unit: 'score 1-5' },
    ],
};

const STATUS_CFG = {
    NOT_STARTED: { label: 'Not Started', color: '#94a3b8', bg: '#f1f5f9' },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
    COMPLETED: { label: 'Completed', color: '#10b981', bg: '#ecfdf5' },
    ON_HOLD: { label: 'On Hold', color: '#f59e0b', bg: '#fffbeb' },
    CANCELLED: { label: 'Cancelled', color: '#6b7280', bg: '#f9fafb' },
};

const TMPL_STATUS_CFG = {
    DRAFT: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6', icon: '📝' },
    PUBLISHED: { label: 'Published', color: '#2563eb', bg: '#dbeafe', icon: '✅' },
    LOCKED: { label: 'Locked', color: '#7c3aed', bg: '#ede9fe', icon: '🔒' },
};

const EXCEL_COLUMNS = ['pillar', 'presetMetric', 'customMetricName', 'description', 'unit', 'targetValue', 'weightage'];

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/* ─── Main Component ─────────────────────────────────────────────────────── */
const GoalsTab = () => {
    const { user } = useAuth();
    const toast = useToast();
    const canManage = ['ADMIN', 'HR', 'MANAGER'].includes(user?.role);

    // View tabs: "my-goals" | "manage"
    const [view, setView] = useState('my-goals');

    // My goals (employee view)
    const [myGoals, setMyGoals] = useState([]);
    const [loading, setLoading] = useState(true);

    // Manager view
    const [templates, setTemplates] = useState([]);
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [templateGoals, setTemplateGoals] = useState([]);
    const [cycles, setCycles] = useState([]);

    // Create template wizard
    const [showCreateWizard, setShowCreateWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardData, setWizardData] = useState({
        cycleId: '', templateName: '', description: '',
        submissionDeadline: '', metrics: [],
    });
    const [metricInputMode, setMetricInputMode] = useState('form'); // 'form' | 'excel'

    // Add single metric form
    const BLANK_METRIC = {
        pillar: 'DELIVERY_EXECUTION', presetMetric: 'SPRINT_COMMITMENT_PCT',
        customMetricName: '', description: '', unit: '%', targetValue: '', weightage: 10
    };
    const [metricForm, setMetricForm] = useState(BLANK_METRIC);

    // Excel import for metrics
    const [csvText, setCsvText] = useState('');
    const [parsedMetrics, setParsedMetrics] = useState([]);
    const [parseErrors, setParseErrors] = useState([]);
    const fileRef = useRef(null);

    // Employee submit modal
    const [submitModal, setSubmitModal] = useState(null); // { goal }
    const [submitForm, setSubmitForm] = useState({ achievedValue: '', progressPct: 0, selfComments: '' });

    // Manager comment / approve modal
    const [reviewModal, setReviewModal] = useState(null); // { goal }
    const [reviewComment, setReviewComment] = useState('');

    // Filter for templateGoals
    const [filterEmployee, setFilterEmployee] = useState('ALL');
    const [filterApproval, setFilterApproval] = useState('ALL');

    /* ── Load ── */
    useEffect(() => { loadAll(); }, [view]);

    const loadAll = async () => {
        setLoading(true);
        try {
            if (view === 'my-goals') {
                const r = await goalTemplateAPI.getMyGoals();
                setMyGoals(r.data?.goals || []);
            } else if (view === 'manage' && canManage) {
                const [tR, cR] = await Promise.all([
                    goalTemplateAPI.getMyTemplates(),
                    appraisalAPI.getAllCycles(),
                ]);
                setTemplates(tR.data?.templates || []);
                setCycles(cR.data?.cycles || []);
                setActiveTemplate(null);
                setTemplateGoals([]);
            }
        } catch {
            toast.error('Failed to load goals');
        } finally {
            setLoading(false);
        }
    };

    const loadTemplateGoals = async (templateId) => {
        try {
            const r = await goalTemplateAPI.getTemplateGoals(templateId);
            setTemplateGoals(r.data?.goals || []);
        } catch {
            toast.error('Failed to load template goals');
        }
    };

    /* ── Wizard helpers ── */
    const addMetricToWizard = () => {
        const preset = metricForm.presetMetric;
        const isCustom = preset === 'CUSTOM';
        if (isCustom && !metricForm.customMetricName.trim()) {
            toast.error('Enter a name for the custom metric'); return;
        }
        const pillarMetrics = PRESET_CATALOGUE[metricForm.pillar] || [];
        const presetEntry = pillarMetrics.find(p => p.key === preset);
        setWizardData(p => ({
            ...p,
            metrics: [...p.metrics, {
                pillar: metricForm.pillar,
                presetMetric: preset,
                customMetricName: isCustom ? metricForm.customMetricName : '',
                description: metricForm.description,
                unit: metricForm.unit || (presetEntry?.unit || ''),
                targetValue: metricForm.targetValue,
                weightage: metricForm.weightage,
                _label: isCustom ? metricForm.customMetricName : (presetEntry?.label || preset),
            }]
        }));
        setMetricForm(BLANK_METRIC);
    };

    const removeWizardMetric = (idx) => {
        setWizardData(p => ({ ...p, metrics: p.metrics.filter((_, i) => i !== idx) }));
    };

    /* ── CSV parse for metrics ── */
    const parseMetricCSV = (raw) => {
        const lines = raw.trim().split('\n').filter(Boolean);
        if (lines.length < 2) { setParsedMetrics([]); setParseErrors(['Need a header row and at least one data row']); return; }
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = []; const errors = [];
        for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
            if (!row.pillar) { errors.push(`Row ${i}: pillar is required`); continue; }
            rows.push(row);
        }
        setParsedMetrics(rows); setParseErrors(errors);
    };

    const bulkMetricsFromCSV = () => {
        if (parsedMetrics.length === 0) { toast.error('No valid rows'); return; }
        setWizardData(p => ({
            ...p,
            metrics: [...p.metrics, ...parsedMetrics.map(r => {
                const isCustom = r.presetMetric === 'CUSTOM' || !r.presetMetric;
                const pillar = r.pillar || 'DELIVERY_EXECUTION';
                const preset = r.presetMetric || 'CUSTOM';
                const pillarMetrics = PRESET_CATALOGUE[pillar] || [];
                const presetEntry = pillarMetrics.find(p => p.key === preset);
                return {
                    pillar, presetMetric: preset,
                    customMetricName: r.customMetricName || '',
                    description: r.description || '',
                    unit: r.unit || presetEntry?.unit || '',
                    targetValue: r.targetValue || '',
                    weightage: parseInt(r.weightage) || 10,
                    _label: isCustom ? r.customMetricName : (presetEntry?.label || preset),
                };
            })]
        }));
        setCsvText(''); setParsedMetrics([]); setParseErrors([]);
        toast.success(`Added ${parsedMetrics.length} metrics`);
    };

    const downloadMetricTemplate = () => {
        const header = EXCEL_COLUMNS.join(',');
        const sample = 'DELIVERY_EXECUTION,SPRINT_COMMITMENT_PCT,,Sprint commitments completed,%,90,25';
        const blob = new Blob([header + '\n' + sample], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'metrics_template.csv'; a.click();
    };

    /* ── Create template ── */
    const handleCreateTemplate = async () => {
        if (!wizardData.cycleId) { toast.error('Select an appraisal cycle'); return; }
        if (!wizardData.templateName.trim()) { toast.error('Give the template a name'); return; }
        if (!wizardData.submissionDeadline) { toast.error('Set a submission deadline'); return; }
        if (wizardData.metrics.length === 0) { toast.error('Add at least one metric'); return; }

        try {
            const tRes = await goalTemplateAPI.createTemplate({
                cycleId: parseInt(wizardData.cycleId),
                templateName: wizardData.templateName,
                description: wizardData.description,
                submissionDeadline: wizardData.submissionDeadline,
            });
            const tid = tRes.data.template.id;
            await goalTemplateAPI.bulkAddMetrics(tid, wizardData.metrics);
            toast.success('Goal template created!');
            setShowCreateWizard(false);
            setWizardData({ cycleId: '', templateName: '', description: '', submissionDeadline: '', metrics: [] });
            setWizardStep(1);
            loadAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create template');
        }
    };

    /* ── Publish / Lock ── */
    const handlePublish = async (tid) => {
        if (!window.confirm('Publish this template? Goals will be created for all your direct reports and become visible to them.')) return;
        try {
            const r = await goalTemplateAPI.publishTemplate(tid);
            const res = r.data.result;
            toast.success(`Published! ${res.goalsCreated} goals created for ${res.employeesNotified} employees.`);
            loadAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to publish');
        }
    };

    const handleLock = async (tid) => {
        if (!window.confirm('Lock this template? Employees will no longer be able to edit their submissions.')) return;
        try {
            await goalTemplateAPI.lockTemplate(tid);
            toast.success('Template locked. Ready for final rating.');
            loadAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to lock');
        }
    };

    /* ── Goal approval ── */
    const handleApprove = async (goalId) => {
        try {
            await goalTemplateAPI.approveGoal(goalId, reviewComment);
            toast.success('Goal approved');
            setReviewModal(null); setReviewComment('');
            loadTemplateGoals(activeTemplate.id);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to approve');
        }
    };

    const handleReject = async (goalId) => {
        if (!reviewComment.trim()) { toast.error('Add a comment explaining the rejection'); return; }
        try {
            await goalTemplateAPI.rejectGoal(goalId, reviewComment);
            toast.success('Sent back to employee for review');
            setReviewModal(null); setReviewComment('');
            loadTemplateGoals(activeTemplate.id);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to reject');
        }
    };

    /* ── Employee submit actuals ── */
    const handleSubmitActuals = async () => {
        try {
            await goalTemplateAPI.submitActuals(submitModal.goal.id, {
                achievedValue: submitModal.goal.targetValue ? parseFloat(submitForm.achievedValue) || undefined : undefined,
                progressPct: parseInt(submitForm.progressPct) || undefined,
                selfComments: submitForm.selfComments,
            });
            toast.success('Progress submitted to your manager!');
            setSubmitModal(null);
            setSubmitForm({ achievedValue: '', progressPct: 0, selfComments: '' });
            loadAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit');
        }
    };

    /* ── Derived data ── */
    const myStats = {
        total: myGoals.length,
        submitted: myGoals.filter(g => g.employeeSubmitted).length,
        approved: myGoals.filter(g => g.managerApproved).length,
        avgProgress: myGoals.length > 0
            ? Math.round(myGoals.reduce((s, g) => s + (g.progressPct || 0), 0) / myGoals.length) : 0,
    };

    const filteredTemplateGoals = templateGoals.filter(g => {
        if (filterEmployee !== 'ALL' && g.assignedTo?.id?.toString() !== filterEmployee) return false;
        if (filterApproval === 'SUBMITTED' && !g.employeeSubmitted) return false;
        if (filterApproval === 'APPROVED' && !g.managerApproved) return false;
        if (filterApproval === 'PENDING' && (g.managerApproved || !g.employeeSubmitted)) return false;
        return true;
    });

    /* ── Group by employee ── */
    const goalsByEmployee = filteredTemplateGoals.reduce((acc, g) => {
        const empId = g.assignedTo?.id;
        if (!empId) return acc;
        if (!acc[empId]) acc[empId] = { employee: g.assignedTo, goals: [] };
        acc[empId].goals.push(g);
        return acc;
    }, {});

    const pillarGroups = myGoals.reduce((acc, g) => {
        const p = g.pillar || 'CUSTOM';
        if (!acc[p]) acc[p] = [];
        acc[p].push(g);
        return acc;
    }, {});

    /* ── Render ── */
    if (loading) return (
        <div className="gt-loading"><div className="gt-spinner" /><p>Loading goals...</p></div>
    );

    return (
        <div className="gt-wrap">

            {/* Header */}
            <div className="gt-top">
                <div>
                    <h2 className="gt-heading">🎯 Goals & Performance</h2>
                    <p className="gt-sub">Structured goal-setting with four engineering pillars</p>
                </div>
                {canManage && (
                    <div className="gt-header-actions">
                        {view === 'manage' && (
                            <button className="gt-btn-primary" onClick={() => setShowCreateWizard(true)}>
                                + New Goal Template
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* View tabs */}
            <div className="gt-tabs">
                <button className={`gt-tab ${view === 'my-goals' ? 'active' : ''}`} onClick={() => setView('my-goals')}>
                    📥 My Goals <span className="gt-badge-sm">{myGoals.length}</span>
                </button>
                {canManage && (
                    <button className={`gt-tab ${view === 'manage' ? 'active' : ''}`} onClick={() => setView('manage')}>
                        ⚙️ Manage Templates <span className="gt-badge-sm">{templates.length}</span>
                    </button>
                )}
            </div>

            {/* ════════════════════════════════
                MY GOALS VIEW
               ════════════════════════════════ */}
            {view === 'my-goals' && (
                <div>
                    {/* Stats */}
                    <div className="gt-stats">
                        <div className="gt-stat"><span className="gt-stat-n">{myStats.total}</span><span className="gt-stat-l">Total Goals</span></div>
                        <div className="gt-stat submitted"><span className="gt-stat-n">{myStats.submitted}</span><span className="gt-stat-l">Submitted</span></div>
                        <div className="gt-stat completed"><span className="gt-stat-n">{myStats.approved}</span><span className="gt-stat-l">Manager Approved</span></div>
                        <div className="gt-stat progress">
                            <span className="gt-stat-n">{myStats.avgProgress}%</span>
                            <span className="gt-stat-l">Avg Progress</span>
                            <div className="gt-mini-bar"><div className="gt-mini-fill" style={{ width: `${myStats.avgProgress}%` }} /></div>
                        </div>
                    </div>

                    {myGoals.length === 0 ? (
                        <div className="gt-empty">
                            <div className="gt-empty-icon">🎯</div>
                            <h3>No goals assigned to you yet.</h3>
                            <p>Your manager will publish goals once they set up a goal template for the cycle.</p>
                        </div>
                    ) : (
                        Object.entries(pillarGroups).map(([pillar, goals]) => {
                            const pcfg = PILLAR_CFG[pillar] || PILLAR_CFG.CUSTOM;
                            return (
                                <div key={pillar} className="gt-pillar-group">
                                    <div className="gt-pillar-header" style={{ borderColor: pcfg.color, background: pcfg.bg }}>
                                        <span className="gt-pillar-icon">{pcfg.icon}</span>
                                        <span style={{ color: pcfg.color }}>{pcfg.label}</span>
                                        <span className="gt-badge-sm" style={{ background: pcfg.color }}>{goals.length}</span>
                                    </div>
                                    <div className="gt-list">
                                        {goals.map(goal => {
                                            const pct = goal.progressPct || 0;
                                            const st = STATUS_CFG[goal.status] || STATUS_CFG.NOT_STARTED;
                                            return (
                                                <div key={goal.id} className={`gt-card ${goal.managerApproved ? 'approved' : ''}`}>
                                                    <div className="gt-card-accent" style={{ background: pcfg.color }} />
                                                    <div className="gt-card-body">
                                                        <div className="gt-card-top">
                                                            <div className="gt-card-title-group">
                                                                <h3 className="gt-card-title">{goal.title}</h3>
                                                                {goal.unit && <span className="gt-unit-chip">{goal.unit}</span>}
                                                            </div>
                                                            <div className="gt-card-badges">
                                                                <span className="gt-badge-pill" style={{ color: st.color, background: st.bg }}>
                                                                    {st.label}
                                                                </span>
                                                                {goal.managerApproved && (
                                                                    <span className="gt-badge-pill" style={{ color: '#059669', background: '#d1fae5' }}>
                                                                        ✅ Approved
                                                                    </span>
                                                                )}
                                                                {goal.employeeSubmitted && !goal.managerApproved && (
                                                                    <span className="gt-badge-pill" style={{ color: '#d97706', background: '#fef3c7' }}>
                                                                        ⏳ Awaiting Review
                                                                    </span>
                                                                )}
                                                                <span className="gt-badge-pill gt-badge-weight">⚖ {goal.weightage}%</span>
                                                            </div>
                                                        </div>

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

                                                        {/* Target / actuals */}
                                                        {goal.targetValue != null && (
                                                            <div className="gt-target-row">
                                                                <span className="gt-target-label">Target:</span>
                                                                <span className="gt-target-val">
                                                                    {goal.achievedValue != null ? `${goal.achievedValue} / ` : ''}
                                                                    {goal.targetValue} {goal.unit}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Meta */}
                                                        <div className="gt-card-meta">
                                                            {goal.cycleName && <span className="gt-meta-item">🔄 {goal.cycleName}</span>}
                                                            {goal.dueDate && <span className="gt-meta-item">📅 Due: <strong>{fmtDate(goal.dueDate)}</strong></span>}
                                                            {goal.assignedBy && <span className="gt-meta-item">👤 Set by: {goal.assignedBy.name}</span>}
                                                        </div>

                                                        {/* Comments */}
                                                        {goal.managerComments && (
                                                            <div className="gt-comment-block manager">💬 <em>Manager: {goal.managerComments}</em></div>
                                                        )}
                                                        {goal.selfComments && (
                                                            <div className="gt-comment-block self">📝 <em>Your note: {goal.selfComments}</em></div>
                                                        )}

                                                        {/* Actions */}
                                                        <div className="gt-card-actions">
                                                            {!goal.managerApproved && (
                                                                <button className="gt-action start" onClick={() => {
                                                                    setSubmitModal({ goal });
                                                                    setSubmitForm({
                                                                        achievedValue: goal.achievedValue || '',
                                                                        progressPct: goal.progressPct || 0,
                                                                        selfComments: goal.selfComments || '',
                                                                    });
                                                                }}>
                                                                    {goal.employeeSubmitted ? '✏ Edit Submission' : '📊 Submit Actuals'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ════════════════════════════════
                MANAGER: MANAGE VIEW
               ════════════════════════════════ */}
            {view === 'manage' && canManage && (
                <div className="gt-manage-wrap">
                    {/* Template list */}
                    {!activeTemplate && (
                        <div>
                            {templates.length === 0 ? (
                                <div className="gt-empty">
                                    <div className="gt-empty-icon">📋</div>
                                    <h3>No goal templates yet.</h3>
                                    <p>Click "New Goal Template" to create one for a cycle.</p>
                                </div>
                            ) : (
                                <div className="gt-template-grid">
                                    {templates.map(t => {
                                        const tcfg = TMPL_STATUS_CFG[t.status] || TMPL_STATUS_CFG.DRAFT;
                                        return (
                                            <div key={t.id} className="gt-template-card">
                                                <div className="gt-tmpl-header">
                                                    <div>
                                                        <h3>{t.templateName}</h3>
                                                        <p className="gt-tmpl-cycle">{t.cycleName} <span className="gt-cycle-type">{t.cycleType}</span></p>
                                                    </div>
                                                    <span className="gt-status-pill" style={{ color: tcfg.color, background: tcfg.bg }}>
                                                        {tcfg.icon} {tcfg.label}
                                                    </span>
                                                </div>
                                                <div className="gt-tmpl-body">
                                                    {t.description && <p className="gt-tmpl-desc">{t.description}</p>}
                                                    <div className="gt-tmpl-meta">
                                                        <span>📊 {t.metricCount} metrics</span>
                                                        {t.submissionDeadline && <span>📅 Deadline: {fmtDate(t.submissionDeadline)}</span>}
                                                        {t.publishedAt && <span>✅ Published: {fmtDate(t.publishedAt)}</span>}
                                                    </div>
                                                </div>
                                                <div className="gt-tmpl-footer">
                                                    {t.status === 'DRAFT' && (
                                                        <button className="gt-btn-primary" onClick={() => handlePublish(t.id)}>🚀 Publish</button>
                                                    )}
                                                    {t.status === 'PUBLISHED' && (
                                                        <>
                                                            <button className="gt-btn-ghost" onClick={() => {
                                                                setActiveTemplate(t);
                                                                loadTemplateGoals(t.id);
                                                            }}>👁 Review Goals</button>
                                                            <button className="gt-btn-danger" onClick={() => handleLock(t.id)}>🔒 Lock</button>
                                                        </>
                                                    )}
                                                    {t.status === 'LOCKED' && (
                                                        <button className="gt-btn-ghost" onClick={() => {
                                                            setActiveTemplate(t);
                                                            loadTemplateGoals(t.id);
                                                        }}>🏅 Final Rating View</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Template goal review panel */}
                    {activeTemplate && (
                        <div className="gt-review-panel">
                            <div className="gt-review-header">
                                <button className="gt-back-btn" onClick={() => { setActiveTemplate(null); setTemplateGoals([]); }}>
                                    ← Back to Templates
                                </button>
                                <div>
                                    <h3>{activeTemplate.templateName}</h3>
                                    <p>{activeTemplate.cycleName} · {templateGoals.length} goals</p>
                                </div>
                                <span className="gt-status-pill" style={{ color: TMPL_STATUS_CFG[activeTemplate.status]?.color, background: TMPL_STATUS_CFG[activeTemplate.status]?.bg }}>
                                    {TMPL_STATUS_CFG[activeTemplate.status]?.icon} {activeTemplate.status}
                                </span>
                            </div>

                            {/* Filters */}
                            <div className="gt-review-filters">
                                <select className="gt-select" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                                    <option value="ALL">All Employees</option>
                                    {[...new Map(templateGoals.map(g => [g.assignedTo?.id, g.assignedTo])).values()].filter(Boolean).map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                                <select className="gt-select" value={filterApproval} onChange={e => setFilterApproval(e.target.value)}>
                                    <option value="ALL">All Status</option>
                                    <option value="SUBMITTED">Submitted</option>
                                    <option value="PENDING">Pending Review</option>
                                    <option value="APPROVED">Approved</option>
                                </select>
                            </div>

                            {/* Goals grouped by employee */}
                            {Object.values(goalsByEmployee).map(({ employee, goals }) => {
                                const submitted = goals.filter(g => g.employeeSubmitted).length;
                                const approved = goals.filter(g => g.managerApproved).length;
                                return (
                                    <div key={employee.id} className="gt-emp-section">
                                        <div className="gt-emp-header">
                                            <div className="gt-emp-avatar">{employee.name?.charAt(0)}</div>
                                            <div>
                                                <strong>{employee.name}</strong>
                                                <p className="gt-emp-meta">{employee.designation}</p>
                                            </div>
                                            <div className="gt-emp-progress-chips">
                                                <span className="gt-chip submitted">{submitted}/{goals.length} submitted</span>
                                                <span className="gt-chip approved">{approved}/{goals.length} approved</span>
                                            </div>
                                        </div>

                                        <table className="gt-review-table">
                                            <thead>
                                                <tr>
                                                    <th>Metric</th>
                                                    <th>Pillar</th>
                                                    <th>Target</th>
                                                    <th>Actual</th>
                                                    <th>Progress</th>
                                                    <th>Status</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {goals.map(g => {
                                                    const pcfg = PILLAR_CFG[g.pillar] || PILLAR_CFG.CUSTOM;
                                                    return (
                                                        <tr key={g.id} className={g.managerApproved ? 'row-approved' : g.employeeSubmitted ? 'row-submitted' : ''}>
                                                            <td>
                                                                <strong>{g.title}</strong>
                                                                {g.selfComments && <div className="gt-mini-comment">📝 {g.selfComments}</div>}
                                                            </td>
                                                            <td>
                                                                <span className="gt-pillar-chip" style={{ color: pcfg.color, background: pcfg.bg }}>
                                                                    {pcfg.icon} {pcfg.label}
                                                                </span>
                                                            </td>
                                                            <td>{g.targetValue != null ? `${g.targetValue} ${g.unit || ''}` : '—'}</td>
                                                            <td>{g.achievedValue != null ? `${g.achievedValue} ${g.unit || ''}` : '—'}</td>
                                                            <td>
                                                                <div className="gt-mini-bar-row">
                                                                    <div className="gt-mini-bar-t">
                                                                        <div className="gt-mini-bar-f" style={{ width: `${g.progressPct || 0}%`, background: (g.progressPct || 0) >= 75 ? '#10b981' : '#3b82f6' }} />
                                                                    </div>
                                                                    <span>{g.progressPct || 0}%</span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                {g.managerApproved
                                                                    ? <span className="gt-status-chip approved">✅ Approved</span>
                                                                    : g.employeeSubmitted
                                                                        ? <span className="gt-status-chip submitted">⏳ Submitted</span>
                                                                        : <span className="gt-status-chip pending">⬜ Pending</span>}
                                                            </td>
                                                            <td>
                                                                {g.employeeSubmitted && !g.managerApproved && (
                                                                    <button className="gt-action comment" onClick={() => { setReviewModal({ goal: g }); setReviewComment(g.managerComments || ''); }}>
                                                                        📋 Review
                                                                    </button>
                                                                )}
                                                                {g.managerApproved && (
                                                                    <button className="gt-action delete" onClick={() => { setReviewModal({ goal: g }); setReviewComment(g.managerComments || ''); }}>
                                                                        ✏ Edit
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                            {filteredTemplateGoals.length === 0 && (
                                <div className="gt-empty"><p>No goals match the current filter.</p></div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════
                CREATE TEMPLATE WIZARD
               ════════════════════════════════ */}
            {showCreateWizard && (
                <div className="gt-overlay" onClick={() => setShowCreateWizard(false)}>
                    <div className="gt-modal gt-modal-wide" onClick={e => e.stopPropagation()}>
                        <div className="gt-wizard-header">
                            <h2>📋 New Goal Template</h2>
                            <button className="gt-panel-close" onClick={() => setShowCreateWizard(false)}>✕</button>
                        </div>

                        {/* Step indicators */}
                        <div className="gt-wizard-steps">
                            {['Cycle & Info', 'Add Metrics', 'Review & Create'].map((s, i) => (
                                <div key={i} className={`gt-wstep ${wizardStep === i + 1 ? 'active' : wizardStep > i + 1 ? 'done' : ''}`}>
                                    <div className="gt-wstep-num">{wizardStep > i + 1 ? '✓' : i + 1}</div>
                                    <span>{s}</span>
                                </div>
                            ))}
                        </div>

                        {/* Step 1: Cycle info */}
                        {wizardStep === 1 && (
                            <div className="gt-wizard-body">
                                <div className="gt-field">
                                    <label>Appraisal Cycle *</label>
                                    <select required value={wizardData.cycleId}
                                        onChange={e => setWizardData(p => ({ ...p, cycleId: e.target.value }))}>
                                        <option value="">— Select a cycle —</option>
                                        {cycles.map(c => (
                                            <option key={c.id} value={c.id}>{c.cycleName} ({c.cycleType}) — {c.status}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="gt-field">
                                    <label>Template Name *</label>
                                    <input type="text" required value={wizardData.templateName}
                                        placeholder="e.g. Engineering Q1 2026 Goals"
                                        onChange={e => setWizardData(p => ({ ...p, templateName: e.target.value }))} />
                                </div>
                                <div className="gt-field">
                                    <label>Description</label>
                                    <textarea rows={2} value={wizardData.description}
                                        placeholder="Brief summary of what this template covers…"
                                        onChange={e => setWizardData(p => ({ ...p, description: e.target.value }))} />
                                </div>
                                <div className="gt-field">
                                    <label>Employee Submission Deadline *</label>
                                    <input type="date" required value={wizardData.submissionDeadline}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setWizardData(p => ({ ...p, submissionDeadline: e.target.value }))} />
                                </div>
                                <div className="gt-modal-footer">
                                    <button className="gt-btn-ghost" onClick={() => setShowCreateWizard(false)}>Cancel</button>
                                    <button className="gt-btn-primary" onClick={() => {
                                        if (!wizardData.cycleId) { toast.error('Select a cycle'); return; }
                                        if (!wizardData.templateName) { toast.error('Enter a template name'); return; }
                                        if (!wizardData.submissionDeadline) { toast.error('Set a deadline'); return; }
                                        setWizardStep(2);
                                    }}>Next →</button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Add metrics */}
                        {wizardStep === 2 && (
                            <div className="gt-wizard-body">
                                {/* Input mode toggle */}
                                <div className="gt-mode-toggle">
                                    <button className={`gt-mode-btn ${metricInputMode === 'form' ? 'active' : ''}`}
                                        onClick={() => setMetricInputMode('form')}>📝 Form</button>
                                    <button className={`gt-mode-btn ${metricInputMode === 'excel' ? 'active' : ''}`}
                                        onClick={() => setMetricInputMode('excel')}>📊 Excel / CSV</button>
                                </div>

                                {/* Predefined metric quick-pick */}
                                {metricInputMode === 'form' && (
                                    <div className="gt-metric-form">
                                        <div className="gt-field-row">
                                            <div className="gt-field">
                                                <label>Pillar *</label>
                                                <select value={metricForm.pillar}
                                                    onChange={e => {
                                                        const pillar = e.target.value;
                                                        const firstPreset = PRESET_CATALOGUE[pillar]?.[0]?.key || 'CUSTOM';
                                                        setMetricForm(p => ({ ...p, pillar, presetMetric: firstPreset, unit: PRESET_CATALOGUE[pillar]?.[0]?.unit || '' }));
                                                    }}>
                                                    {Object.entries(PILLAR_CFG).map(([k, v]) => (
                                                        <option key={k} value={k}>{v.icon} {v.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="gt-field">
                                                <label>Metric *</label>
                                                <select value={metricForm.presetMetric}
                                                    onChange={e => {
                                                        const pm = e.target.value;
                                                        const presets = PRESET_CATALOGUE[metricForm.pillar] || [];
                                                        const found = presets.find(p => p.key === pm);
                                                        setMetricForm(p => ({ ...p, presetMetric: pm, unit: found?.unit || p.unit }));
                                                    }}>
                                                    {(PRESET_CATALOGUE[metricForm.pillar] || []).map(p => (
                                                        <option key={p.key} value={p.key}>{p.label}</option>
                                                    ))}
                                                    <option value="CUSTOM">✏ Custom metric…</option>
                                                </select>
                                            </div>
                                        </div>
                                        {metricForm.presetMetric === 'CUSTOM' && (
                                            <div className="gt-field">
                                                <label>Custom Metric Name *</label>
                                                <input type="text" value={metricForm.customMetricName}
                                                    placeholder="e.g. Customer NPS score"
                                                    onChange={e => setMetricForm(p => ({ ...p, customMetricName: e.target.value }))} />
                                            </div>
                                        )}
                                        <div className="gt-field-row">
                                            <div className="gt-field">
                                                <label>Unit</label>
                                                <input type="text" value={metricForm.unit}
                                                    placeholder="e.g. %, count, score 1-5"
                                                    onChange={e => setMetricForm(p => ({ ...p, unit: e.target.value }))} />
                                            </div>
                                            <div className="gt-field">
                                                <label>Target Value</label>
                                                <input type="number" value={metricForm.targetValue}
                                                    placeholder="e.g. 90"
                                                    onChange={e => setMetricForm(p => ({ ...p, targetValue: e.target.value }))} />
                                            </div>
                                            <div className="gt-field">
                                                <label>Weight (%)</label>
                                                <input type="number" min={1} max={100} value={metricForm.weightage}
                                                    onChange={e => setMetricForm(p => ({ ...p, weightage: parseInt(e.target.value) || 10 }))} />
                                            </div>
                                        </div>
                                        <div className="gt-field">
                                            <label>Description</label>
                                            <textarea rows={2} value={metricForm.description}
                                                placeholder="Explain how this metric is measured…"
                                                onChange={e => setMetricForm(p => ({ ...p, description: e.target.value }))} />
                                        </div>
                                        <button className="gt-btn-ghost" onClick={addMetricToWizard}>+ Add to Template</button>
                                    </div>
                                )}

                                {/* Excel import */}
                                {metricInputMode === 'excel' && (
                                    <div className="gt-excel-steps">
                                        <div className="gt-excel-step">
                                            <div className="gt-step-num">1</div>
                                            <div className="gt-step-body">
                                                <h4>Download template</h4>
                                                <button className="gt-btn-ghost" onClick={downloadMetricTemplate}>⬇ Download CSV Template</button>
                                                <div className="gt-col-list">{EXCEL_COLUMNS.map(c => <span key={c} className="gt-col-chip">{c}</span>)}</div>
                                            </div>
                                        </div>
                                        <div className="gt-excel-step">
                                            <div className="gt-step-num">2</div>
                                            <div className="gt-step-body">
                                                <h4>Upload CSV or paste content</h4>
                                                <div className="gt-upload-row">
                                                    <button className="gt-btn-ghost" onClick={() => fileRef.current?.click()}>📁 Choose CSV</button>
                                                    <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
                                                        onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { setCsvText(ev.target.result); parseMetricCSV(ev.target.result); }; r.readAsText(f); }} />
                                                    <span className="gt-or">or paste</span>
                                                </div>
                                                <textarea className="gt-csv-textarea" rows={6} value={csvText}
                                                    placeholder="pillar,presetMetric,customMetricName,description,unit,targetValue,weightage&#10;DELIVERY_EXECUTION,SPRINT_COMMITMENT_PCT,,Sprint completed,%,90,25"
                                                    onChange={e => { setCsvText(e.target.value); parseMetricCSV(e.target.value); }} />
                                            </div>
                                        </div>
                                        {(parsedMetrics.length > 0 || parseErrors.length > 0) && (
                                            <div className="gt-excel-step">
                                                <div className="gt-step-num">3</div>
                                                <div className="gt-step-body">
                                                    {parseErrors.map((e, i) => <div key={i} className="gt-err-row">⚠ {e}</div>)}
                                                    {parsedMetrics.length > 0 && (
                                                        <>
                                                            <p className="gt-preview-count">✅ {parsedMetrics.length} metrics ready</p>
                                                            <button className="gt-btn-primary" onClick={bulkMetricsFromCSV}>⬆ Add All to Template</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Current metrics list */}
                                {wizardData.metrics.length > 0 && (
                                    <div className="gt-added-metrics">
                                        <h4>Metrics in this template ({wizardData.metrics.length})</h4>
                                        <div className="gt-metric-chips">
                                            {wizardData.metrics.map((m, idx) => {
                                                const pcfg = PILLAR_CFG[m.pillar] || PILLAR_CFG.CUSTOM;
                                                return (
                                                    <div key={idx} className="gt-metric-chip" style={{ borderColor: pcfg.color }}>
                                                        <span className="gt-chip-pillar" style={{ color: pcfg.color, background: pcfg.bg }}>{pcfg.icon} {pcfg.label}</span>
                                                        <span className="gt-chip-label">{m._label}</span>
                                                        {m.targetValue && <span className="gt-chip-target">→ {m.targetValue} {m.unit}</span>}
                                                        <span className="gt-chip-weight">{m.weightage}%</span>
                                                        <button className="gt-chip-remove" onClick={() => removeWizardMetric(idx)}>✕</button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="gt-weight-total">
                                            Total weight: <strong>{wizardData.metrics.reduce((s, m) => s + (parseInt(m.weightage) || 0), 0)}%</strong>
                                            {wizardData.metrics.reduce((s, m) => s + (parseInt(m.weightage) || 0), 0) !== 100 &&
                                                <span className="gt-weight-warn"> (should sum to 100%)</span>}
                                        </p>
                                    </div>
                                )}

                                <div className="gt-modal-footer">
                                    <button className="gt-btn-ghost" onClick={() => setWizardStep(1)}>← Back</button>
                                    <button className="gt-btn-primary" onClick={() => {
                                        if (wizardData.metrics.length === 0) { toast.error('Add at least one metric'); return; }
                                        setWizardStep(3);
                                    }}>Next →</button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {wizardStep === 3 && (
                            <div className="gt-wizard-body">
                                <div className="gt-review-summary">
                                    <div className="gt-review-row"><span>Cycle:</span><strong>{cycles.find(c => c.id == wizardData.cycleId)?.cycleName || wizardData.cycleId}</strong></div>
                                    <div className="gt-review-row"><span>Template:</span><strong>{wizardData.templateName}</strong></div>
                                    <div className="gt-review-row"><span>Submission deadline:</span><strong>{fmtDate(wizardData.submissionDeadline)}</strong></div>
                                    <div className="gt-review-row"><span>Total metrics:</span><strong>{wizardData.metrics.length}</strong></div>
                                </div>
                                <div className="gt-added-metrics">
                                    {['DELIVERY_EXECUTION', 'QUALITY', 'ENGINEERING_EXCELLENCE', 'COLLABORATION', 'CUSTOM'].map(pillar => {
                                        const pMetrics = wizardData.metrics.filter(m => m.pillar === pillar);
                                        if (pMetrics.length === 0) return null;
                                        const pcfg = PILLAR_CFG[pillar];
                                        return (
                                            <div key={pillar} className="gt-review-pillar">
                                                <div className="gt-pillar-header" style={{ borderColor: pcfg.color, background: pcfg.bg }}>
                                                    <span>{pcfg.icon} {pcfg.label}</span>
                                                    <span className="gt-badge-sm" style={{ background: pcfg.color }}>{pMetrics.length}</span>
                                                </div>
                                                {pMetrics.map((m, idx) => (
                                                    <div key={idx} className="gt-review-metric-row">
                                                        <span>{m._label}</span>
                                                        <span className="gt-meta-item">{m.targetValue ? `Target: ${m.targetValue} ${m.unit}` : ''}</span>
                                                        <span className="gt-badge-pill gt-badge-weight">⚖ {m.weightage}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="gt-modal-footer">
                                    <button className="gt-btn-ghost" onClick={() => setWizardStep(2)}>← Back</button>
                                    <button className="gt-btn-primary" onClick={handleCreateTemplate}>✓ Create Template</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════
                EMPLOYEE SUBMIT ACTUALS MODAL
               ════════════════════════════════ */}
            {submitModal && (
                <div className="gt-overlay" onClick={() => setSubmitModal(null)}>
                    <div className="gt-modal" onClick={e => e.stopPropagation()}>
                        <h2>📊 Submit Actuals</h2>
                        <p className="gt-modal-sub">{submitModal.goal.title}</p>
                        <div className="gt-modal-form">
                            {submitModal.goal.targetValue != null && (
                                <div className="gt-field">
                                    <label>Achieved Value (target: {submitModal.goal.targetValue} {submitModal.goal.unit})</label>
                                    <input type="number" value={submitForm.achievedValue}
                                        placeholder={`e.g. ${Math.round(submitModal.goal.targetValue * 0.8)}`}
                                        onChange={e => {
                                            const av = parseFloat(e.target.value) || 0;
                                            const tv = submitModal.goal.targetValue;
                                            const auto = tv > 0 ? Math.min(100, Math.round(av / tv * 100)) : 0;
                                            setSubmitForm(p => ({ ...p, achievedValue: e.target.value, progressPct: auto }));
                                        }} />
                                </div>
                            )}
                            <div className="gt-field">
                                <label>Progress % (0–100)</label>
                                <div className="gt-slider-wrap">
                                    <input type="range" min={0} max={100} value={submitForm.progressPct}
                                        onChange={e => setSubmitForm(p => ({ ...p, progressPct: e.target.value }))} />
                                    <span className="gt-slider-val">{submitForm.progressPct}%</span>
                                </div>
                            </div>
                            <div className="gt-field">
                                <label>Self Assessment / Notes *</label>
                                <textarea rows={3} value={submitForm.selfComments}
                                    onChange={e => setSubmitForm(p => ({ ...p, selfComments: e.target.value }))}
                                    placeholder="Explain your progress, blockers, and what you've achieved…" />
                            </div>
                            <div className="gt-modal-footer">
                                <button className="gt-btn-ghost" onClick={() => setSubmitModal(null)}>Cancel</button>
                                <button className="gt-btn-primary" onClick={handleSubmitActuals}>🚀 Submit to Manager</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════
                MANAGER REVIEW MODAL
               ════════════════════════════════ */}
            {reviewModal && (
                <div className="gt-overlay" onClick={() => setReviewModal(null)}>
                    <div className="gt-modal" onClick={e => e.stopPropagation()}>
                        <h2>📋 Review Submission</h2>
                        <p className="gt-modal-sub">{reviewModal.goal.title} — {reviewModal.goal.assignedTo?.name}</p>

                        <div className="gt-modal-form">
                            <div className="gt-review-detail-row">
                                <div><strong>Target</strong><p>{reviewModal.goal.targetValue != null ? `${reviewModal.goal.targetValue} ${reviewModal.goal.unit || ''}` : '—'}</p></div>
                                <div><strong>Actual</strong><p>{reviewModal.goal.achievedValue != null ? `${reviewModal.goal.achievedValue} ${reviewModal.goal.unit || ''}` : '—'}</p></div>
                                <div><strong>Progress</strong><p>{reviewModal.goal.progressPct || 0}%</p></div>
                            </div>
                            {reviewModal.goal.selfComments && (
                                <div className="gt-comment-block self">📝 <em>{reviewModal.goal.selfComments}</em></div>
                            )}
                            <div className="gt-field">
                                <label>Manager Feedback / Comments</label>
                                <textarea rows={3} value={reviewComment}
                                    onChange={e => setReviewComment(e.target.value)}
                                    placeholder="Provide feedback, or reason for rejection…" />
                            </div>
                            <div className="gt-modal-footer">
                                <button className="gt-btn-ghost" onClick={() => setReviewModal(null)}>Cancel</button>
                                <button className="gt-btn-danger" onClick={() => handleReject(reviewModal.goal.id)}>↩ Send Back</button>
                                <button className="gt-btn-primary" onClick={() => handleApprove(reviewModal.goal.id)}>✅ Approve</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoalsTab;
