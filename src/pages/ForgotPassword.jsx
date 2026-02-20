import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Login.css';
import './ForgotPassword.css';

const ForgotPassword = () => {
    const navigate = useNavigate();

    // step: 'request' | 'reset' | 'done'
    const [step, setStep] = useState('request');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [generatedToken, setGeneratedToken] = useState('');   // shown from API response
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // ── Step 1: Request Reset Token ──────────────────────────
    const handleRequestToken = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await authAPI.forgotPassword(email.trim());
            setGeneratedToken(res.data.token);
            setUsername(res.data.username);
            setStep('reset');
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'No account found with that email.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Reset Password ────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            await authAPI.resetPassword(email.trim(), token.trim(), newPassword);
            setStep('done');
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Invalid or expired token.');
        } finally {
            setLoading(false);
        }
    };

    const copyToken = () => {
        navigator.clipboard.writeText(generatedToken).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="login-container">
            {/* Background */}
            <div className="login-background">
                <div className="gradient-orb orb-1" />
                <div className="gradient-orb orb-2" />
                <div className="gradient-orb orb-3" />
            </div>

            <div className="login-content animate-fadeIn">
                <div className="login-card glass-card fp-card">

                    {/* ── Header ── */}
                    <div className="fp-header">
                        <div className="fp-icon">
                            {step === 'done' ? '✅' : '🔑'}
                        </div>
                        <h2 className="fp-title">
                            {step === 'request' && 'Forgot Password?'}
                            {step === 'reset' && 'Reset Your Password'}
                            {step === 'done' && 'Password Updated!'}
                        </h2>
                        <p className="fp-subtitle">
                            {step === 'request' && 'Enter your registered email to get a reset token.'}
                            {step === 'reset' && `Enter the reset token shown below and set a new password for @${username}.`}
                            {step === 'done' && 'Your password has been changed successfully.'}
                        </p>
                    </div>

                    {/* ── Progress Bar ── */}
                    <div className="fp-progress">
                        <div className={`fp-step ${step !== 'request' ? 'done' : 'active'}`}>1</div>
                        <div className={`fp-line ${step === 'done' ? 'done' : step === 'reset' ? 'active' : ''}`} />
                        <div className={`fp-step ${step === 'done' ? 'done' : step === 'reset' ? 'active' : ''}`}>2</div>
                        <div className={`fp-line ${step === 'done' ? 'done' : ''}`} />
                        <div className={`fp-step ${step === 'done' ? 'done active' : ''}`}>3</div>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    {/* ── Step 1: Enter Email ── */}
                    {step === 'request' && (
                        <form onSubmit={handleRequestToken} className="fp-form">
                            <div className="fp-field">
                                <label>Registered Email Address</label>
                                <input
                                    type="email"
                                    placeholder="you@karmika.com"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setError(''); }}
                                    required
                                    autoFocus
                                />
                            </div>
                            <button type="submit" className="fp-btn-primary" disabled={loading}>
                                {loading ? '⏳ Generating token...' : '🔍 Get Reset Token'}
                            </button>
                            <div className="fp-back">
                                <Link to="/login">← Back to Login</Link>
                            </div>
                        </form>
                    )}

                    {/* ── Step 2: Show Token + Enter New Password ── */}
                    {step === 'reset' && (
                        <form onSubmit={handleResetPassword} className="fp-form">
                            {/* Token Display Box */}
                            <div className="fp-token-box">
                                <p className="fp-token-label">🔐 Your Reset Token</p>
                                <div className="fp-token-value">
                                    <span className="fp-token-digits">{generatedToken}</span>
                                    <button type="button" className="fp-copy-btn" onClick={copyToken}>
                                        {copied ? '✅' : '📋'}
                                    </button>
                                </div>
                                <p className="fp-token-note">⏰ This token expires in <strong>15 minutes</strong>.</p>
                            </div>

                            {/* Confirm Token Entry */}
                            <div className="fp-field">
                                <label>Enter Reset Token</label>
                                <input
                                    type="text"
                                    placeholder="6-digit token"
                                    value={token}
                                    onChange={e => { setToken(e.target.value); setError(''); }}
                                    maxLength={6}
                                    required
                                    autoFocus
                                />
                            </div>

                            {/* New Password */}
                            <div className="fp-field">
                                <label>New Password</label>
                                <div className="fp-pass-wrap">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Min. 6 characters"
                                        value={newPassword}
                                        onChange={e => { setNewPassword(e.target.value); setError(''); }}
                                        required
                                    />
                                    <button type="button" className="fp-eye" onClick={() => setShowPassword(p => !p)}>
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="fp-field">
                                <label>Confirm New Password</label>
                                <div className="fp-pass-wrap">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Repeat new password"
                                        value={confirmPassword}
                                        onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                                        required
                                    />
                                </div>
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <span className="fp-mismatch">❌ Passwords don't match</span>
                                )}
                                {confirmPassword && newPassword === confirmPassword && (
                                    <span className="fp-match">✅ Passwords match</span>
                                )}
                            </div>

                            {/* Password strength bar */}
                            {newPassword && (
                                <div className="fp-strength">
                                    <div className={`fp-strength-bar ${newPassword.length >= 12 ? 'strong'
                                            : newPassword.length >= 8 ? 'medium'
                                                : 'weak'
                                        }`} />
                                    <span>{
                                        newPassword.length >= 12 ? '💪 Strong'
                                            : newPassword.length >= 8 ? '👍 Medium'
                                                : '⚠️ Weak'
                                    }</span>
                                </div>
                            )}

                            <button type="submit" className="fp-btn-primary" disabled={loading}>
                                {loading ? '⏳ Resetting...' : '🔒 Reset Password'}
                            </button>

                            <button
                                type="button"
                                className="fp-btn-ghost"
                                onClick={() => { setStep('request'); setError(''); }}
                            >
                                ← Request a new token
                            </button>
                        </form>
                    )}

                    {/* ── Step 3: Done ── */}
                    {step === 'done' && (
                        <div className="fp-done">
                            <div className="fp-done-animation">✅</div>
                            <p>You can now log in with your new password.</p>
                            <button className="fp-btn-primary" onClick={() => navigate('/login')}>
                                → Go to Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
