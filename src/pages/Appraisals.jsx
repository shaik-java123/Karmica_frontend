import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { appraisalAPI, employeeAPI } from '../services/api';
import BackButton from '../components/BackButton';
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

    const isAdminOrHR = ['ADMIN', 'HR'].includes(user?.role);

    useEffect(() => {
        if (activeTab === 'my-appraisals') {
            fetchMyAppraisals();
        } else if (activeTab === 'pending-reviews') {
            fetchPendingReviews();
        } else if (activeTab === 'cycles' && isAdminOrHR) {
            fetchCycles();
        } else if (activeTab === 'competencies' && isAdminOrHR) {
            fetchCompetencies();
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
                        <h2>My Performance Appraisals</h2>
                    </div>

                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : myAppraisals.length === 0 ? (
                        <div className="no-data">No appraisals found</div>
                    ) : (
                        <div className="appraisals-grid">
                            {myAppraisals.map((appraisal) => (
                                <div key={appraisal.id} className="appraisal-card">
                                    <div className="card-header">
                                        <h3>{appraisal.cycleName}</h3>
                                        <span className={`status-badge ${getStatusBadgeClass(appraisal.status)}`}>
                                            {appraisal.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                    <div className="card-body">
                                        <div className="review-progress">
                                            <h4>Review Progress</h4>
                                            <div className="progress-item">
                                                <span>Self Review:</span>
                                                <span className={appraisal.selfReviewCompleted ? 'completed' : 'pending'}>
                                                    {appraisal.selfReviewCompleted ? '✓ Completed' : '⏳ Pending'}
                                                </span>
                                            </div>
                                            <div className="progress-item">
                                                <span>Manager Review:</span>
                                                <span className={appraisal.managerReviewCompleted ? 'completed' : 'pending'}>
                                                    {appraisal.managerReviewCompleted ? '✓ Completed' : '⏳ Pending'}
                                                </span>
                                            </div>
                                            <div className="progress-item">
                                                <span>Peer Reviews:</span>
                                                <span>
                                                    {appraisal.peerReviewsCompleted} / {appraisal.peerReviewsRequired}
                                                </span>
                                            </div>
                                        </div>

                                        {appraisal.overallRating && (
                                            <div className="overall-rating">
                                                <h4>Overall Rating</h4>
                                                <div className="rating-display">
                                                    {getRatingStars(appraisal.overallRating)}
                                                </div>
                                            </div>
                                        )}

                                        {appraisal.peerReviewsRequired > 0 && appraisal.peerReviewsCompleted === 0 && (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setCurrentAppraisalForPeers(appraisal);
                                                    setShowPeerModal(true);
                                                    employeeAPI.getAll().then(res => setEmployees(res.data));
                                                }}
                                            >
                                                Select Peer Reviewers
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
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
                            {cycles.map((cycle) => (
                                <div key={cycle.id} className="cycle-card">
                                    <div className="card-header">
                                        <h3>{cycle.cycleName}</h3>
                                        <span className={`status-badge status-${cycle.status.toLowerCase()}`}>
                                            {cycle.status}
                                        </span>
                                    </div>
                                    <div className="card-body">
                                        <p>{cycle.description}</p>
                                        <div className="cycle-dates">
                                            <div>
                                                <strong>Review Period:</strong>
                                                <br />
                                                {new Date(cycle.reviewPeriodStart).toLocaleDateString()} - {new Date(cycle.reviewPeriodEnd).toLocaleDateString()}
                                            </div>
                                            <div>
                                                <strong>Cycle Period:</strong>
                                                <br />
                                                {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                        {cycle.status === 'DRAFT' && (
                                            <button
                                                className="btn btn-success"
                                                onClick={() => handleActivateCycle(cycle.id)}
                                            >
                                                Activate Cycle
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
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
                                    <option value="ANNUAL">Annual</option>
                                    <option value="SEMI_ANNUAL">Semi-Annual</option>
                                    <option value="QUARTERLY">Quarterly</option>
                                    <option value="PROBATION">Probation</option>
                                    <option value="PROJECT_END">Project End</option>
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
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Select Peer Reviewers</h2>
                            <button className="close-btn" onClick={() => setShowPeerModal(false)}>×</button>
                        </div>
                        <p>Select {currentAppraisalForPeers?.peerReviewsRequired} to {currentAppraisalForPeers?.cycle?.maxPeerReviewers || 5} colleagues to review your performance</p>

                        <div className="peer-selection-list">
                            {employees.filter(emp => emp.status === 'ACTIVE').map((emp) => (
                                <label key={emp.id} className="peer-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedPeers.includes(emp.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedPeers([...selectedPeers, emp.id]);
                                            } else {
                                                setSelectedPeers(selectedPeers.filter(id => id !== emp.id));
                                            }
                                        }}
                                    />
                                    <span>{emp.firstName} {emp.lastName} - {emp.designation}</span>
                                </label>
                            ))}
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
const ReviewSubmissionModal = ({ review, onClose, toast }) => {
    const [ratings, setRatings] = useState({});
    const [comments, setComments] = useState({});
    const [overallComments, setOverallComments] = useState('');
    const [strengths, setStrengths] = useState('');
    const [areasOfImprovement, setAreasOfImprovement] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all competencies are rated
        const allRated = review.data.competencies.every(comp => ratings[comp.id]);
        if (!allRated) {
            toast.error('Please rate all competencies');
            return;
        }

        try {
            setSubmitting(true);
            await appraisalAPI.submitReview(review.review.id, {
                overallComments,
                strengths,
                areasOfImprovement,
                competencyRatings: ratings,
                competencyComments: comments
            });
            toast.success('Review submitted successfully');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content extra-large">
                <div className="modal-header">
                    <h2>Performance Review - {review.employee.firstName} {review.employee.lastName}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="review-form">
                        <h3>Rate Competencies (1-5 scale)</h3>
                        <div className="competencies-rating">
                            {review.data.competencies.map((competency) => (
                                <div key={competency.id} className="competency-rating-item">
                                    <div className="competency-header">
                                        <h4>{competency.name}</h4>
                                        <span className="category-badge">{competency.category}</span>
                                    </div>
                                    <p className="description">{competency.description}</p>

                                    <div className="rating-input">
                                        <label>Rating *</label>
                                        <div className="star-rating">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    className={`star ${ratings[competency.id] >= star ? 'selected' : ''}`}
                                                    onClick={() => setRatings({ ...ratings, [competency.id]: star })}
                                                >
                                                    ⭐
                                                </button>
                                            ))}
                                            <span className="rating-value">{ratings[competency.id] || 'Not rated'}</span>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Comments</label>
                                        <textarea
                                            value={comments[competency.id] || ''}
                                            onChange={(e) => setComments({ ...comments, [competency.id]: e.target.value })}
                                            rows="2"
                                            placeholder="Optional comments for this competency"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="overall-feedback">
                            <h3>Overall Feedback</h3>

                            <div className="form-group">
                                <label>Strengths *</label>
                                <textarea
                                    value={strengths}
                                    onChange={(e) => setStrengths(e.target.value)}
                                    rows="3"
                                    required
                                    placeholder="What are the employee's key strengths?"
                                />
                            </div>

                            <div className="form-group">
                                <label>Areas of Improvement *</label>
                                <textarea
                                    value={areasOfImprovement}
                                    onChange={(e) => setAreasOfImprovement(e.target.value)}
                                    rows="3"
                                    required
                                    placeholder="What areas need improvement?"
                                />
                            </div>

                            <div className="form-group">
                                <label>Overall Comments *</label>
                                <textarea
                                    value={overallComments}
                                    onChange={(e) => setOverallComments(e.target.value)}
                                    rows="4"
                                    required
                                    placeholder="Provide overall feedback on performance"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Appraisals;
