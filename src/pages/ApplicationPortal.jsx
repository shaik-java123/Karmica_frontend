import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { jobPostingAPI, resumeValidationAPI } from '../services/api';
import BackButton from '../components/BackButton';
import './ApplicationPortal.css';

const ApplicationPortal = () => {
    const { isAuthenticated, user } = useAuth();
    const { showToast } = useToast();
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [showResumeValidation, setShowResumeValidation] = useState(false);
    const [resumeValidation, setResumeValidation] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        candidateName: '',
        candidateEmail: '',
        candidatePhone: '',
        resumeContent: '',
        coverLetter: '',
        totalExperienceYears: '',
        expectedCtc: '',
        noticePeriodDays: '',
    });

    // Search and filter
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' or 'my-apps'
    const [myApplications, setMyApplications] = useState([]);
    const [appsLoading, setAppsLoading] = useState(false);

    useEffect(() => {
        fetchPublishedJobs();
        if (isAuthenticated) {
            fetchMyApplications();
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        filterJobs();
    }, [jobs, searchTerm]);

    const fetchMyApplications = async () => {
        try {
            setAppsLoading(true);
            const response = await jobPostingAPI.getMyApplications();
            const data = response.data?.data || response.data || [];
            setMyApplications(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching applications:', error);
            showToast('Failed to load your applications: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setAppsLoading(false);
        }
    };

    const fetchPublishedJobs = async () => {
        try {
            setLoading(true);
            const response = await jobPostingAPI.getAll({ status: 'OPEN' });
            const data = response.data?.data || response.data || [];
            setJobs(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('Failed to load job postings: ' + error.message, 'error');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterJobs = () => {
        let filtered = jobs;
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(job =>
                (job.jobTitle && job.jobTitle.toLowerCase().includes(searchLower)) ||
                (job.departmentName && job.departmentName.toLowerCase().includes(searchLower)) ||
                (job.location && job.location.toLowerCase().includes(searchLower))
            );
        }
        setFilteredJobs(filtered);
    };

    const handleApplyClick = (job) => {
        setSelectedJob(job);
        // Pre-fill form if user is logged in
        if (isAuthenticated && user) {
            setFormData(prev => ({
                ...prev,
                candidateName: user.username || '',
                candidateEmail: user.email || '',
            }));
        }
        setShowApplicationForm(true);
    };

    const handleValidateResume = async (content) => {
        if (!content || typeof content !== 'string' || !content.trim()) return;
        try {
            const response = await resumeValidationAPI.validateResume(content, {
                minExperienceYears: selectedJob?.experienceMin || 0,
                requiredSkills: selectedJob?.requirements
                    ? selectedJob.requirements.split(/[,\n]/).map(s => s.trim()).filter(s => s.length < 30 && s.length > 1)
                    : [],
            });
            const data = response.data?.data || response.data;
            setResumeValidation(data);
            setShowResumeValidation(true);
            showToast('Resume validated successfully!', 'success');
        } catch (error) {
            showToast('Failed to validate resume: ' + error.message, 'error');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        setFormData(prev => ({
            ...prev,
            resumeFile: file,
        }));
    };

    const handleSubmitApplication = async (e) => {
        e.preventDefault();

        if (!formData.candidateName || !formData.candidateEmail) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            setLoading(true);

            const formDataToSubmit = new FormData();
            formDataToSubmit.append('candidateName', formData.candidateName);
            formDataToSubmit.append('candidateEmail', formData.candidateEmail);
            formDataToSubmit.append('candidatePhone', formData.candidatePhone || '');
            formDataToSubmit.append('coverLetter', formData.coverLetter || '');
            formDataToSubmit.append('totalExperienceYears', formData.totalExperienceYears || '0');
            formDataToSubmit.append('expectedCtc', formData.expectedCtc || '0');
            formDataToSubmit.append('noticePeriodDays', formData.noticePeriodDays || '0');

            if (formData.resumeFile) {
                formDataToSubmit.append('resumeFile', formData.resumeFile);
            }

            await jobPostingAPI.submitApplication(selectedJob.id, formDataToSubmit);

            showToast('Application submitted successfully!', 'success');
            resetForm();
            setShowApplicationForm(false);
            if (isAuthenticated) fetchMyApplications();
        } catch (error) {
            showToast('Failed to submit application: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            candidateName: '',
            candidateEmail: '',
            candidatePhone: '',
            resumeContent: '',
            coverLetter: '',
            totalExperienceYears: '',
            expectedCtc: '',
            noticePeriodDays: '',
        });
        setResumeValidation(null);
        setShowResumeValidation(false);
    };

    const parseJSON = (jsonStr) => {
        try {
            return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        } catch {
            return {};
        }
    };

    return (
        <div className="application-portal">
            {isAuthenticated && <BackButton to="/dashboard" />}

            <div className="portal-header">
                <h1>🔥 Hot Opportunities <span className="hotops-tag">HotOps</span></h1>
                <p>Exclusive internal and external openings for our associates and candidates</p>
            </div>

            {isAuthenticated && (
                <div className="portal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('jobs')}
                    >
                        🔍 Discover
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'my-apps' ? 'active' : ''}`}
                        onClick={() => setActiveTab('my-apps')}
                    >
                        📋 My Applications
                    </button>
                </div>
            )}

            {activeTab === 'jobs' ? (
                <>
                    {/* Search Bar */}
                    <div className="search-section">
                        <input
                            type="text"
                            placeholder="Search by job title, department, or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    {/* Jobs List */}
                    {loading ? (
                        <div className="loading">Loading job postings...</div>
                    ) : filteredJobs.length === 0 ? (
                        <div className="empty-state">
                            <p>No job postings available at the moment.</p>
                        </div>
                    ) : (
                        <div className="jobs-list">
                            {filteredJobs.map(job => (
                                <div key={job.id} className="job-listing hotops-listing">
                                    <div className="job-info">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <h3>{job.jobTitle}</h3>
                                            <span className="hot-badge">NEW HOT OP</span>
                                        </div>
                                        <div className="job-details">
                                            <span className="detail-item">
                                                <strong>Department:</strong> {job.departmentName || job.department || 'N/A'}
                                            </span>
                                            <span className="detail-item">
                                                <strong>Location:</strong> {job.location}
                                            </span>
                                            <span className="detail-item">
                                                <strong>Type:</strong> {job.employmentType}
                                            </span>
                                            {job.salaryRange && (
                                                <span className="detail-item">
                                                    <strong>Salary:</strong> {job.salaryRange}
                                                </span>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <div className="description">
                                            <h4>Job Description</h4>
                                            <p>{job.description}</p>
                                        </div>

                                        {/* Requirements */}
                                        <div className="requirements">
                                            <h4>Requirements</h4>
                                            <p>{job.requirements}</p>
                                        </div>

                                        {/* Experience */}
                                        {job.minExperience || job.maxExperience ? (
                                            <div className="experience">
                                                <h4>Experience Required</h4>
                                                <p>
                                                    {job.minExperience} - {job.maxExperience} years
                                                </p>
                                            </div>
                                        ) : null}

                                        {/* Required Skills */}
                                        {job.requiredSkills && job.requiredSkills.length > 0 && (
                                            <div className="skills">
                                                <h4>Required Skills</h4>
                                                <div className="skill-list">
                                                    {job.requiredSkills.map((skill, idx) => (
                                                        <span key={idx} className="skill-badge">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {(() => {
                                        const application = myApplications.find(app => app.jobPostingId === job.id);
                                        if (application) {
                                            return (
                                                <div className="applied-status-badge">
                                                    <span className="badge-icon">✅</span>
                                                    Applied ({application.status?.replace('_', ' ')})
                                                </div>
                                            );
                                        }
                                        return (
                                            <button
                                                className="btn btn-apply"
                                                onClick={() => handleApplyClick(job)}
                                            >
                                                Apply Now
                                            </button>
                                        );
                                    })()}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="my-applications-view">
                    {appsLoading ? (
                        <div className="loading">Loading your applications...</div>
                    ) : myApplications.length === 0 ? (
                        <div className="empty-apps">
                            <div className="empty-icon">📁</div>
                            <h3>No applications found</h3>
                            <p>You haven't applied for any positions yet.</p>
                            <button className="btn btn-primary" onClick={() => setActiveTab('jobs')}>
                                Browse Opportunities
                            </button>
                        </div>
                    ) : (
                        <div className="apps-grid">
                            {myApplications.map(app => (
                                <div key={app.id} className="app-status-card">
                                    <div className="app-status-header">
                                        <h3>{app.jobTitle}</h3>
                                        <span className={`status-badge ${app.status?.toLowerCase()}`}>
                                            {app.status?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="app-status-details">
                                        <p><strong>Applied:</strong> {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : 'N/A'}</p>
                                        <p><strong>Ref ID:</strong> #{app.id}</p>
                                    </div>
                                    <div className="app-status-footer">
                                        <p className="status-msg">
                                            {app.status === 'APPLIED' && "Your application is under initial review."}
                                            {app.status === 'SCREENING' && "We are currently screening your profile."}
                                            {app.status === 'INTERVIEW' && "Congratulations! You've been shortlisted for an interview."}
                                            {app.status === 'REJECTED' && "Thank you for your interest. We've decided to move forward with other candidates."}
                                            {app.status === 'OFFER' && "An offer has been extended!"}
                                            {app.status === 'HIRED' && "Welcome to the team!"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Application Form Modal */}
            {showApplicationForm && selectedJob && (
                <div className="modal-overlay" onClick={() => setShowApplicationForm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Apply for {selectedJob.jobTitle}</h2>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setShowApplicationForm(false);
                                    resetForm();
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            {showResumeValidation && resumeValidation ? (
                                <div className="validation-summary">
                                    <h3>Resume Validation Result</h3>
                                    <div className="validation-card">
                                        <div className="score">
                                            <span className="score-number">
                                                {resumeValidation.qualityScore}
                                            </span>
                                            <span className="score-label">/100</span>
                                        </div>
                                        <p className={`status ${resumeValidation.validationStatus?.toLowerCase()}`}>
                                            {resumeValidation.validationStatus}
                                        </p>
                                    </div>
                                    {resumeValidation.recommendationReason && (
                                        <p className="recommendation">
                                            <strong>Feedback:</strong> {resumeValidation.recommendationReason}
                                        </p>
                                    )}
                                </div>
                            ) : null}

                            <form onSubmit={handleSubmitApplication}>
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        name="candidateName"
                                        value={formData.candidateName}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Your full name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        name="candidateEmail"
                                        value={formData.candidateEmail}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="your.email@example.com"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        name="candidatePhone"
                                        value={formData.candidatePhone}
                                        onChange={handleInputChange}
                                        placeholder="Your phone number"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Resume *</label>
                                    <div className="file-input-wrapper">
                                        <input
                                            type="file"
                                            id="resume-file"
                                            onChange={(e) => {
                                                handleFileChange(e);
                                            }}
                                            accept=".pdf,.doc,.docx,.txt"
                                            required
                                        />
                                        <label htmlFor="resume-file" className="file-label">
                                            📄 {formData.resumeFile
                                                ? formData.resumeFile.name
                                                : 'Choose resume file'}
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Cover Letter</label>
                                    <textarea
                                        name="coverLetter"
                                        value={formData.coverLetter}
                                        onChange={handleInputChange}
                                        rows="5"
                                        placeholder="Tell us why you're a great fit for this role..."
                                    />
                                </div>

                                <button type="submit" className="btn btn-submit" disabled={loading}>
                                    {loading ? 'Submitting...' : 'Submit Application'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplicationPortal;
