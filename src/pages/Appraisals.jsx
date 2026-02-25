import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { appraisalAPI, employeeAPI } from '../services/api';
import BackButton from '../components/BackButton';
import GoalsTab from './GoalsTab';
import './Appraisals.css';

const Appraisals = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('my-appraisals');
    const [loading, setLoading] = useState(false);

    // My Appraisals State
    const [myAppraisals, setMyAppraisals] = useState([]);
    const [selectedAppraisal, setSelectedAppraisal] = useState(null);

    // Pending Reviews State
    const [pendingReviews, setPendingReviews] = useState([]);
    const [selectedReview, setSelectedReview] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);

    // Cycles State (Admin/HR)
    const [cycles, setCycles] = useState([]);
    const [showCycleModal, setShowCycleModal] = useState(false);
    const [cycleForm, setCycleForm] = useState({
        cycleName: '',
        description: '',
        startDate: '',
        endDate: '',
        reviewPeriodStart: '',
        reviewPeriodEnd: '',
        cycleType: 'ANNUAL',
        enableSelfReview: true,
        enableManagerReview: true,
        enablePeerReview: true,
        enableSubordinateReview: false,
        minPeerReviewers: 2,
        maxPeerReviewers: 5
    });

    // Competencies State (Admin/HR)
    const [competencies, setCompetencies] = useState([]);
    const [showCompetencyModal, setShowCompetencyModal] = useState(false);
    const [competencyForm, setCompetencyForm] = useState({
        code: '',
        name: '',
        description: '',
        category: 'TECHNICAL',
        weightage: 10,
        isActive: true,
        displayOrder: 0
    });

    // Peer Selection State
    const [showPeerModal, setShowPeerModal] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedPeers, setSelectedPeers] = useState([]);
    const [currentAppraisalForPeers, setCurrentAppraisalForPeers] = useState(null);
    const [peerSearchQuery, setPeerSearchQuery] = useState('');
    const [peerDropdownOpen, setPeerDropdownOpen] = useState(false);

    // Rating / Band State (Manager / HR / Admin)
    const [cycleAppraisals, setCycleAppraisals] = useState([]);
    const [selectedCycleForRating, setSelectedCycleForRating] = useState('');
    const [ratingPreviewData, setRatingPreviewData] = useState(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [activeRatingAppraisalId, setActiveRatingAppraisalId] = useState(null);

    const isAdminOrHR = ['ADMIN', 'HR'].includes(user?.role);
    const isManagerOrAbove = ['ADMIN', 'HR', 'MANAGER'].includes(user?.role);

    useEffect(() => {
        if (activeTab === 'my-appraisals') {
            fetchMyAppraisals();
        } else if (activeTab === 'pending-reviews') {
            fetchPendingReviews();
        } else if (activeTab === 'cycles' && isAdminOrHR) {
            fetchCycles();
        } else if (activeTab === 'competencies' && isAdminOrHR) {
            fetchCompetencies();
        } else if (activeTab === 'rate-employees' && isManagerOrAbove) {
            fetchCycles();
        }
    }, [activeTab]);

    const fetchMyAppraisals = async () => {
        try {
            setLoading(true);
            const response = await appraisalAPI.getMyAppraisals();
            setMyAppraisals(response.data.appraisals || []);
        } catch (error) {
            toast.error('Failed to fetch appraisals');
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingReviews = async () => {
        try {
            setLoading(true);
            const response = await appraisalAPI.getMyPendingReviews();
            setPendingReviews(response.data.reviews || []);
        } catch (error) {
            toast.error('Failed to fetch pending reviews');
        } finally {
            setLoading(false);
        }
    };

    const fetchCycles = async () => {
        try {
            setLoading(true);
            const response = await appraisalAPI.getAllCycles();
            setCycles(response.data.cycles || []);
        } catch (error) {
            toast.error('Failed to fetch cycles');
        } finally {
            setLoading(false);
        }
    };

    const fetchCompetencies = async () => {
        try {
            setLoading(true);
            const response = await appraisalAPI.getAllCompetencies();
            setCompetencies(response.data.competencies || []);
        } catch (error) {
            toast.error('Failed to fetch competencies');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCycle = async (e) => {
        e.preventDefault();
        try {
            await appraisalAPI.createCycle(cycleForm);
            toast.success('Appraisal cycle created successfully');
            setShowCycleModal(false);
            resetCycleForm();
            fetchCycles();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create cycle');
        }
    };

    const handleActivateCycle = async (cycleId) => {
        if (!window.confirm('Activate this cycle? This will create appraisals for all active employees.')) {
            return;
        }
        try {
            setLoading(true);
            await appraisalAPI.activateCycle(cycleId);
            toast.success('Cycle activated successfully');
            fetchCycles();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to activate cycle');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCompetency = async (e) => {
        e.preventDefault();
        try {
            await appraisalAPI.createCompetency(competencyForm);
            toast.success('Competency created successfully');
            setShowCompetencyModal(false);
            resetCompetencyForm();
            fetchCompetencies();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create competency');
        }
    };

    const handleSelectPeers = async () => {
        if (selectedPeers.length < currentAppraisalForPeers.peerReviewsRequired) {
            toast.error(`Please select at least ${currentAppraisalForPeers.peerReviewsRequired} peer reviewers`);
            return;
        }
        try {
            await appraisalAPI.addPeerReviewers(currentAppraisalForPeers.id, selectedPeers);
            toast.success('Peer reviewers added successfully');
            setShowPeerModal(false);
            setSelectedPeers([]);
            fetchMyAppraisals();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to add peer reviewers');
        }
    };

    // ── Rating handlers ──────────────────────────────────────────────────────

    const fetchCycleAppraisals = async (cycleId) => {
        if (!cycleId) return;
        try {
            setLoading(true);
            const res = await appraisalAPI.getCycleAppraisals(cycleId);
            setCycleAppraisals(res.data.appraisals || []);
        } catch (error) {
            toast.error('Failed to fetch appraisals for cycle');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenRatingModal = async (appraisalId) => {
        try {
            const res = await appraisalAPI.ratingPreview(appraisalId);
            setRatingPreviewData(res.data.preview);
            setActiveRatingAppraisalId(appraisalId);
            setShowRatingModal(true);
        } catch (error) {
            toast.error('Failed to load rating preview');
        }
    };

    const handleFinalizeRating = async (appraisalId, overrideRating) => {
        try {
            const res = await appraisalAPI.finalizeRating(appraisalId, overrideRating);
            toast.success(`Rating finalized: ${res.data.result.performanceRating.replace(/_/g, ' ')}`);
            setShowRatingModal(false);
            fetchCycleAppraisals(selectedCycleForRating);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to finalize rating');
        }
    };

    const handleAcknowledgeRating = async (appraisalId, agreed, comments) => {
        try {
            await appraisalAPI.acknowledgeAppraisal(appraisalId, agreed, comments);
            toast.success(agreed ? 'Rating accepted!' : 'Disagreement submitted for HR/Manager review.');
            fetchMyAppraisals();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit acknowledgement');
        }
    };

    const handleStartReview = async (reviewId) => {
        try {
            const response = await appraisalAPI.getReviewDetails(reviewId);
            setSelectedReview(response.data.data);
            setShowReviewModal(true);
        } catch (error) {
            toast.error('Failed to load review details');
        }
    };

    const resetCycleForm = () => {
        setCycleForm({
            cycleName: '',
            description: '',
            startDate: '',
            endDate: '',
            reviewPeriodStart: '',
            reviewPeriodEnd: '',
            cycleType: 'ANNUAL',
            enableSelfReview: true,
            enableManagerReview: true,
            enablePeerReview: true,
            enableSubordinateReview: false,
            minPeerReviewers: 2,
            maxPeerReviewers: 5
        });
    };

    const resetCompetencyForm = () => {
        setCompetencyForm({
            code: '',
            name: '',
            description: '',
            category: 'TECHNICAL',
            weightage: 10,
            isActive: true,
            displayOrder: 0
        });
    };

    const getBandIcon = (band) => {
        const icons = {
            OUTSTANDING: '🌟',
            EXCEEDS: '🟢',
            MEETS: '🔵',
            NEEDS_IMPROVEMENT: '🟡',
            UNSATISFACTORY: '🔴',
        };
        return icons[band] || '⚪';
    };

    // Handles both ISO string ("2026-01-15") and Java LocalDate array ([2026, 1, 15])
    const fmtCycleDate = (raw) => {
        if (!raw) return '—';
        let d;
        if (Array.isArray(raw)) {
            // Java LocalDate serialised as [year, month, day]
            d = new Date(raw[0], raw[1] - 1, raw[2]);
        } else {
            d = new Date(raw);
        }
        if (isNaN(d.getTime())) return String(raw);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const CYCLE_TYPE_CFG = {
        ANNUAL: { label: 'Annual', icon: '📅', color: '#2563eb', bg: '#dbeafe' },
        SEMI_ANNUAL: { label: 'Half-Yearly', icon: '📆', color: '#7c3aed', bg: '#ede9fe' },
        QUARTERLY: { label: 'Quarterly', icon: '🗓️', color: '#059669', bg: '#d1fae5' },
        PROBATION: { label: 'Probation', icon: '🔎', color: '#d97706', bg: '#fef3c7' },
        PIP: { label: 'PIP', icon: '📈', color: '#dc2626', bg: '#fee2e2' },
        PROJECT_END: { label: 'Project End', icon: '🏁', color: '#6b7280', bg: '#f3f4f6' },
    };

    const getStatusBadgeClass = (status) => {
        const statusMap = {
            'NOT_STARTED': 'status-not-started',
            'IN_PROGRESS': 'status-in-progress',
            'PENDING_MANAGER': 'status-pending',
            'COMPLETED': 'status-completed',
            'APPROVED': 'status-approved',
            'CANCELLED': 'status-cancelled'
        };
        return statusMap[status] || 'status-default';
    };

    const getRatingStars = (rating) => {
        if (!rating) return 'N/A';
        const stars = '⭐'.repeat(Math.round(rating));
        return `${stars} (${rating.toFixed(1)})`;
    };

    return (
        <div className="appraisals-page">
            <BackButton to="/dashboard" label="Back to Dashboard" />
            <h1>🎯 Performance Appraisals</h1>

            <div className="tabs">
                <button
                    className={activeTab === 'my-appraisals' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('my-appraisals')}
                >
                    My Appraisals
                </button>
                <button
                    className={activeTab === 'pending-reviews' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('pending-reviews')}
                >
                    Pending Reviews
                    {pendingReviews.length > 0 && (
                        <span className="badge">{pendingReviews.length}</span>
                    )}
                </button>
                <button
                    className={activeTab === 'goals' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('goals')}
                >
                    🎯 Goals & Targets
                </button>
                {isManagerOrAbove && (
                    <button
                        className={activeTab === 'rate-employees' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('rate-employees')}
                    >
                        🏅 Rate Employees
                    </button>
                )}
                {isAdminOrHR && (
                    <>
                        <button
                            className={activeTab === 'cycles' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('cycles')}
                        >
                            Appraisal Cycles

                        </button>
                        <button
                            className={activeTab === 'competencies' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('competencies')}
                        >
                            Competencies
                        </button>
                    </>
                )}
            </div>

            {/* My Appraisals Tab */}
            {activeTab === 'my-appraisals' && (
                <div className="appraisals-section">
                    <div className="section-header">
                        <div>
                            <h2>My Performance Appraisals</h2>
                            <p>Your appraisal history across all cycles</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading">⏳ Loading appraisals...</div>
                    ) : myAppraisals.length === 0 ? (
                        <div className="appraisal-empty-state">
                            <div className="appraisal-empty-icon">📋</div>
                            <h3>No appraisals yet</h3>
                            <p>Your manager or HR will create an appraisal cycle and assign you once it's activated.</p>
                        </div>
                    ) : (
                        <div className="appraisals-grid">
                            {myAppraisals.map((appraisal) => {
                                const cycleType = appraisal.cycleType;
                                const tcfg = CYCLE_TYPE_CFG[cycleType] || null;
                                const completionPct = (() => {
                                    let done = 0, total = 0;
                                    if (appraisal.selfReviewCompleted != null) { total++; if (appraisal.selfReviewCompleted) done++; }
                                    if (appraisal.managerReviewCompleted != null) { total++; if (appraisal.managerReviewCompleted) done++; }
                                    if ((appraisal.peerReviewsRequired || 0) > 0) {
                                        total += appraisal.peerReviewsRequired;
                                        done += Math.min(appraisal.peerReviewsCompleted || 0, appraisal.peerReviewsRequired);
                                    }
                                    return total > 0 ? Math.round((done / total) * 100) : 0;
                                })();

                                return (
                                    <div key={appraisal.id} className={`appraisal-card appraisal-status-${(appraisal.status || '').toLowerCase().replace(/_/g, '-')}`}>
                                        {/* Card Header */}
                                        <div className="card-header">
                                            <div className="appraisal-card-header-content">
                                                <h3>{appraisal.cycleName || 'Appraisal'}</h3>
                                                {tcfg && (
                                                    <span className="appraisal-cycle-type-chip" style={{ color: tcfg.color, background: tcfg.bg }}>
                                                        {tcfg.icon} {tcfg.label}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`status-badge ${getStatusBadgeClass(appraisal.status)}`}
                                                style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                                                {(appraisal.status || '').replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        {/* Card Body */}
                                        <div className="card-body">
                                            {/* Overall completion bar */}
                                            <div className="appraisal-completion">
                                                <div className="appraisal-completion-header">
                                                    <span>Overall Progress</span>
                                                    <span className="appraisal-completion-pct">{completionPct}%</span>
                                                </div>
                                                <div className="appraisal-progress-track">
                                                    <div className="appraisal-progress-fill"
                                                        style={{
                                                            width: `${completionPct}%`,
                                                            background: completionPct === 100 ? '#27ae60' : completionPct >= 50 ? '#3498db' : '#e67e22'
                                                        }} />
                                                </div>
                                            </div>

                                            {/* Review checklist */}
                                            <div className="review-progress">
                                                <h4>Review Checklist</h4>
                                                <div className="progress-item">
                                                    <span>Self Review</span>
                                                    <span className={appraisal.selfReviewCompleted ? 'completed' : 'pending'}>
                                                        {appraisal.selfReviewCompleted ? '✓ Done' : '⏳ Pending'}
                                                    </span>
                                                </div>
                                                <div className="progress-item">
                                                    <span>Manager Review</span>
                                                    <span className={appraisal.managerReviewCompleted ? 'completed' : 'pending'}>
                                                        {appraisal.managerReviewCompleted ? '✓ Done' : '⏳ Pending'}
                                                    </span>
                                                </div>
                                                {(appraisal.peerReviewsRequired || 0) > 0 && (
                                                    <div className="progress-item">
                                                        <span>Peer Reviews</span>
                                                        <span className={(appraisal.peerReviewsCompleted || 0) >= appraisal.peerReviewsRequired ? 'completed' : 'pending'}>
                                                            {appraisal.peerReviewsCompleted || 0} / {appraisal.peerReviewsRequired} {appraisal.peerReviewsRequired > 0 && (appraisal.peerReviewsCompleted || 0) === 0 ? '(Nominated)' : ''}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Manager info */}
                                            {appraisal.managerName && (
                                                <div className="appraisal-manager-row">
                                                    <span>👔 Manager:</span>
                                                    <strong>{appraisal.managerName}</strong>
                                                </div>
                                            )}

                                            {/* Performance band */}
                                            {appraisal.performanceRating && (
                                                <div className={`appraisal-band band-${appraisal.performanceRating.toLowerCase()}`}>
                                                    {getBandIcon(appraisal.performanceRating)}
                                                    &nbsp;{appraisal.performanceRating.replace(/_/g, ' ')}
                                                </div>
                                            )}

                                            {/* Agreement Action */}
                                            {appraisal.performanceRating && (
                                                <div className="appraisal-agreement-section" style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <h5 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#334155' }}>Final Rating Acknowledgement</h5>

                                                    {appraisal.employeeAgreed === null ? (
                                                        <div className="agreement-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => handleAcknowledgeRating(appraisal.id, true, '')}
                                                                style={{ background: '#16a34a', borderColor: '#16a34a' }}
                                                            >
                                                                ✅ Accept Rating
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => {
                                                                    const reason = window.prompt("Please state your reason for disagreeing. This will be visible to your Manager and HR:");
                                                                    if (reason !== null && reason.trim() !== '') {
                                                                        handleAcknowledgeRating(appraisal.id, false, reason);
                                                                    } else if (reason !== null) {
                                                                        toast.error("A reason is required to disagree.");
                                                                    }
                                                                }}
                                                                style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}
                                                            >
                                                                ❌ Disagree & Request Review
                                                            </button>
                                                        </div>
                                                    ) : appraisal.employeeAgreed === true ? (
                                                        <div style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                            ✅ You have accepted this final rating.
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>
                                                                ❌ You disagreed with this rating. It is currently pending HR/Manager review.
                                                            </div>
                                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                                                                <strong>Your comments: </strong>{appraisal.employeeDisagreeComments}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Overall rating stars */}
                                            {appraisal.overallRating && (
                                                <div className="overall-rating">
                                                    <h4>Overall Rating</h4>
                                                    <div className="rating-display">
                                                        {getRatingStars(appraisal.overallRating)}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Peer reviewer selection */}
                                            {(appraisal.peerReviewsRequired || 0) > 0 && (appraisal.peerReviewsCompleted || 0) === 0 && (
                                                <button
                                                    className="btn btn-secondary appraisal-peer-btn"
                                                    onClick={() => {
                                                        setCurrentAppraisalForPeers(appraisal);
                                                        setSelectedPeers([]); // Reset for new selection
                                                        setPeerSearchQuery('');
                                                        setShowPeerModal(true);
                                                        employeeAPI.getAll()
                                                            .then(res => setEmployees(res.data))
                                                            .catch(err => toast.error('Failed to load colleague list'));
                                                    }}
                                                >
                                                    👥 {appraisal.peerReviewsRequired > 0 ? 'Manage Peer Reviewers' : 'Select Peer Reviewers'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Pending Reviews Tab */}
            {activeTab === 'pending-reviews' && (
                <div className="reviews-section">
                    <div className="section-header">
                        <h2>Pending Reviews</h2>
                        <p>Complete reviews for your colleagues</p>
                    </div>

                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : pendingReviews.length === 0 ? (
                        <div className="no-data">No pending reviews</div>
                    ) : (
                        <div className="reviews-list">
                            {pendingReviews.map((review) => (
                                <div key={review.reviewId} className="review-card">
                                    <div className="review-info">
                                        <h3>{review.employeeName}</h3>
                                        <p className="cycle-name">{review.cycleName}</p>
                                        <span className="review-type-badge">
                                            {review.reviewerType.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleStartReview(review.reviewId)}
                                    >
                                        Start Review
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Goals & Targets Tab */}
            {activeTab === 'goals' && <GoalsTab />}

            {/* Rate Employees Tab (Manager / HR / Admin) */}
            {activeTab === 'rate-employees' && isManagerOrAbove && (
                <div className="rating-section">
                    <div className="section-header">
                        <h2>🏅 Rate Employees</h2>
                        <p>Finalize performance bands using the 60 % goal achievement + 40 % competency review formula.</p>
                    </div>

                    {/* Cycle selector */}
                    <div className="cycle-selector-row">
                        <label><strong>Select Appraisal Cycle:</strong></label>
                        <select
                            value={selectedCycleForRating}
                            onChange={(e) => {
                                setSelectedCycleForRating(e.target.value);
                                fetchCycleAppraisals(e.target.value);
                            }}
                        >
                            <option value="">-- Choose a cycle --</option>
                            {cycles.map(c => (
                                <option key={c.id} value={c.id}>{c.cycleName} ({c.status})</option>
                            ))}
                        </select>
                    </div>

                    {/* Appraisal list */}
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : selectedCycleForRating && cycleAppraisals.length === 0 ? (
                        <div className="no-data">No appraisals found for this cycle.</div>
                    ) : (
                        <div className="rating-appraisals-grid">
                            {cycleAppraisals.map(ap => (
                                <div key={ap.id} className="rating-appraisal-card">
                                    <div className="rating-card-header">
                                        <div>
                                            <h3>{ap.employeeName}</h3>
                                            <p className="emp-meta">{ap.designation} &bull; {ap.department}</p>
                                        </div>
                                        <span className={`status-badge ${getStatusBadgeClass(ap.status)}`}>
                                            {ap.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                    <div className="rating-card-body">
                                        <div className="mini-progress-row">
                                            <span>Self Review</span>
                                            <span className={ap.selfReviewCompleted ? 'check-done' : 'check-pend'}>
                                                {ap.selfReviewCompleted ? '✔' : '○'}
                                            </span>
                                        </div>
                                        <div className="mini-progress-row">
                                            <span>Manager Review</span>
                                            <span className={ap.managerReviewCompleted ? 'check-done' : 'check-pend'}>
                                                {ap.managerReviewCompleted ? '✔' : '○'}
                                            </span>
                                        </div>
                                        <div className="mini-progress-row">
                                            <span>Overall Rating</span>
                                            <span>{ap.overallRating ? `${ap.overallRating.toFixed(1)} / 5` : '—'}</span>
                                        </div>
                                        {ap.performanceRating && (
                                            <div className={`band-badge band-${ap.performanceRating.toLowerCase()}`}>
                                                {getBandIcon(ap.performanceRating)} {ap.performanceRating.replace(/_/g, ' ')}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rating-card-footer">
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleOpenRatingModal(ap.id)}
                                        >
                                            {ap.performanceRating ? '✏️ Revise Rating' : '🏅 Calculate & Rate'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Cycles Tab (Admin/HR) */}
            {activeTab === 'cycles' && isAdminOrHR && (
                <div className="cycles-section">
                    <div className="section-header">
                        <h2>Appraisal Cycles</h2>
                        <button className="btn btn-primary" onClick={() => setShowCycleModal(true)}>
                            ➕ Create Cycle
                        </button>
                    </div>

                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : (
                        <div className="cycles-grid">
                            {cycles.map((cycle) => {
                                const tcfg = CYCLE_TYPE_CFG[cycle.cycleType] || CYCLE_TYPE_CFG.ANNUAL;
                                return (
                                    <div key={cycle.id} className="cycle-card">
                                        <div className="cycle-card-header">
                                            <div className="cycle-card-title-row">
                                                <h3>{cycle.cycleName}</h3>
                                                <div className="cycle-card-badges">
                                                    <span
                                                        className="cycle-type-badge"
                                                        style={{ color: tcfg.color, background: tcfg.bg }}
                                                    >
                                                        {tcfg.icon} {tcfg.label}
                                                    </span>
                                                    <span className={`status-badge status-${cycle.status.toLowerCase()}`}>
                                                        {cycle.status}
                                                    </span>
                                                </div>
                                            </div>
                                            {cycle.description && (
                                                <p className="cycle-description">{cycle.description}</p>
                                            )}
                                        </div>
                                        <div className="cycle-card-body">
                                            <div className="cycle-dates">
                                                <div className="cycle-date-block">
                                                    <span className="cycle-date-label">📋 Review Period</span>
                                                    <span className="cycle-date-value">
                                                        {fmtCycleDate(cycle.reviewPeriodStart)}
                                                        <span className="date-sep"> → </span>
                                                        {fmtCycleDate(cycle.reviewPeriodEnd)}
                                                    </span>
                                                </div>
                                                <div className="cycle-date-block">
                                                    <span className="cycle-date-label">🗂️ Cycle Window</span>
                                                    <span className="cycle-date-value">
                                                        {fmtCycleDate(cycle.startDate)}
                                                        <span className="date-sep"> → </span>
                                                        {fmtCycleDate(cycle.endDate)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="cycle-settings-row">
                                                {cycle.enableSelfReview && <span className="cycle-setting-chip">✅ Self</span>}
                                                {cycle.enableManagerReview && <span className="cycle-setting-chip">👔 Manager</span>}
                                                {cycle.enablePeerReview && <span className="cycle-setting-chip">👥 Peer ({cycle.minPeerReviewers}–{cycle.maxPeerReviewers})</span>}
                                                {cycle.enableSubordinateReview && <span className="cycle-setting-chip">⬇ Subordinate</span>}
                                            </div>
                                            {cycle.status === 'DRAFT' && (
                                                <button
                                                    className="btn btn-success cycle-activate-btn"
                                                    onClick={() => handleActivateCycle(cycle.id)}
                                                >
                                                    🚀 Activate Cycle
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Competencies Tab (Admin/HR) */}
            {activeTab === 'competencies' && isAdminOrHR && (
                <div className="competencies-section">
                    <div className="section-header">
                        <h2>Competencies</h2>
                        <button className="btn btn-primary" onClick={() => setShowCompetencyModal(true)}>
                            ➕ Add Competency
                        </button>
                    </div>

                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : (
                        <div className="competencies-grid">
                            {competencies.map((comp) => (
                                <div key={comp.id} className={`competency-card ${comp.category.toLowerCase()}`}>
                                    <h3>{comp.name}</h3>
                                    <p className="code">Code: {comp.code}</p>
                                    <p className="category">{comp.category}</p>
                                    <p className="description">{comp.description}</p>
                                    <div className="competency-meta">
                                        <span>Weight: {comp.weightage}%</span>
                                        <span className={comp.isActive ? 'active' : 'inactive'}>
                                            {comp.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create Cycle Modal */}
            {showCycleModal && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h2>Create Appraisal Cycle</h2>
                            <button className="close-btn" onClick={() => setShowCycleModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateCycle}>
                            <div className="form-group">
                                <label>Cycle Name *</label>
                                <input
                                    type="text"
                                    value={cycleForm.cycleName}
                                    onChange={(e) => setCycleForm({ ...cycleForm, cycleName: e.target.value })}
                                    required
                                    placeholder="e.g., Annual Performance Review 2026"
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={cycleForm.description}
                                    onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })}
                                    rows="3"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Review Period Start *</label>
                                    <input
                                        type="date"
                                        value={cycleForm.reviewPeriodStart}
                                        onChange={(e) => setCycleForm({ ...cycleForm, reviewPeriodStart: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Review Period End *</label>
                                    <input
                                        type="date"
                                        value={cycleForm.reviewPeriodEnd}
                                        onChange={(e) => setCycleForm({ ...cycleForm, reviewPeriodEnd: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cycle Start Date *</label>
                                    <input
                                        type="date"
                                        value={cycleForm.startDate}
                                        onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Cycle End Date *</label>
                                    <input
                                        type="date"
                                        value={cycleForm.endDate}
                                        onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Cycle Type</label>
                                <select
                                    value={cycleForm.cycleType}
                                    onChange={(e) => setCycleForm({ ...cycleForm, cycleType: e.target.value })}
                                >
                                    <option value="ANNUAL">📅 Annual</option>
                                    <option value="SEMI_ANNUAL">📆 Semi-Annual (Half-Yearly)</option>
                                    <option value="QUARTERLY">🗓️ Quarterly</option>
                                    <option value="PROBATION">🔎 Probation Review</option>
                                    <option value="PIP">📈 PIP (Performance Improvement Plan)</option>
                                    <option value="PROJECT_END">🏁 Project End</option>
                                </select>
                            </div>

                            <div className="checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={cycleForm.enableSelfReview}
                                        onChange={(e) => setCycleForm({ ...cycleForm, enableSelfReview: e.target.checked })}
                                    />
                                    Enable Self Review
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={cycleForm.enableManagerReview}
                                        onChange={(e) => setCycleForm({ ...cycleForm, enableManagerReview: e.target.checked })}
                                    />
                                    Enable Manager Review
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={cycleForm.enablePeerReview}
                                        onChange={(e) => setCycleForm({ ...cycleForm, enablePeerReview: e.target.checked })}
                                    />
                                    Enable Peer Review
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={cycleForm.enableSubordinateReview}
                                        onChange={(e) => setCycleForm({ ...cycleForm, enableSubordinateReview: e.target.checked })}
                                    />
                                    Enable Subordinate Review
                                </label>
                            </div>

                            {cycleForm.enablePeerReview && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Min Peer Reviewers</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={cycleForm.minPeerReviewers}
                                            onChange={(e) => setCycleForm({ ...cycleForm, minPeerReviewers: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Max Peer Reviewers</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={cycleForm.maxPeerReviewers}
                                            onChange={(e) => setCycleForm({ ...cycleForm, maxPeerReviewers: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCycleModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Cycle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Competency Modal */}
            {showCompetencyModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Add Competency</h2>
                            <button className="close-btn" onClick={() => setShowCompetencyModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateCompetency}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Code *</label>
                                    <input
                                        type="text"
                                        value={competencyForm.code}
                                        onChange={(e) => setCompetencyForm({ ...competencyForm, code: e.target.value.toUpperCase() })}
                                        required
                                        placeholder="e.g., COMM, LEAD"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input
                                        type="text"
                                        value={competencyForm.name}
                                        onChange={(e) => setCompetencyForm({ ...competencyForm, name: e.target.value })}
                                        required
                                        placeholder="e.g., Communication"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={competencyForm.description}
                                    onChange={(e) => setCompetencyForm({ ...competencyForm, description: e.target.value })}
                                    rows="3"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Category *</label>
                                    <select
                                        value={competencyForm.category}
                                        onChange={(e) => setCompetencyForm({ ...competencyForm, category: e.target.value })}
                                    >
                                        <option value="TECHNICAL">Technical</option>
                                        <option value="BEHAVIORAL">Behavioral</option>
                                        <option value="LEADERSHIP">Leadership</option>
                                        <option value="CORE_VALUES">Core Values</option>
                                        <option value="FUNCTIONAL">Functional</option>
                                        <option value="MANAGERIAL">Managerial</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Weightage (%)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={competencyForm.weightage}
                                        onChange={(e) => setCompetencyForm({ ...competencyForm, weightage: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCompetencyModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Competency
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Peer Selection Modal */}
            {showPeerModal && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h2>Select Peer Reviewers</h2>
                            <button className="close-btn" onClick={() => setShowPeerModal(false)}>×</button>
                        </div>
                        <p>Select {currentAppraisalForPeers?.peerReviewsRequired || 2} to 5 colleagues to review your performance</p>

                        <div className="peer-multi-select-container">
                            <label className="field-label">Search and Select Peer Reviewers</label>

                            {/* Selected Chips */}
                            <div className="peers-selected-chips">
                                {selectedPeers.map(peerId => {
                                    const emp = employees.find(e => e.id === peerId);
                                    if (!emp) return null;
                                    return (
                                        <div key={peerId} className="peer-chip">
                                            <span>{emp.firstName} {emp.lastName}</span>
                                            <button
                                                className="remove-chip"
                                                onClick={() => setSelectedPeers(selectedPeers.filter(id => id !== peerId))}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })}
                                {selectedPeers.length === 0 && <span className="placeholder-text">No peers selected yet...</span>}
                            </div>

                            {/* Dropdown Input */}
                            <div className="peer-dropdown-wrapper">
                                <input
                                    type="text"
                                    placeholder="Type to search colleagues..."
                                    value={peerSearchQuery}
                                    onFocus={() => setPeerDropdownOpen(true)}
                                    onChange={(e) => {
                                        setPeerSearchQuery(e.target.value);
                                        setPeerDropdownOpen(true);
                                    }}
                                    className="peer-dropdown-input"
                                />

                                {peerDropdownOpen && (
                                    <div className="peer-dropdown-list">
                                        {(() => {
                                            const filtered = Array.isArray(employees) ? employees.filter(emp =>
                                                (emp.status?.toString().toUpperCase() === 'ACTIVE' || !emp.status) &&
                                                emp.email?.toLowerCase() !== user?.email?.toLowerCase() &&
                                                !selectedPeers.includes(emp.id) &&
                                                (
                                                    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(peerSearchQuery.toLowerCase()) ||
                                                    (emp.designation || '').toLowerCase().includes(peerSearchQuery.toLowerCase())
                                                )
                                            ) : [];

                                            if (filtered.length === 0) {
                                                return <div className="no-results">No matching active colleagues found</div>;
                                            }

                                            return filtered.map(emp => (
                                                <div
                                                    key={emp.id}
                                                    className="peer-dropdown-item"
                                                    onClick={() => {
                                                        setSelectedPeers([...selectedPeers, emp.id]);
                                                        setPeerSearchQuery('');
                                                        // Keep open if more can be selected
                                                    }}
                                                >
                                                    <div className="p-item-info">
                                                        <span className="p-name">{emp.firstName} {emp.lastName}</span>
                                                        <span className="p-meta">{emp.designation} &bull; {emp.department?.name || 'No Dept'}</span>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Overlay to close dropdown */}
                            {peerDropdownOpen && <div className="dropdown-backdrop" onClick={() => setPeerDropdownOpen(false)} />}
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowPeerModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSelectPeers}>
                                Confirm Selection ({selectedPeers.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Modal */}
            {showRatingModal && ratingPreviewData && (
                <RatingModal
                    preview={ratingPreviewData}
                    appraisalId={activeRatingAppraisalId}
                    onClose={() => setShowRatingModal(false)}
                    onFinalize={handleFinalizeRating}
                    getBandIcon={getBandIcon}
                    toast={toast}
                />
            )}

            {/* Review Submission Modal */}
            {showReviewModal && selectedReview && (
                <ReviewSubmissionModal
                    review={selectedReview}
                    onClose={() => {
                        setShowReviewModal(false);
                        setSelectedReview(null);
                        fetchPendingReviews();
                    }}
                    toast={toast}
                />
            )}
        </div>
    );
};

// Review Submission Modal Component
// `review` prop shape: { review, competencies, employee, existingRatings }
const ReviewSubmissionModal = ({ review, onClose, toast }) => {
    // Pre-fill any existing ratings
    const initRatings = () => {
        const map = {};
        (review.existingRatings || []).forEach(r => { map[r.competency?.id] = r.rating; });
        return map;
    };
    const initComments = () => {
        const map = {};
        (review.existingRatings || []).forEach(r => { if (r.comments) map[r.competency?.id] = r.comments; });
        return map;
    };

    const [ratings, setRatings] = useState(initRatings);
    const [comments, setComments] = useState(initComments);
    const [overallComments, setOverallComments] = useState(review.review?.overallComments || '');
    const [strengths, setStrengths] = useState(review.review?.strengths || '');
    const [areasOfImprovement, setAreasOfImprovement] = useState(review.review?.areasOfImprovement || '');
    const [submitting, setSubmitting] = useState(false);

    // Correct data path: review.competencies (not review.data.competencies)
    const competencies = review.competencies || [];
    const employee = review.employee || {};
    const reviewObj = review.review || {};
    const goals = review.goals || [];
    const otherReviews = review.otherReviews || [];
    const isSubmitted = reviewObj.status === 'SUBMITTED';

    const handleSubmit = async (e, isDraft = false) => {
        if (e) e.preventDefault();

        // Validate all competencies rated (skip if none defined, or if saving draft)
        if (!isDraft && competencies.length > 0) {
            const allRated = competencies.every(comp => ratings[comp.id]);
            if (!allRated) {
                toast.error('Please rate all competencies before submitting');
                return;
            }
            if (!window.confirm("Are you sure you want to submit? This action finalizes the review.")) {
                return;
            }
        }

        try {
            setSubmitting(true);
            await appraisalAPI.submitReview(reviewObj.id, {
                overallComments,
                strengths,
                areasOfImprovement,
                competencyRatings: ratings,
                competencyComments: comments,
                isDraft
            });
            toast.success(isDraft ? 'Draft saved successfully!' : 'Review submitted successfully!');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to ${isDraft ? 'save draft' : 'submit review'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleExport = () => {
        let csv = `Performance Review for ${employee.firstName} ${employee.lastName}\n\n`;
        csv += `Reviewer Type,${reviewObj.reviewerType}\n`;
        csv += `Status,${reviewObj.status}\n\n`;

        if (goals.length > 0) {
            csv += `--- GOALS ---\n`;
            csv += `Goal,Weightage,Progress,Status\n`;
            goals.forEach(g => {
                csv += `"${g.title.replace(/"/g, '""')}","${g.weightage}%","${g.progressPct}%","${g.status}"\n`;
            });
            csv += `\n`;
        }

        csv += `--- COMPETENCIES ---\n`;
        csv += `Category,Competency,Rating,Comments\n`;
        competencies.forEach(c => {
            const r = ratings[c.id] || 'Not Rated';
            const cm = (comments[c.id] || '').replace(/"/g, '""');
            csv += `"${c.category}","${c.name}","${r}","${cm}"\n`;
        });
        csv += `\n`;

        csv += `--- OVERALL FEEDBACK ---\n`;
        csv += `"Strengths","${strengths.replace(/"/g, '""')}"\n`;
        csv += `"Areas of Improvement","${areasOfImprovement.replace(/"/g, '""')}"\n`;
        csv += `"Overall Comments","${overallComments.replace(/"/g, '""')}"\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `review_${employee.id}_${reviewObj.id}.csv`;
        link.click();
    };

    const ratedCount = competencies.filter(c => ratings[c.id]).length;

    return (
        <div className="modal-overlay">
            <div className="modal-content extra-large">
                <div className="modal-header">
                    <div>
                        <h2>📝 Performance Review</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#666' }}>
                            Reviewing: <strong>{employee.firstName} {employee.lastName}</strong>
                            {employee.designation && ` • ${employee.designation}`}
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {/* Review type badge */}
                {reviewObj.reviewerType && (
                    <div style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span className="review-type-badge">{(reviewObj.reviewerType || '').replace(/_/g, ' ')}</span>
                            {isSubmitted && <span className="status-badge status-completed" style={{ marginLeft: '10px' }}>SUBMITTED</span>}
                        </div>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport}>
                            📊 Export to Excel
                        </button>
                    </div>
                )}

                <form onSubmit={(e) => handleSubmit(e, false)}>
                    <div className="review-form">
                        {/* Employee Goals Section */}
                        {goals.length > 0 && (
                            <div className="review-goals-breakdown">
                                <h3>Linked Goals Details</h3>
                                <div className="goal-breakdown-section">
                                    <table className="goal-breakdown-table">
                                        <thead>
                                            <tr>
                                                <th>Goal</th>
                                                <th>Weight</th>
                                                <th>Progress</th>
                                                <th>Status</th>
                                                <th>Manager Comments</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {goals.map(g => (
                                                <tr key={g.id}>
                                                    <td>{g.title}</td>
                                                    <td className="center">{g.weightage}%</td>
                                                    <td>
                                                        <div className="mini-bar-track">
                                                            <div
                                                                className="mini-bar-fill"
                                                                style={{
                                                                    width: `${g.progressPct}%`,
                                                                    background: g.progressPct >= 75 ? '#16a34a' : g.progressPct >= 50 ? '#d97706' : '#dc2626'
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="pct-label">{g.progressPct}%</span>
                                                    </td>
                                                    <td>
                                                        <span className={`goal-status-chip gs-${g.status.toLowerCase()}`}>
                                                            {g.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td>{g.managerComments || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Completed Peer/Self Reviews */}
                        {otherReviews.length > 0 && (
                            <div className="review-comments-breakdown" style={{ marginTop: '0', marginBottom: '24px' }}>
                                <h3>Team Member & Peer Feedback</h3>
                                <div className="feedback-list">
                                    {otherReviews.map((rev, idx) => (
                                        <div key={idx} className="feedback-card">
                                            <div className="feedback-card-header">
                                                <span className="reviewer-name">{rev.reviewerName}</span>
                                                <span className="reviewer-type">{rev.reviewerType.replace(/_/g, ' ')}</span>
                                                <div className="feedback-rating">Rating: {rev.overallRating ? rev.overallRating.toFixed(1) : '—'}⭐</div>
                                            </div>
                                            <div className="feedback-content">
                                                <div className="fb-section">
                                                    <strong>Strengths:</strong>
                                                    <p>{rev.strengths}</p>
                                                </div>
                                                <div className="fb-section">
                                                    <strong>Areas for Improvement:</strong>
                                                    <p>{rev.areasOfImprovement}</p>
                                                </div>
                                                <div className="fb-section">
                                                    <strong>Overall Comments:</strong>
                                                    <p>{rev.overallComments}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Competencies section */}
                        {competencies.length === 0 ? (
                            <div className="no-competencies-notice">
                                <p>⚠️ No competencies are configured yet. Please contact HR/Admin to set up competencies.</p>
                                <p style={{ fontSize: '0.85rem', color: '#888', marginTop: 6 }}>
                                    You can still submit overall feedback below.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="review-section-header">
                                    <h3>Rate Competencies</h3>
                                    <span className="review-progress-chip">
                                        {ratedCount}/{competencies.length} rated
                                    </span>
                                </div>
                                <div className="competencies-rating">
                                    {competencies.map((competency) => (
                                        <div key={competency.id} className="competency-rating-item">
                                            <div className="competency-header">
                                                <h4>{competency.name}</h4>
                                                <span className={`category-badge cat-${(competency.category || '').toLowerCase()}`}>
                                                    {(competency.category || '').replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            {competency.description && (
                                                <p className="description">{competency.description}</p>
                                            )}

                                            <div className="rating-input">
                                                <label>Rating (1–5) *</label>
                                                <div className="star-rating">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            className={`star ${(ratings[competency.id] || 0) >= star ? 'selected' : ''} ${isSubmitted ? 'disabled' : ''}`}
                                                            onClick={() => !isSubmitted && setRatings({ ...ratings, [competency.id]: star })}
                                                            title={['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][star]}
                                                            disabled={isSubmitted}
                                                        >
                                                            ⭐
                                                        </button>
                                                    ))}
                                                    <span className="rating-value">
                                                        {ratings[competency.id]
                                                            ? ['', 'Poor', 'Below Avg', 'Average', 'Good', 'Excellent'][ratings[competency.id]]
                                                            : 'Not rated'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Comments (optional)</label>
                                                <textarea
                                                    value={comments[competency.id] || ''}
                                                    onChange={(e) => setComments({ ...comments, [competency.id]: e.target.value })}
                                                    rows="2"
                                                    disabled={isSubmitted}
                                                    placeholder="Add specific feedback for this competency…"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Overall Feedback */}
                        <div className="overall-feedback">
                            <h3>Overall Feedback</h3>

                            <div className="form-group">
                                <label>Strengths *</label>
                                <textarea
                                    value={strengths}
                                    onChange={(e) => setStrengths(e.target.value)}
                                    rows="3"
                                    required
                                    disabled={isSubmitted}
                                    placeholder="What are this employee's key strengths?"
                                />
                            </div>

                            <div className="form-group">
                                <label>Areas of Improvement *</label>
                                <textarea
                                    value={areasOfImprovement}
                                    onChange={(e) => setAreasOfImprovement(e.target.value)}
                                    rows="3"
                                    required
                                    disabled={isSubmitted}
                                    placeholder="What areas should this employee focus on improving?"
                                />
                            </div>

                            <div className="form-group">
                                <label>Overall Comments *</label>
                                <textarea
                                    value={overallComments}
                                    onChange={(e) => setOverallComments(e.target.value)}
                                    rows="4"
                                    required
                                    disabled={isSubmitted}
                                    placeholder="Provide a holistic summary of this employee's performance…"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                        {!isSubmitted && (
                            <>
                                <button type="button" className="btn btn-secondary" disabled={submitting} onClick={(e) => handleSubmit(e, true)}>
                                    {submitting ? '⏳...' : '💾 Save Draft'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? '⏳ Submitting…' : '✅ Submit Review'}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Appraisals;

// ─── Rating Modal Component ──────────────────────────────────────────────────
const BAND_ORDER = ['OUTSTANDING', 'EXCEEDS', 'MEETS', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY'];

const BAND_CONFIG = {
    OUTSTANDING: { label: 'Outstanding', color: '#16a34a', bg: '#dcfce7', icon: '🌟', min: 90 },
    EXCEEDS: { label: 'Exceeds Expectations', color: '#2563eb', bg: '#dbeafe', icon: '🟢', min: 75 },
    MEETS: { label: 'Meets Expectations', color: '#7c3aed', bg: '#ede9fe', icon: '🔵', min: 60 },
    NEEDS_IMPROVEMENT: { label: 'Needs Improvement', color: '#d97706', bg: '#fef3c7', icon: '🟡', min: 40 },
    UNSATISFACTORY: { label: 'Unsatisfactory', color: '#dc2626', bg: '#fee2e2', icon: '🔴', min: 0 },
};

const ScoreGauge = ({ label, score, weightPct, color }) => (
    <div className="score-gauge">
        <div className="gauge-label">{label} <span className="gauge-weight">({weightPct}%)</span></div>
        <div className="gauge-bar-track">
            <div
                className="gauge-bar-fill"
                style={{ width: `${Math.min(score, 100)}%`, background: color }}
            />
        </div>
        <div className="gauge-score" style={{ color }}>{score.toFixed(1)}<span>/100</span></div>
    </div>
);

const RatingModal = ({ preview, appraisalId, onClose, onFinalize, getBandIcon }) => {
    const [override, setOverride] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    const suggested = preview.suggestedRating;
    const effective = override || suggested;
    const cfg = BAND_CONFIG[effective] || BAND_CONFIG.MEETS;

    const handleSave = async () => {
        setSaving(true);
        await onFinalize(appraisalId, override || null);
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
            <div className="modal-content extra-large rating-modal">
                <div className="modal-header">
                    <h2>🏅 Performance Rating Calculation</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="rating-modal-body">
                    {/* Score breakdown */}
                    <div className="score-breakdown-section">
                        <h3>Score Breakdown</h3>
                        <div className="score-gauges">
                            <ScoreGauge label="🎯 Goal Achievement" score={preview.goalScore} weightPct={preview.goalWeight} color="#16a34a" />
                            <ScoreGauge label="📋 Competency Reviews" score={preview.competencyScore} weightPct={preview.competencyWeight} color="#2563eb" />
                            <ScoreGauge label="⚡ Final Blended Score" score={preview.finalScore} weightPct={100} color="#7c3aed" />
                        </div>
                        {!preview.hasCompetencyData && (
                            <div className="info-banner">
                                ℹ️ No competency reviews submitted yet — final score is based entirely on goal achievement (100 %).
                            </div>
                        )}
                    </div>

                    {/* Goal breakdown table */}
                    <div className="goal-breakdown-section">
                        <h3>Goal Achievement Details <span className="goal-count">({preview.goalCount} goals)</span></h3>
                        {preview.goalCount === 0 ? (
                            <div className="no-data">No goals linked to this appraisal cycle.</div>
                        ) : (
                            <table className="goal-breakdown-table">
                                <thead>
                                    <tr>
                                        <th>Goal</th>
                                        <th>Weight</th>
                                        <th>Progress</th>
                                        <th>Status</th>
                                        <th>Contribution</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.goalBreakdown.map(g => (
                                        <tr key={g.id}>
                                            <td>{g.title}</td>
                                            <td className="center">{g.weightage}%</td>
                                            <td>
                                                <div className="mini-bar-track">
                                                    <div
                                                        className="mini-bar-fill"
                                                        style={{
                                                            width: `${g.progressPct}%`,
                                                            background: g.progressPct >= 75 ? '#16a34a' : g.progressPct >= 50 ? '#d97706' : '#dc2626'
                                                        }}
                                                    />
                                                </div>
                                                <span className="pct-label">{g.progressPct}%</span>
                                            </td>
                                            <td>
                                                <span className={`goal-status-chip gs-${g.status.toLowerCase()}`}>
                                                    {g.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="center contrib">{g.contribution}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Review Comments Section */}
                    {preview.reviewComments && preview.reviewComments.length > 0 && (
                        <div className="review-comments-breakdown">
                            <h3>Peer & Qualitative Feedback</h3>
                            <div className="feedback-list">
                                {preview.reviewComments.map(rev => (
                                    <div key={rev.id} className="feedback-card">
                                        <div className="feedback-card-header">
                                            <span className="reviewer-name">{rev.reviewerName}</span>
                                            <span className="reviewer-type">{rev.reviewerType.replace(/_/g, ' ')}</span>
                                            <div className="feedback-rating">Rating: {rev.rating.toFixed(1)}⭐</div>
                                        </div>
                                        <div className="feedback-content">
                                            <div className="fb-section">
                                                <strong>Strengths:</strong>
                                                <p>{rev.strengths}</p>
                                            </div>
                                            <div className="fb-section">
                                                <strong>Areas for Improvement:</strong>
                                                <p>{rev.areasOfImprovement}</p>
                                            </div>
                                            <div className="fb-section">
                                                <strong>Overall Comments:</strong>
                                                <p>{rev.overallComments}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Band result */}
                    <div className="band-result-section">
                        <div className="suggested-band" style={{ background: BAND_CONFIG[suggested]?.bg, borderColor: BAND_CONFIG[suggested]?.color }}>
                            <div className="band-label">Auto-calculated Band</div>
                            <div className="band-name" style={{ color: BAND_CONFIG[suggested]?.color }}>
                                {BAND_CONFIG[suggested]?.icon} {BAND_CONFIG[suggested]?.label}
                            </div>
                            <div className="band-score">Final Score: <strong>{preview.finalScore.toFixed(1)}</strong></div>
                        </div>

                        <div className="override-section">
                            <label><strong>Manager Override (optional):</strong></label>
                            <select value={override} onChange={e => setOverride(e.target.value)}>
                                <option value="">Use auto-calculated band ({BAND_CONFIG[suggested]?.label})</option>
                                {BAND_ORDER.map(b => (
                                    <option key={b} value={b}>{BAND_CONFIG[b].icon} {BAND_CONFIG[b].label}</option>
                                ))}
                            </select>
                            {override && override !== suggested && (
                                <div className="override-warning">
                                    ⚠️ You are overriding the system-suggested band. This change will be saved.
                                </div>
                            )}
                        </div>

                        <div className="effective-band" style={{ borderColor: cfg.color }}>
                            <span style={{ color: cfg.color }}>{cfg.icon} <strong>Effective Band: {cfg.label}</strong></span>
                        </div>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ background: cfg.color, borderColor: cfg.color }}
                    >
                        {saving ? 'Saving...' : `💾 Finalize as "${cfg.label}"`}
                    </button>
                </div>
            </div>
        </div>
    );
};

