import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { jobPostingAPI } from '../services/api';
import BackButton from '../components/BackButton';
import Icon from '../components/Icon';
import './JobPostings.css';

const STATUS_COLORS = {
    OPEN: { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
    CLOSED: { bg: '#fee2e2', text: '#7f1d1d', dot: '#ef4444' },
    ON_HOLD: { bg: '#fef3c7', text: '#78350f', dot: '#f59e0b' },
    FILLED: { bg: '#dbeafe', text: '#1e3a8a', dot: '#3b82f6' },
};

const APP_STATUS_COLORS = {
    APPLIED: { bg: '#e0f2fe', text: '#0369a1' },
    SCREENING: { bg: '#fef9c3', text: '#854d0e' },
    INTERVIEW: { bg: '#ede9fe', text: '#4c1d95' },
    OFFER: { bg: '#dcfce7', text: '#166534' },
    HIRED: { bg: '#d1fae5', text: '#065f46' },
    REJECTED: { bg: '#fee2e2', text: '#7f1d1d' },
    WITHDRAWN: { bg: '#f3f4f6', text: '#374151' },
    ON_HOLD: { bg: '#fef3c7', text: '#78350f' },
};

const EMPLOYMENT_TYPES = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERN: 'Intern', TEMPORARY: 'Temporary' };

const emptyForm = {
    jobTitle: '', jobDescription: '', requirements: '', location: '',
    employmentType: 'FULL_TIME', experienceMin: 0, experienceMax: 5,
    salaryMin: '', salaryMax: '', numberOfOpenings: 1, closingDate: '',
    status: 'OPEN',
};

const JobPostings = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    // UI state
    const [activeTab, setActiveTab] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

    // Applications panel
    const [applicationsPanel, setApplicationsPanel] = useState(false);
    const [applications, setApplications] = useState([]);
    const [appsLoading, setAppsLoading] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);

    // Form state
    const [form, setForm] = useState(emptyForm);
    const [formLoading, setFormLoading] = useState(false);

    const STATUS_TABS = ['ALL', 'OPEN', 'ON_HOLD', 'CLOSED', 'FILLED'];

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await jobPostingAPI.getAll({});
            const data = res.data?.data || res.data || [];
            setJobs(data);
        } catch (err) {
            showToast('Failed to load job postings', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        if (!isHR) return;
        try {
            const res = await jobPostingAPI.getStats();
            setStats(res.data?.data || res.data);
        } catch { }
    }, [isHR]);

    useEffect(() => {
        fetchJobs();
        fetchStats();
    }, [fetchJobs, fetchStats]);

    useEffect(() => {
        let result = jobs;
        if (activeTab !== 'ALL') result = result.filter(j => j.status === activeTab);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(j =>
                j.jobTitle?.toLowerCase().includes(q) ||
                j.location?.toLowerCase().includes(q) ||
                j.departmentName?.toLowerCase().includes(q)
            );
        }
        setFilteredJobs(result);
    }, [jobs, activeTab, searchQuery]);

    const openCreateForm = () => {
        setEditingJob(null);
        setForm(emptyForm);
        setShowForm(true);
    };

    const openEditForm = (job) => {
        setEditingJob(job);
        setForm({
            jobTitle: job.jobTitle || '',
            jobDescription: job.jobDescription || '',
            requirements: job.requirements || '',
            location: job.location || '',
            employmentType: job.employmentType || 'FULL_TIME',
            experienceMin: job.experienceMin ?? 0,
            experienceMax: job.experienceMax ?? 5,
            salaryMin: job.salaryMin || '',
            salaryMax: job.salaryMax || '',
            numberOfOpenings: job.numberOfOpenings || 1,
            closingDate: job.closingDate || '',
            status: job.status || 'OPEN',
        });
        setShowForm(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            if (editingJob) {
                await jobPostingAPI.update(editingJob.id, form);
                showToast('Job posting updated!', 'success');
            } else {
                await jobPostingAPI.create(form);
                showToast('Job posting created!', 'success');
            }
            setShowForm(false);
            fetchJobs();
            fetchStats();
        } catch (err) {
            showToast(err.response?.data?.error || 'Operation failed', 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const handleStatusChange = async (jobId, action) => {
        try {
            if (action === 'publish') await jobPostingAPI.publish(jobId);
            else if (action === 'close') await jobPostingAPI.close(jobId);
            else if (action === 'hold') await jobPostingAPI.hold(jobId);
            showToast('Status updated successfully!', 'success');
            fetchJobs();
            fetchStats();
        } catch (err) {
            showToast('Failed to update status', 'error');
        }
    };

    const handleDelete = async (jobId) => {
        if (!window.confirm('Delete this job posting? This cannot be undone.')) return;
        try {
            await jobPostingAPI.delete(jobId);
            showToast('Job posting deleted', 'success');
            fetchJobs();
            fetchStats();
        } catch {
            showToast('Failed to delete', 'error');
        }
    };

    const openApplications = async (job) => {
        setSelectedJob(job);
        setApplicationsPanel(true);
        setAppsLoading(true);
        try {
            const res = await jobPostingAPI.getApplications(job.id);
            setApplications(res.data?.data || res.data || []);
        } catch {
            showToast('Failed to load applications', 'error');
        } finally {
            setAppsLoading(false);
        }
    };

    const updateAppStatus = async (appId, status) => {
        try {
            await jobPostingAPI.updateApplicationStatus(appId, { status });
            showToast('Application status updated!', 'success');
            openApplications(selectedJob);
        } catch {
            showToast('Failed to update application status', 'error');
        }
    };

    const parseJSON = (str) => {
        try { return JSON.parse(str); } catch { return null; }
    };

    return (
        <div className="jp-container">
            <BackButton to="/dashboard" />

            {/* Header */}
            <div className="jp-header">
                <div className="jp-header-left">
                    <div className="jp-title-row">
                        <Icon name="briefcase" size={32} className="jp-icon" />
                        <div>
                            <h1>Recruitment</h1>
                            <p>Manage job postings and review applications</p>
                        </div>
                    </div>
                </div>
                <div className="jp-header-actions">
                    {isHR && (
                        <button className="jp-btn jp-btn-primary" onClick={openCreateForm}>
                            <span>+</span> New Job Posting
                        </button>
                    )}
                </div>
            </div>

            {/* Stats row */}
            {isHR && stats && (
                <div className="jp-stats-row">
                    {[
                        { label: 'Open Positions', value: stats.totalOpenJobs ?? 0, icon: 'tasks', color: 'green' },
                        { label: 'Total Postings', value: stats.totalJobPostings ?? 0, icon: 'briefcase', color: 'blue' },
                        { label: 'Total Applications', value: stats.totalApplications ?? 0, icon: 'users', color: 'purple' },
                        { label: 'Pending Review', value: stats.pendingApplications ?? 0, icon: 'clock', color: 'amber' },
                    ].map((s, i) => (
                        <div key={i} className={`jp-stat-card jp-stat-${s.color}`}>
                            <span className="jp-stat-icon">
                                <Icon name={s.icon} size={24} />
                            </span>
                            <div>
                                <div className="jp-stat-value">{s.value}</div>
                                <div className="jp-stat-label">{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Toolbar */}
            <div className="jp-toolbar">
                <div className="jp-tabs">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab}
                            className={`jp-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'ALL' ? 'All Jobs' : tab.replace('_', ' ')}
                            {tab === 'ALL' && <span className="jp-tab-count">{jobs.length}</span>}
                            {tab !== 'ALL' && <span className="jp-tab-count">{jobs.filter(j => j.status === tab).length}</span>}
                        </button>
                    ))}
                </div>
                <div className="jp-toolbar-right">
                    <div className="jp-search">
                        <span className="jp-search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search jobs..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="jp-view-toggle">
                        <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>⊞</button>
                        <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>≡</button>
                    </div>
                </div>
            </div>

            {/* Job List */}
            {loading ? (
                <div className="jp-loading">
                    <div className="jp-spinner" />
                    <p>Loading job postings...</p>
                </div>
            ) : filteredJobs.length === 0 ? (
                <div className="jp-empty">
                    <div className="jp-empty-icon">💼</div>
                    <h3>No job postings found</h3>
                    <p>{isHR ? 'Create your first job posting to get started.' : 'Check back later for new opportunities.'}</p>
                    {isHR && <button className="jp-btn jp-btn-primary" onClick={openCreateForm}>+ Create Job Posting</button>}
                </div>
            ) : (
                <div className={`jp-grid ${viewMode === 'list' ? 'jp-grid-list' : ''}`}>
                    {filteredJobs.map(job => {
                        const sc = STATUS_COLORS[job.status] || STATUS_COLORS.OPEN;
                        return (
                            <div key={job.id} className="jp-card">
                                <div className="jp-card-header">
                                    <div className="jp-card-title">
                                        <h3>{job.jobTitle}</h3>
                                        <div className="jp-card-meta">
                                            {job.departmentName && <span className="jp-meta-chip">🏢 {job.departmentName}</span>}
                                            <span className="jp-meta-chip">📍 {job.location || 'Remote'}</span>
                                            <span className="jp-meta-chip">🕐 {EMPLOYMENT_TYPES[job.employmentType] || job.employmentType}</span>
                                        </div>
                                    </div>
                                    <span
                                        className="jp-status-badge"
                                        style={{ background: sc.bg, color: sc.text }}
                                    >
                                        <span className="jp-status-dot" style={{ background: sc.dot }} />
                                        {job.status?.replace('_', ' ')}
                                    </span>
                                </div>

                                {job.jobDescription && (
                                    <p className="jp-card-desc">
                                        {job.jobDescription.length > 120
                                            ? job.jobDescription.substring(0, 120) + '...'
                                            : job.jobDescription}
                                    </p>
                                )}

                                <div className="jp-card-info">
                                    {(job.experienceMin != null || job.experienceMax != null) && (
                                        <span className="jp-info-tag">
                                            🎯 {job.experienceMin ?? 0}–{job.experienceMax ?? '?'} yrs exp
                                        </span>
                                    )}
                                    {(job.salaryMin || job.salaryMax) && (
                                        <span className="jp-info-tag">
                                            💰 ₹{job.salaryMin ? (Number(job.salaryMin) / 100000).toFixed(1) + 'L' : '?'} – ₹{job.salaryMax ? (Number(job.salaryMax) / 100000).toFixed(1) + 'L' : '?'}
                                        </span>
                                    )}
                                    {job.numberOfOpenings > 1 && (
                                        <span className="jp-info-tag">👤 {job.numberOfOpenings} openings</span>
                                    )}
                                    {job.closingDate && (
                                        <span className="jp-info-tag">📅 Closes {new Date(job.closingDate).toLocaleDateString()}</span>
                                    )}
                                </div>

                                <div className="jp-card-footer">
                                    <div className="jp-card-stats">
                                        <button
                                            className="jp-apps-btn"
                                            onClick={() => openApplications(job)}
                                        >
                                            👥 {job.applicationsCount ?? 0} Applications
                                        </button>
                                        {job.postedDate && (
                                            <span className="jp-posted-date">
                                                Posted {new Date(job.postedDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    {isHR && (
                                        <div className="jp-card-actions">
                                            {job.status === 'ON_HOLD' && (
                                                <button className="jp-action-btn jp-action-green" onClick={() => handleStatusChange(job.id, 'publish')}>
                                                    ▶ Open
                                                </button>
                                            )}
                                            {job.status === 'OPEN' && (
                                                <>
                                                    <button className="jp-action-btn jp-action-amber" onClick={() => handleStatusChange(job.id, 'hold')}>
                                                        ⏸ Hold
                                                    </button>
                                                    <button className="jp-action-btn jp-action-red" onClick={() => handleStatusChange(job.id, 'close')}>
                                                        ✕ Close
                                                    </button>
                                                </>
                                            )}
                                            <button className="jp-action-btn jp-action-blue" onClick={() => openEditForm(job)}>
                                                ✎ Edit
                                            </button>
                                            <button className="jp-action-btn jp-action-danger" onClick={() => handleDelete(job.id)}>
                                                🗑
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Form Modal */}
            {showForm && (
                <div className="jp-modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="jp-modal" onClick={e => e.stopPropagation()}>
                        <div className="jp-modal-header">
                            <h2>{editingJob ? '✎ Edit Job Posting' : '+ New Job Posting'}</h2>
                            <button className="jp-close-btn" onClick={() => setShowForm(false)}>✕</button>
                        </div>
                        <div className="jp-modal-body">
                            <form onSubmit={handleFormSubmit}>
                                <div className="jp-form-section">
                                    <h3>Basic Information</h3>
                                    <div className="jp-form-grid">
                                        <div className="jp-form-group jp-span-2">
                                            <label>Job Title *</label>
                                            <input type="text" required value={form.jobTitle}
                                                onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
                                                placeholder="e.g. Senior Software Engineer" />
                                        </div>
                                        <div className="jp-form-group">
                                            <label>Location *</label>
                                            <input type="text" required value={form.location}
                                                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                                                placeholder="e.g. Bangalore / Remote" />
                                        </div>
                                        <div className="jp-form-group">
                                            <label>Employment Type</label>
                                            <select value={form.employmentType}
                                                onChange={e => setForm(p => ({ ...p, employmentType: e.target.value }))}>
                                                {Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="jp-form-group">
                                            <label>No. of Openings</label>
                                            <input type="number" min="1" value={form.numberOfOpenings}
                                                onChange={e => setForm(p => ({ ...p, numberOfOpenings: parseInt(e.target.value) || 1 }))} />
                                        </div>
                                        <div className="jp-form-group">
                                            <label>Closing Date</label>
                                            <input type="date" value={form.closingDate}
                                                onChange={e => setForm(p => ({ ...p, closingDate: e.target.value }))} />
                                        </div>
                                    </div>
                                </div>

                                <div className="jp-form-section">
                                    <h3>Experience & Salary</h3>
                                    <div className="jp-form-grid">
                                        <div className="jp-form-group">
                                            <label>Min Experience (years)</label>
                                            <input type="number" min="0" value={form.experienceMin}
                                                onChange={e => setForm(p => ({ ...p, experienceMin: parseInt(e.target.value) || 0 }))} />
                                        </div>
                                        <div className="jp-form-group">
                                            <label>Max Experience (years)</label>
                                            <input type="number" min="0" value={form.experienceMax}
                                                onChange={e => setForm(p => ({ ...p, experienceMax: parseInt(e.target.value) || 0 }))} />
                                        </div>
                                        <div className="jp-form-group">
                                            <label>Salary Min (₹)</label>
                                            <input type="number" min="0" value={form.salaryMin}
                                                onChange={e => setForm(p => ({ ...p, salaryMin: e.target.value }))}
                                                placeholder="e.g. 500000" />
                                        </div>
                                        <div className="jp-form-group">
                                            <label>Salary Max (₹)</label>
                                            <input type="number" min="0" value={form.salaryMax}
                                                onChange={e => setForm(p => ({ ...p, salaryMax: e.target.value }))}
                                                placeholder="e.g. 1200000" />
                                        </div>
                                    </div>
                                </div>

                                <div className="jp-form-section">
                                    <h3>Details</h3>
                                    <div className="jp-form-group">
                                        <label>Job Description *</label>
                                        <textarea required rows="5" value={form.jobDescription}
                                            onChange={e => setForm(p => ({ ...p, jobDescription: e.target.value }))}
                                            placeholder="Describe the role, responsibilities, and what success looks like..." />
                                    </div>
                                    <div className="jp-form-group">
                                        <label>Requirements *</label>
                                        <textarea required rows="4" value={form.requirements}
                                            onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))}
                                            placeholder="List the required skills, qualifications, and experience..." />
                                    </div>
                                </div>

                                {editingJob && (
                                    <div className="jp-form-section">
                                        <h3>Status</h3>
                                        <div className="jp-form-group">
                                            <label>Job Status</label>
                                            <select value={form.status}
                                                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                                                <option value="OPEN">Open</option>
                                                <option value="ON_HOLD">On Hold</option>
                                                <option value="CLOSED">Closed</option>
                                                <option value="FILLED">Filled</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="jp-form-actions">
                                    <button type="button" className="jp-btn jp-btn-secondary" onClick={() => setShowForm(false)}>
                                        <span style={{ marginRight: '8px' }}>←</span> Back
                                    </button>
                                    <button type="submit" className="jp-btn jp-btn-primary" disabled={formLoading}>
                                        {formLoading ? 'Saving...' : editingJob ? 'Update Posting' : 'Create Posting'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Applications Panel */}
            {applicationsPanel && selectedJob && (
                <div className="jp-modal-overlay" onClick={() => setApplicationsPanel(false)}>
                    <div className="jp-modal jp-modal-wide" onClick={e => e.stopPropagation()}>
                        <div className="jp-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button
                                    className="jp-close-btn"
                                    onClick={() => setApplicationsPanel(false)}
                                    title="Back to Job List"
                                    style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center' }}
                                >
                                    ←
                                </button>
                                <div>
                                    <h2>Applications — {selectedJob.jobTitle}</h2>
                                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                                        {selectedJob.location} · {EMPLOYMENT_TYPES[selectedJob.employmentType]}
                                    </p>
                                </div>
                            </div>
                            <button className="jp-close-btn" onClick={() => setApplicationsPanel(false)}>✕</button>
                        </div>
                        <div className="jp-modal-body">
                            {appsLoading ? (
                                <div className="jp-loading"><div className="jp-spinner" /><p>Loading applications...</p></div>
                            ) : applications.length === 0 ? (
                                <div className="jp-empty">
                                    <div className="jp-empty-icon">📋</div>
                                    <h3>No applications yet</h3>
                                    <p>Applications will appear here once candidates apply.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="jp-apps-summary">
                                        <strong>{applications.length}</strong> total application{applications.length !== 1 ? 's' : ''}
                                        {Object.entries(
                                            applications.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] || 0) + 1 }), {})
                                        ).map(([s, c]) => {
                                            const sc = APP_STATUS_COLORS[s] || {};
                                            return <span key={s} className="jp-mini-badge" style={{ background: sc.bg, color: sc.text }}>{c} {s}</span>;
                                        })}
                                    </div>

                                    <div className="jp-apps-list">
                                        {applications.map(app => {
                                            const asc = APP_STATUS_COLORS[app.status] || {};
                                            const skillsMatch = app.requiredSkillsMatch ? parseJSON(app.requiredSkillsMatch) : null;
                                            const additionalSkills = app.additionalSkillsFound ? parseJSON(app.additionalSkillsFound) : null;
                                            return (
                                                <div key={app.id} className={`jp-app-card ${selectedApp?.id === app.id ? 'expanded' : ''}`}>
                                                    <div className="jp-app-header"
                                                        onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}>
                                                        <div className="jp-app-avatar">
                                                            {app.candidateName?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="jp-app-info">
                                                            <h4>{app.candidateName}</h4>
                                                            <p>{app.candidateEmail}</p>
                                                            <div className="jp-app-tags">
                                                                {app.totalExperienceYears != null && (
                                                                    <span className="jp-app-tag">🎯 {app.totalExperienceYears} yrs exp</span>
                                                                )}
                                                                {app.appliedDate && (
                                                                    <span className="jp-app-tag">📅 {new Date(app.appliedDate).toLocaleDateString()}</span>
                                                                )}
                                                                {app.resumeQualityScore != null && (
                                                                    <span className="jp-app-tag" style={{
                                                                        background: app.resumeQualityScore >= 80 ? '#d1fae5' : app.resumeQualityScore >= 60 ? '#fef3c7' : '#fee2e2',
                                                                        color: app.resumeQualityScore >= 80 ? '#065f46' : app.resumeQualityScore >= 60 ? '#78350f' : '#7f1d1d',
                                                                    }}>
                                                                        📊 Score: {app.resumeQualityScore}/100
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="jp-app-right">
                                                            <span className="jp-mini-badge" style={{ background: asc.bg, color: asc.text }}>
                                                                {app.status?.replace('_', ' ')}
                                                            </span>
                                                            <span className="jp-expand-icon">{selectedApp?.id === app.id ? '▲' : '▼'}</span>
                                                        </div>
                                                    </div>

                                                    {selectedApp?.id === app.id && (
                                                        <div className="jp-app-detail">
                                                            {app.resumeQualityScore != null && (
                                                                <div className="jp-score-bar-wrapper">
                                                                    <div className="jp-score-header">
                                                                        <span>Resume Quality Score</span>
                                                                        <strong>{app.resumeQualityScore}/100</strong>
                                                                    </div>
                                                                    <div className="jp-score-track">
                                                                        <div className="jp-score-fill"
                                                                            style={{
                                                                                width: `${app.resumeQualityScore}%`,
                                                                                background: app.resumeQualityScore >= 80 ? '#10b981' : app.resumeQualityScore >= 60 ? '#f59e0b' : '#ef4444'
                                                                            }} />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {skillsMatch && (
                                                                <div className="jp-detail-section">
                                                                    <h5>Skills Match</h5>
                                                                    <div className="jp-skills-grid">
                                                                        {Object.entries(skillsMatch).map(([skill, matched]) => (
                                                                            <span key={skill} className={`jp-skill-chip ${matched ? 'matched' : 'missing'}`}>
                                                                                {matched ? '✓' : '✗'} {skill}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {additionalSkills && additionalSkills.length > 0 && (
                                                                <div className="jp-detail-section">
                                                                    <h5>Additional Skills</h5>
                                                                    <div className="jp-skills-grid">
                                                                        {additionalSkills.map((s, i) => (
                                                                            <span key={i} className="jp-skill-chip additional">{s}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {app.resumeSummary && (
                                                                <div className="jp-detail-section">
                                                                    <h5>Resume Summary</h5>
                                                                    <div className="jp-summary-box">{app.resumeSummary}</div>
                                                                </div>
                                                            )}

                                                            {app.coverLetter && (
                                                                <div className="jp-detail-section">
                                                                    <h5>Cover Letter</h5>
                                                                    <div className="jp-summary-box">{app.coverLetter}</div>
                                                                </div>
                                                            )}

                                                            <div className="jp-detail-section">
                                                                <h5>Documents</h5>
                                                                <div className="jp-doc-links">
                                                                    {app.resumeUrl ? (
                                                                        <a
                                                                            href={`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace('/api', '')}${app.resumeUrl}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="jp-btn jp-btn-secondary"
                                                                            style={{ width: 'fit-content' }}
                                                                        >
                                                                            📄 View / Download CV
                                                                        </a>
                                                                    ) : (
                                                                        <span className="jp-error-text">No CV attached</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {isHR && (
                                                                <div className="jp-app-actions">
                                                                    <h5>Update Status</h5>
                                                                    <div className="jp-status-actions">
                                                                        {['SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'ON_HOLD'].map(s => {
                                                                            if (s === app.status) return null;
                                                                            const c = APP_STATUS_COLORS[s] || {};
                                                                            return (
                                                                                <button key={s}
                                                                                    className="jp-status-btn"
                                                                                    style={{ background: c.bg, color: c.text, borderColor: c.text + '44' }}
                                                                                    onClick={() => updateAppStatus(app.id, s)}>
                                                                                    → {s.replace('_', ' ')}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobPostings;
