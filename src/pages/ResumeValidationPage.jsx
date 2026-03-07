import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ResumeValidation from '../components/ResumeValidation';
import './ResumeValidationPage.css';

const ResumeValidationPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="rvp-container">
            {/* Page Header */}
            <div className="rvp-page-header">
                <button className="rvp-back-btn" onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <div className="rvp-page-title">
                    <h1>Resume Validation</h1>
                    <p>Analyze and score resumes against job requirements using AI-powered validation</p>
                </div>
                <div className="rvp-actions">
                    <button className="rvp-link-btn" onClick={() => navigate('/job-postings')}>
                        💼 View Job Postings
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="rvp-info-banner">
                <div className="rvp-info-grid">
                    {[
                        { icon: '🔍', title: 'Contact Detection', desc: 'Finds email & phone' },
                        { icon: '🎯', title: 'Skills Matching', desc: 'Required vs present' },
                        { icon: '🎓', title: 'Education', desc: 'Qualification extraction' },
                        { icon: '📊', title: 'Quality Score', desc: '0–100 quality rating' },
                        { icon: '💡', title: 'Recommendation', desc: 'Shortlist / Maybe / Reject' },
                        { icon: '⚡', title: 'Instant Results', desc: 'Real-time analysis' },
                    ].map((f, i) => (
                        <div key={i} className="rvp-feature">
                            <span className="rvp-feature-icon">{f.icon}</span>
                            <div>
                                <p className="rvp-feature-title">{f.title}</p>
                                <p className="rvp-feature-desc">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Validation Tool */}
            <div className="rvp-tool-wrapper">
                <ResumeValidation />
            </div>
        </div>
    );
};

export default ResumeValidationPage;
