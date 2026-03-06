import React, { useState, useEffect } from 'react';
import BackButton from '../components/BackButton';
import Icon from '../components/Icon';
import { useToast } from '../context/ToastContext';
import { demoAPI } from '../services/api';
import './ApiDemo.css';

const ApiDemo = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await demoAPI.getUsers(6);
            if (response.data.fallback) {
                showToast(response.data.message, 'warning');
                setUsers([]);
            } else {
                setUsers(response.data.results);
                showToast('Random users fetched successfully!', 'success');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Failed to fetch data.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

    return (
        <div className="api-demo-container">
            <header className="api-demo-header glass-card">
                <div className="header-left">
                    <BackButton />
                    <h1>
                        <Icon name="users" size={28} className="header-icon" />
                        API Integration Demo
                    </h1>
                </div>
                <div className="header-right">
                    <button
                        className={`btn btn-primary ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        onClick={fetchUsers}
                        disabled={loading}
                    >
                        <Icon name={loading ? "loading" : "refresh"} size={16} className={loading ? "animate-spin" : ""} />
                        {loading ? 'Fetching...' : 'Fetch New Users'}
                    </button>
                </div>
            </header>

            <div className="api-demo-content">
                <div className="demo-info glass-card">
                    <div className="info-icon">
                        <Icon name="info" size={32} color="#60a5fa" />
                    </div>
                    <div>
                        <h2>External API Integration Demo</h2>
                        <p>This page dynamically fetches real-time random user profiles from <strong>https://randomuser.me/api/</strong>. Provides an example of modern loading states, beautiful UI cards, and responsive micro-animations.</p>
                    </div>
                </div>

                <div className="user-grid">
                    {loading && users.length === 0 ? (
                        <div className="loading-state glass-card">
                            <Icon name="loading" size={48} className="animate-spin" color="#60a5fa" />
                            <p>Connecting to randomuser.me...</p>
                        </div>
                    ) : (
                        users.map((user, index) => (
                            <div key={user.login.uuid} className="user-profile-card glass-card fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                                <div className="card-header-bg"></div>
                                <div className="profile-image-container">
                                    <img src={user.picture.large} alt="Profile" className="profile-image" />
                                </div>
                                <div className="profile-details">
                                    <h3>{`${user.name.first} ${user.name.last}`}</h3>

                                    <div className="profile-info-item">
                                        <Icon name="info" size={14} color="var(--text-muted)" />
                                        <span>{user.email}</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <Icon name="building" size={14} color="var(--text-muted)" />
                                        <span>{`${user.location.city}, ${user.location.country}`}</span>
                                    </div>

                                    <div className="profile-stats">
                                        <div className="stat">
                                            <span className="stat-label">Age</span>
                                            <span className="stat-value">{user.dob.age}</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-label">Gender</span>
                                            <span className="stat-value" style={{ textTransform: 'capitalize' }}>{user.gender}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApiDemo;
