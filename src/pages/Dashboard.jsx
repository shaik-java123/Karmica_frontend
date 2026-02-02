import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, notificationAPI } from '../services/api'; // Added notificationAPI
import NotificationBell from '../components/NotificationBell';
import { useToast } from '../context/ToastContext'; // Added useToast
import './Dashboard.css';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast(); // Hook
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileImage, setProfileImage] = useState(() => {
        return localStorage.getItem(`profile-image-${user?.username}`) || null;
    });

    // Announcement Modal State
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [announcementData, setAnnouncementData] = useState({ title: '', message: '' });

    useEffect(() => {
        // ... existing useEffect ...
        fetchDashboardStats();
        // Update profile image if it changes
        const updateProfileImage = () => {
            setProfileImage(localStorage.getItem(`profile-image-${user?.username}`) || null);
        };
        window.addEventListener('storage', updateProfileImage);
        return () => window.removeEventListener('storage', updateProfileImage);
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const response = await dashboardAPI.getStats();
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleBroadcastAnnouncement = async (e) => {
        e.preventDefault();
        try {
            await notificationAPI.createAnnouncement(announcementData);
            showToast('Announcement sent successfully!', 'success');
            setShowAnnouncementModal(false);
            setAnnouncementData({ title: '', message: '' });
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to send announcement', 'error');
        }
    };

    const getStatsCards = () => {
        // ... existing getStatsCards ...
        if (!stats) return [];

        const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';

        if (isAdmin) {
            return [
                { label: 'Total Employees', value: stats.totalEmployees || '0', icon: '👥', color: 'primary', path: '/employees' },
                { label: 'Attendance Rate', value: stats.attendanceRate || '0%', icon: '📊', color: 'success', path: '/attendance' },
                { label: 'Departments', value: stats.totalDepartments || '0', icon: '🏢', color: 'secondary', path: '/departments' },
                { label: 'Pending Leaves', value: stats.pendingLeaves || '0', icon: '📋', color: 'warning', path: '/leaves' },
                { label: 'Weekly Leaves', value: stats.approvedLeavesThisWeek || '0', icon: '📈', color: 'info', path: '/leaves' },
                { label: 'Today Present', value: stats.todayAttendance || '0', icon: '✅', color: 'success', path: '/attendance' },
            ];
        } else if (user?.role === 'MANAGER') {
            return [
                { label: 'Team Size', value: stats.teamSize || '0', icon: '👥', color: 'primary', path: '/employees' },
                { label: 'Pending Team Leaves', value: stats.pendingTeamLeaves || '0', icon: '📋', color: 'warning', path: '/leaves' },
                { label: 'Leaves Taken', value: stats.leavesTaken || '0', icon: '🌴', color: 'secondary', path: '/leaves' },
                { label: 'My Pending Leaves', value: stats.myPendingLeaves || '0', icon: '⏳', color: 'success', path: '/leaves' },
            ];
        } else {
            return [
                { label: 'Leaves Taken', value: stats.leavesTaken || '0', icon: '🌴', color: 'primary', path: '/leaves' },
                { label: 'Pending Leaves', value: stats.myPendingLeaves || '0', icon: '⏳', color: 'warning', path: '/leaves' },
                { label: 'Check-in Today', value: stats.todayCheckIn ? '✓ Done' : '✗ Pending', icon: '⏰', color: 'success', path: '/attendance' },
                { label: 'Status', value: stats.checkedIn ? 'Active' : 'Inactive', icon: '📊', color: 'secondary', path: '/attendance' },
            ];
        }
    };

    // Dynamic Quick Actions
    const quickActions = [
        { label: 'Employee Directory', icon: '👥', path: '/employees' },
        { label: 'Mark Attendance', icon: '⏰', path: '/attendance' },
        { label: 'My Tasks', icon: '📋', path: '/tasks' },
        { label: 'Apply Leave', icon: '📝', path: '/leaves' },
    ];

    if (user?.role === 'ADMIN' || user?.role === 'HR') {
        quickActions.push({
            label: 'Announcement',
            icon: '📢',
            action: () => setShowAnnouncementModal(true)
        });
        quickActions.push({
            label: 'Organization',
            icon: '🏢',
            path: '/organization'
        });
        quickActions.push({
            label: 'Payroll',
            icon: '💰',
            path: '/payroll'
        });
    } else {
        // Everyone can view organization details to check holidays/policies
        quickActions.push({
            label: 'Organization',
            icon: '🏢',
            path: '/organization'
        });
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <header className="dashboard-header glass-card">
                <div className="header-content">
                    <div className="header-left">
                        <img src="/karmika-logo.png" alt="Karmika Logo" className="header-logo" />
                    </div>
                    <div className="header-right">
                        <div className="user-info" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
                            {profileImage ? (
                                <img src={profileImage} alt="Profile" className="user-avatar" style={{ objectFit: 'cover' }} />
                            ) : (
                                <div className="user-avatar">{user?.username?.charAt(0).toUpperCase()}</div>
                            )}
                            <div className="user-details">
                                <p className="user-name">{user?.username}</p>
                                <p className="user-role">{user?.role}</p>
                            </div>
                        </div>
                        <NotificationBell />
                        <button onClick={handleLogout} className="btn btn-secondary">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="dashboard-content">
                {/* Welcome Section */}
                <section className="welcome-section animate-fadeIn">
                    <div className="welcome-card glass-card">
                        <h2>Welcome back, {user?.username}! 👋</h2>
                        <p>Here's what's happening with your organization today.</p>
                    </div>
                </section>

                {/* Stats Grid */}
                <section className="stats-section">
                    {loading ? (
                        <div className="loading-stats">Loading stats...</div>
                    ) : (
                        <div className="stats-grid">
                            {getStatsCards().map((stat, index) => (
                                <div
                                    key={index}
                                    className={`stat-card glass-card stat-${stat.color}`}
                                    style={{
                                        animationDelay: `${index * 100}ms`,
                                        cursor: stat.path ? 'pointer' : 'default'
                                    }}
                                    onClick={() => stat.path && navigate(stat.path)}
                                >
                                    <div className="stat-icon">{stat.icon}</div>
                                    <div className="stat-content">
                                        <p className="stat-label">{stat.label}</p>
                                        <h3 className="stat-value">{stat.value}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>


                {/* Quick Actions */}
                <section className="quick-actions-section">
                    <h2>Quick Actions</h2>
                    <div className="actions-grid">
                        {quickActions.map((action, index) => (
                            <button
                                key={index}
                                className="action-card glass-card"
                                onClick={() => action.action ? action.action() : navigate(action.path)}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="action-icon">{action.icon}</div>
                                <p className="action-label">{action.label}</p>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Recent Activity */}
                <section className="activity-section">
                    <h2>Recent Activity</h2>
                    <div className="activity-card glass-card">
                        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map((activity, index) => (
                                <div key={index} className="activity-item animate-fadeIn" style={{ animationDelay: `${index * 150}ms` }}>
                                    <div className={`activity-icon ${activity.type || 'primary'}`}>
                                        {activity.icon || '•'}
                                    </div>
                                    <div className="activity-content">
                                        <p className="activity-title">{activity.title}</p>
                                        <p className="activity-description">{activity.description}</p>
                                        <p className="activity-time">{activity.time}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-activity">No recent activity found.</div>
                        )}
                    </div>
                </section>
            </div>

            {/* Announcement Modal */}
            {showAnnouncementModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card">
                        <div className="modal-header">
                            <h2>📢 Make Announcement</h2>
                            <button className="close-btn" onClick={() => setShowAnnouncementModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleBroadcastAnnouncement}>
                            <div className="form-group">
                                <label className="form-label">Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={announcementData.title}
                                    onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                                    required
                                    placeholder="Important Announcement"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Message</label>
                                <textarea
                                    className="form-input"
                                    rows="4"
                                    value={announcementData.message}
                                    onChange={(e) => setAnnouncementData({ ...announcementData, message: e.target.value })}
                                    required
                                    placeholder="Enter your message here..."
                                ></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAnnouncementModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Broadcast 📢</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
