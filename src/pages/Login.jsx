import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await login(formData);

        if (result.success) {
            if (result.passwordChangeRequired) {
                navigate('/change-password');
            } else {
                navigate('/dashboard');
            }
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
                <div className="gradient-orb orb-3"></div>
            </div>

            <div className="login-content animate-fadeIn">
                <div className="login-card glass-card">
                    <div className="login-header">
                        <img src="/karmika-logo.png" alt="Karmika Logo" className="login-logo" />
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && (
                            <div className="alert alert-error">
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="username" className="form-label">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                className="form-input"
                                placeholder="Enter your username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className="form-input"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <div style={{ textAlign: 'right', marginTop: '6px' }}>
                                <Link
                                    to="/forgot-password"
                                    style={{ fontSize: '0.82rem', color: 'rgba(165,180,252,0.9)', textDecoration: 'none' }}
                                >
                                    🔑 Forgot password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>

                        <div className="login-footer">
                            <p>
                                Don't have an account?
                                <Link to="/register" className="link-primary"> Register here</Link>
                            </p>
                        </div>
                    </form>
                </div>

                <div className="features-grid">
                    <div className="feature-card glass-card">
                        <div className="feature-icon">👥</div>
                        <h3>Employee Management</h3>
                        <p>Comprehensive employee lifecycle management</p>
                    </div>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">📊</div>
                        <h3>Analytics</h3>
                        <p>Real-time insights and reports</p>
                    </div>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">💰</div>
                        <h3>Payroll</h3>
                        <p>Automated payroll processing</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
