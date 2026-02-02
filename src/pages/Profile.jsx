import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { employeeAPI } from '../services/api';
import BackButton from '../components/BackButton';
import './Profile.css';

const Profile = () => {
    const { user } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const fileInputRef = useRef(null);
    const [employeeProfile, setEmployeeProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await employeeAPI.getMe();
                setEmployeeProfile(response.data.employee);
                if (response.data.employee.photoUrl) {
                    setProfileImage(response.data.employee.photoUrl);
                    localStorage.setItem(`profile-image-${user?.username}`, response.data.employee.photoUrl);
                }
            } catch (error) {
                console.error("Failed to fetch employee profile", error);
            }
        };
        fetchProfile();
    }, []);

    // Get profile image from localStorage or use default
    const [profileImage, setProfileImage] = useState(() => {
        return localStorage.getItem(`profile-image-${user?.username}`) || null;
    });

    // Get demographic data from localStorage (fallback to employee profile if available)
    const [isEditing, setIsEditing] = useState(false);
    const [demographicData, setDemographicData] = useState(() => {
        const saved = localStorage.getItem(`demographics-${user?.username}`);
        return saved ? JSON.parse(saved) : {
            email: user?.email || '',
            phone: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            dateOfBirth: '',
            emergencyContact: '',
            emergencyPhone: ''
        };
    });

    // Update demographic data when employee profile loads if not already set
    useEffect(() => {
        if (employeeProfile && !localStorage.getItem(`demographics-${user?.username}`)) {
            setDemographicData(prev => ({
                ...prev,
                email: employeeProfile.email || prev.email,
                phone: employeeProfile.phone || prev.phone,
                address: employeeProfile.address || prev.address,
                city: employeeProfile.city || prev.city,
                state: employeeProfile.state || prev.state,
                zipCode: employeeProfile.pinCode || prev.zipCode,
                emergencyContact: employeeProfile.emergencyContactName || prev.emergencyContact,
                emergencyPhone: employeeProfile.emergencyContactPhone || prev.emergencyPhone
            }));
        }
    }, [employeeProfile, user?.username]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size should be less than 5MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Resize logic (Max 400px)
                    const MAX_SIZE = 400;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG with 0.7 quality
                    const base64String = canvas.toDataURL('image/jpeg', 0.7);

                    try {
                        await employeeAPI.updateProfilePhoto(base64String);
                        setProfileImage(base64String);
                        // Save backup to local storage
                        try {
                            localStorage.setItem(`profile-image-${user?.username}`, base64String);
                        } catch (e) {
                            console.warn("Image too large for localStorage backup");
                        }
                        showToast('Profile picture updated successfully!', 'success');
                        window.dispatchEvent(new Event('storage'));
                    } catch (error) {
                        console.error("Failed to upload profile photo", error);
                        showToast(error.response?.data?.error || 'Failed to upload profile photo', 'error');
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemoveImage = () => {
        setProfileImage(null);
        localStorage.removeItem(`profile-image-${user?.username}`);
        showToast('Profile picture removed', 'success');
        window.dispatchEvent(new Event('storage'));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setDemographicData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = () => {
        localStorage.setItem(`demographics-${user?.username}`, JSON.stringify(demographicData));
        setIsEditing(false);
        showToast('Profile updated successfully!', 'success');
    };

    const handleCancel = () => {
        const saved = localStorage.getItem(`demographics-${user?.username}`);
        if (saved) {
            setDemographicData(JSON.parse(saved));
        }
        setIsEditing(false);
    };

    return (
        <div className="profile-container">
            <BackButton />

            <div className="profile-content">
                <div className="profile-header glass-card">
                    <h1>Profile Settings</h1>
                    <p className="subtitle">Manage your account and preferences</p>
                </div>

                <div className="profile-grid">
                    {/* Profile Image Section */}
                    <div className="profile-card glass-card">
                        <h2>Profile Picture</h2>
                        <div className="profile-image-section">
                            <div className="profile-image-container" onClick={handleImageClick}>
                                {profileImage ? (
                                    <img src={profileImage} alt="Profile" className="profile-image" />
                                ) : (
                                    <div className="profile-avatar-large">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="image-overlay">
                                    <span className="upload-icon">📷</span>
                                    <span className="upload-text">Change Photo</span>
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                            {profileImage && (
                                <button
                                    onClick={handleRemoveImage}
                                    className="btn btn-danger btn-sm"
                                >
                                    Remove Photo
                                </button>
                            )}
                        </div>
                    </div>

                    {/* User Information */}
                    <div className="profile-card glass-card">
                        <h2>Account Information</h2>
                        <div className="info-grid">
                            <div className="info-item">
                                <label className="info-label">Username</label>
                                <p className="info-value">{user?.username}</p>
                            </div>
                            <div className="info-item">
                                <label className="info-label">Role</label>
                                <p className="info-value">
                                    <span className="role-badge">{user?.role}</span>
                                </p>
                            </div>
                            <div className="info-item">
                                <label className="info-label">Employee ID</label>
                                <p className="info-value">{employeeProfile?.employeeId || user?.employeeId || 'N/A'}</p>
                            </div>
                            <div className="info-item">
                                <label className="info-label">Department</label>
                                <p className="info-value">{employeeProfile?.department?.name || user?.department || 'N/A'}</p>
                            </div>
                            <div className="info-item">
                                <label className="info-label">Reporting Manager</label>
                                <p className="info-value">
                                    {employeeProfile?.reportingManager
                                        ? `${employeeProfile.reportingManager.firstName} ${employeeProfile.reportingManager.lastName}`
                                        : 'No Manager Assigned'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Demographic Details */}
                    <div className="profile-card glass-card demographic-section">
                        <div className="section-header">
                            <h2>Personal Details</h2>
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="btn btn-primary btn-sm">
                                    ✏️ Edit
                                </button>
                            )}
                        </div>

                        <div className="demographic-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            name="email"
                                            value={demographicData.email}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="your.email@example.com"
                                        />
                                    ) : (
                                        <p className="form-value">{demographicData.email || 'Not provided'}</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone Number</label>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={demographicData.phone}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    ) : (
                                        <p className="form-value">{demographicData.phone || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Address</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="address"
                                        value={demographicData.address}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="Street Address"
                                    />
                                ) : (
                                    <p className="form-value">{demographicData.address || 'Not provided'}</p>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">City</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="city"
                                            value={demographicData.city}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="City"
                                        />
                                    ) : (
                                        <p className="form-value">{demographicData.city || 'Not provided'}</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">State</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="state"
                                            value={demographicData.state}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="State"
                                        />
                                    ) : (
                                        <p className="form-value">{demographicData.state || 'Not provided'}</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Zip Code</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="zipCode"
                                            value={demographicData.zipCode}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="12345"
                                        />
                                    ) : (
                                        <p className="form-value">{demographicData.zipCode || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Date of Birth</label>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={demographicData.dateOfBirth}
                                        onChange={handleInputChange}
                                        className="form-input"
                                    />
                                ) : (
                                    <p className="form-value">{demographicData.dateOfBirth || 'Not provided'}</p>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Emergency Contact Name</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="emergencyContact"
                                            value={demographicData.emergencyContact}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="Contact Name"
                                        />
                                    ) : (
                                        <p className="form-value">{demographicData.emergencyContact || 'Not provided'}</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Emergency Phone</label>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            name="emergencyPhone"
                                            value={demographicData.emergencyPhone}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="+1 (555) 987-6543"
                                        />
                                    ) : (
                                        <p className="form-value">{demographicData.emergencyPhone || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>

                            {isEditing && (
                                <div className="form-actions">
                                    <button onClick={handleSave} className="btn btn-primary">
                                        💾 Save Changes
                                    </button>
                                    <button onClick={handleCancel} className="btn btn-secondary">
                                        ✖️ Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Theme Settings */}
                    <div className="profile-card glass-card">
                        <h2>Appearance</h2>
                        <div className="theme-section">
                            <div className="theme-info">
                                <div className="theme-icon">{isDark ? '🌙' : '☀️'}</div>
                                <div>
                                    <h3>Theme</h3>
                                    <p className="theme-description">
                                        Current: {isDark ? 'Dark Mode' : 'Light Mode'}
                                    </p>
                                </div>
                            </div>
                            <label className="theme-toggle">
                                <input
                                    type="checkbox"
                                    checked={isDark}
                                    onChange={toggleTheme}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="theme-preview">
                            <div className="preview-box">
                                <div className="preview-header"></div>
                                <div className="preview-content"></div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="profile-card glass-card">
                        <h2>Quick Stats</h2>
                        <div className="stats-list">
                            <div className="stat-item">
                                <span className="stat-icon">🌴</span>
                                <div className="stat-info">
                                    <p className="stat-label">Leaves Available</p>
                                    <p className="stat-number">15 days</p>
                                </div>
                            </div>
                            <div className="stat-item">
                                <span className="stat-icon">📊</span>
                                <div className="stat-info">
                                    <p className="stat-label">Attendance Rate</p>
                                    <p className="stat-number">98%</p>
                                </div>
                            </div>
                            <div className="stat-item">
                                <span className="stat-icon">⏰</span>
                                <div className="stat-info">
                                    <p className="stat-label">Days Present</p>
                                    <p className="stat-number">220 days</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
