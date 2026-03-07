import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { resumeValidationAPI } from '../services/api';
import './ResumeValidation.css';

const RECOMMENDATION_CONFIG = {
    SHORTLIST: { label: 'Shortlist', color: '#10b981', bg: '#d1fae5', icon: '🎯' },
    MAYBE: { label: 'Maybe', color: '#f59e0b', bg: '#fef3c7', icon: '🤔' },
    REJECT: { label: 'Reject', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
};

const ResumeValidation = ({ applicationId = null, onClose = null }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [activeTab, setActiveTab] = useState('paste'); // 'paste' | 'requirements'

    const [form, setForm] = useState({
        resumeContent: '',
        minExperienceYears: 0,
        requiredSkills: '',
    });

    const handleValidate = async (e) => {
        e.preventDefault();
        if (!form.resumeContent.trim()) {
            showToast('Please paste resume content to validate', 'warning');
            return;
        }
        setLoading(true);
        try {
            const skills = form.requiredSkills
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            const res = await resumeValidationAPI.validateResume(form.resumeContent, {
                minExperienceYears: parseInt(form.minExperienceYears) || 0,
                requiredSkills: skills,
            });

            const data = res.data?.data || res.data;
            setResult(data);
            showToast('Resume validated successfully!', 'success');
        } catch (err) {
            showToast('Validation failed: ' + (err.response?.data?.error || err.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setResult(null);
        setForm({ resumeContent: '', minExperienceYears: 0, requiredSkills: '' });
    };

    const parseJSON = (str) => {
        try { return typeof str === 'string' ? JSON.parse(str) : str; } catch { return null; }
    };

    const errors = parseJSON(result?.validationErrors) || [];
    const skillsMatch = parseJSON(result?.requiredSkillsMatch) || {};
    const additionalSkills = parseJSON(result?.additionalSkillsFound) || [];

    const score = result?.qualityScore ?? 0;
    const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    const recConfig = RECOMMENDATION_CONFIG[result?.recommendation] || {};

    const dashOffset = 226 - (226 * score) / 100;

    return (
        <div className="rv-container">
            {/* Header */}
            <div className="rv-header">
                <div className="rv-header-left">
                    <span className="rv-header-icon">📋</span>
                    <div>
                        <h2>Resume Validator</h2>
                        <p>AI-powered resume analysis tool</p>
                    </div>
                </div>
                {onClose && (
                    <button className="rv-close-btn" onClick={onClose}>✕</button>
                )}
            </div>

            {!result ? (
                <div className="rv-form-panel">
                    {/* Tabs */}
                    <div className="rv-tabs">
                        <button className={`rv-tab ${activeTab === 'paste' ? 'active' : ''}`} onClick={() => setActiveTab('paste')}>
                            📝 Resume Content
                        </button>
                        <button className={`rv-tab ${activeTab === 'requirements' ? 'active' : ''}`} onClick={() => setActiveTab('requirements')}>
                            ⚙️ Job Requirements
                        </button>
                    </div>

                    <form onSubmit={handleValidate}>
                        {activeTab === 'paste' ? (
                            <div className="rv-section">
                                <label>Paste Resume Content *</label>
                                <p className="rv-hint">Paste the full text content of the resume below</p>
                                <textarea
                                    className="rv-textarea"
                                    rows={12}
                                    placeholder="John Doe&#10;john.doe@email.com | +91-9876543210&#10;&#10;EXPERIENCE&#10;5 years of experience in software development...&#10;&#10;SKILLS&#10;Java, React, AWS, Docker, Kubernetes..."
                                    value={form.resumeContent}
                                    onChange={e => setForm(p => ({ ...p, resumeContent: e.target.value }))}
                                />
                                <div className="rv-char-count">{form.resumeContent.length} characters</div>
                            </div>
                        ) : (
                            <div className="rv-section">
                                <h3>Job Requirements (Optional)</h3>
                                <p className="rv-hint">Define requirements to get skill-matching analysis</p>
                                <div className="rv-form-row">
                                    <div className="rv-form-group">
                                        <label>Minimum Experience (years)</label>
                                        <input
                                            type="number" min="0" max="30"
                                            value={form.minExperienceYears}
                                            onChange={e => setForm(p => ({ ...p, minExperienceYears: e.target.value }))}
                                        />
                                    </div>
                                    <div className="rv-form-group">
                                        <label>Required Skills (comma-separated)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Java, React, AWS, Docker"
                                            value={form.requiredSkills}
                                            onChange={e => setForm(p => ({ ...p, requiredSkills: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                {form.requiredSkills && (
                                    <div className="rv-skills-preview">
                                        {form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
                                            <span key={i} className="rv-skill-preview-chip">{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="rv-form-footer">
                            <div className="rv-form-status">
                                {form.resumeContent ? (
                                    <span className="rv-status-ok">✓ Resume content ready</span>
                                ) : (
                                    <span className="rv-status-warn">⚠ Paste resume content first</span>
                                )}
                                {form.requiredSkills && (
                                    <span className="rv-status-ok">✓ {form.requiredSkills.split(',').filter(s => s.trim()).length} skill(s) defined</span>
                                )}
                            </div>
                            <button type="submit" className="rv-validate-btn" disabled={loading || !form.resumeContent.trim()}>
                                {loading ? (
                                    <><span className="rv-btn-spinner" />Analyzing...</>
                                ) : (
                                    <>🔍 Validate Resume</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="rv-results">
                    {/* Score Card */}
                    <div className="rv-score-section">
                        <div className="rv-score-card">
                            <svg width="80" height="80" viewBox="0 0 80 80">
                                <circle cx="40" cy="40" r="36" fill="none" stroke="var(--border-color)" strokeWidth="7" />
                                <circle
                                    cx="40" cy="40" r="36" fill="none"
                                    stroke={scoreColor} strokeWidth="7"
                                    strokeLinecap="round"
                                    strokeDasharray="226"
                                    strokeDashoffset={dashOffset}
                                    transform="rotate(-90 40 40)"
                                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                                />
                                <text x="40" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill={scoreColor}>{score}</text>
                            </svg>
                            <div className="rv-score-info">
                                <p className="rv-score-label">Quality Score</p>
                                <p className="rv-score-sub">out of 100</p>
                            </div>

                            <div className={`rv-status-pill rv-status-${result.validationStatus?.toLowerCase()}`}>
                                {result.validationStatus === 'VALID' ? '✓ Valid' :
                                    result.validationStatus === 'NEEDS_REVIEW' ? '⚐ Needs Review' : '✗ Invalid'}
                            </div>
                        </div>

                        {recConfig.label && (
                            <div className="rv-recommendation" style={{ background: recConfig.bg, borderColor: recConfig.color + '44' }}>
                                <span className="rv-rec-icon">{recConfig.icon}</span>
                                <div>
                                    <p className="rv-rec-label" style={{ color: recConfig.color }}>Recommendation: {recConfig.label}</p>
                                    {result.recommendationReason && (
                                        <p className="rv-rec-reason">{result.recommendationReason}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Extracted Info */}
                    <div className="rv-results-grid">
                        {[
                            { label: 'Experience', value: result.extractedExperienceYears != null ? `${result.extractedExperienceYears} years` : null, icon: '🎯' },
                            { label: 'Qualification', value: result.highestQualification, icon: '🎓' },
                            { label: 'Recent Role', value: result.mostRecentRole, icon: '💼' },
                            { label: 'Recent Company', value: result.mostRecentCompany, icon: '🏢' },
                        ].filter(i => i.value != null).map((item, i) => (
                            <div key={i} className="rv-info-card">
                                <span className="rv-info-icon">{item.icon}</span>
                                <div>
                                    <p className="rv-info-label">{item.label}</p>
                                    <p className="rv-info-value">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Skills Match */}
                    {Object.keys(skillsMatch).length > 0 && (
                        <div className="rv-section-card">
                            <div className="rv-section-header">
                                <h3>Required Skills Match</h3>
                                <span className="rv-section-count">
                                    {Object.values(skillsMatch).filter(Boolean).length}/{Object.keys(skillsMatch).length} matched
                                </span>
                            </div>
                            <div className="rv-skills-row">
                                {Object.entries(skillsMatch).map(([skill, matched]) => (
                                    <div key={skill} className={`rv-skill-badge ${matched ? 'matched' : 'missing'}`}>
                                        <span>{matched ? '✓' : '✗'}</span>
                                        <span>{skill}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Additional Skills */}
                    {additionalSkills.length > 0 && (
                        <div className="rv-section-card">
                            <div className="rv-section-header">
                                <h3>Additional Skills Found</h3>
                                <span className="rv-section-count">{additionalSkills.length} skills</span>
                            </div>
                            <div className="rv-skills-row">
                                {additionalSkills.map((skill, i) => (
                                    <span key={i} className="rv-additional-tag">{skill}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Validation Issues */}
                    {errors.length > 0 && (
                        <div className="rv-section-card rv-warnings">
                            <div className="rv-section-header">
                                <h3>⚠ Validation Issues</h3>
                                <span className="rv-section-count">{errors.length} issue{errors.length > 1 ? 's' : ''}</span>
                            </div>
                            <ul className="rv-errors-list">
                                {errors.map((err, i) => (
                                    <li key={i} className="rv-error-item">{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Resume Summary */}
                    {result.resumeSummary && (
                        <div className="rv-section-card">
                            <h3>Resume Summary</h3>
                            <div className="rv-summary-box">{result.resumeSummary}</div>
                        </div>
                    )}

                    <div className="rv-result-actions">
                        <button className="rv-validate-btn rv-validate-outline" onClick={handleReset}>
                            ← Validate Another
                        </button>
                        {onClose && (
                            <button className="rv-validate-btn rv-validate-outline" onClick={onClose}>
                                Close
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResumeValidation;
