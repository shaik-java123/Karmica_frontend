import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BackButton from '../components/BackButton';
import AnimatedClock from '../components/AnimatedClock';
import './Attendance.css';

const Attendance = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [todayStatus, setTodayStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [myAttendance, setMyAttendance] = useState([]);
    const [teamAttendance, setTeamAttendance] = useState([]);
    const [activeTab, setActiveTab] = useState('today');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const canViewTeam = ['ADMIN', 'HR', 'MANAGER'].includes(user?.role);
    const canViewReport = ['ADMIN', 'HR'].includes(user?.role);
    const [dailyReport, setDailyReport] = useState([]);

    useEffect(() => {
        fetchTodayStatus();
        if (activeTab === 'my') {
            fetchMyAttendance();
        } else if (activeTab === 'team' && canViewTeam) {
            fetchTeamAttendance();
        } else if (activeTab === 'daily' && canViewReport) {
            fetchDailyReport();
        }
    }, [activeTab, selectedDate]);

    const fetchTodayStatus = async () => {
        try {
            const response = await attendanceAPI.getTodayStatus();
            setTodayStatus(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching today status:', error);
            setLoading(false);
        }
    };

    const fetchMyAttendance = async () => {
        try {
            const response = await attendanceAPI.getMyAttendance();
            setMyAttendance(response.data.attendance || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        }
    };

    const fetchTeamAttendance = async () => {
        try {
            const response = await attendanceAPI.getTeamAttendance(selectedDate);
            setTeamAttendance(response.data.attendance || []);
        } catch (error) {
            console.error('Error fetching team attendance:', error);
        }
    };

    const fetchDailyReport = async () => {
        try {
            const response = await attendanceAPI.getDailyReport(selectedDate);
            setDailyReport(response.data || []);
        } catch (error) {
            console.error('Error fetching daily report:', error);
            toast.error('Failed to fetch daily report');
        }
    };

    const handleCheckIn = async () => {
        try {
            await attendanceAPI.checkIn({ location: 'Office' });
            toast.success('Checked in successfully!');
            fetchTodayStatus();
        } catch (error) {
            toast.error(error.response?.data?.error || error.message || 'An error occurred');
        }
    };

    const handleCheckOut = async () => {
        try {
            await attendanceAPI.checkOut({ location: 'Office' });
            toast.success('Checked out successfully!');
            fetchTodayStatus();
        } catch (error) {
            toast.error(error.response?.data?.error || error.message || 'An error occurred');
        }
    };

    const formatTime = (time) => {
        if (!time) return 'N/A';
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatWorkingHours = (minutes) => {
        if (!minutes) return '0h 0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="attendance-page">
            <BackButton to="/dashboard" label="Back to Dashboard" />
            <h1>🕐 Attendance</h1>

            {activeTab === 'today' && (
                <div className="today-section">
                    <AnimatedClock
                        isCheckedIn={todayStatus?.checkedIn && !todayStatus?.checkOutTime}
                        onCheckIn={handleCheckIn}
                        onCheckOut={handleCheckOut}
                        loading={loading}
                        checkInTime={todayStatus?.checkInTime}
                        completed={todayStatus?.checkedIn && !!todayStatus?.checkOutTime}
                    />

                    {todayStatus?.checkedIn && (
                        <div className="status-details-card">
                            <h3>Today's Details</h3>
                            <div className="status-grid">
                                <div className="status-item">
                                    <span className="label">Check-in Time:</span>
                                    <span className="value">{formatTime(todayStatus.checkInTime)}</span>
                                </div>
                                {todayStatus.checkOutTime && (
                                    <div className="status-item">
                                        <span className="label">Check-out Time:</span>
                                        <span className="value">{formatTime(todayStatus.checkOutTime)}</span>
                                    </div>
                                )}
                                <div className="status-item">
                                    <span className="label">Working Time:</span>
                                    <span className="value highlight">{formatWorkingHours(todayStatus.workingMinutes)}</span>
                                </div>
                                {todayStatus.checkOutTime && (
                                    <div className="completion-badge">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                            <path d="M22 4L12 14.01l-3-3" />
                                        </svg>
                                        <span>Completed for today</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="tabs">
                <button
                    className={activeTab === 'today' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('today')}
                >
                    Today
                </button>
                <button
                    className={activeTab === 'my' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('my')}
                >
                    My Attendance
                </button>
                {canViewTeam && (
                    <button
                        className={activeTab === 'team' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('team')}
                    >
                        Team Attendance
                    </button>
                )}
                {canViewReport && (
                    <button
                        className={activeTab === 'daily' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('daily')}
                    >
                        Daily Status (Full)
                    </button>
                )}
            </div>

            {activeTab === 'my' && (
                <div className="attendance-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Check-in</th>
                                <th>Check-out</th>
                                <th>Working Hours</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myAttendance.map((record) => (
                                <tr key={record.id}>
                                    <td>{record.date}</td>
                                    <td>{formatTime(record.checkInTime)}</td>
                                    <td>{formatTime(record.checkOutTime)}</td>
                                    <td>{formatWorkingHours(record.workingMinutes)}</td>
                                    <td>
                                        <span className={`status-badge ${record.status.toLowerCase()}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {myAttendance.length === 0 && (
                        <div className="no-data">No attendance records found</div>
                    )}
                </div>
            )}

            {activeTab === 'team' && canViewTeam && (
                <>
                    <div className="date-filter">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <div className="attendance-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Working Hours</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamAttendance.map((record) => (
                                    <tr key={record.id}>
                                        <td>{record.employee?.firstName} {record.employee?.lastName}</td>
                                        <td>{formatTime(record.checkInTime)}</td>
                                        <td>{formatTime(record.checkOutTime)}</td>
                                        <td>{formatWorkingHours(record.workingMinutes)}</td>
                                        <td>
                                            <span className={`status-badge ${record.status.toLowerCase()}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {teamAttendance.length === 0 && (
                            <div className="no-data">No attendance records for {selectedDate}</div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'daily' && canViewReport && (
                <>
                    <div className="report-header">
                        <h2>Daily Attendance Status</h2>
                        <div className="date-filter">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="attendance-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Name</th>
                                    <th>Dept</th>
                                    <th>Role</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Work Hrs</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyReport.map((record) => (
                                    <tr key={record.id}>
                                        <td>{record.employeeCode || record.employeeId}</td>
                                        <td>{record.fullName}</td>
                                        <td>{record.department}</td>
                                        <td>{record.designation}</td>
                                        <td>{formatTime(record.checkInTime)}</td>
                                        <td>{formatTime(record.checkOutTime)}</td>
                                        <td>{record.workingHours !== '-' ? record.workingHours : ''}</td>
                                        <td>
                                            <span className={`status-badge ${record.status.toLowerCase()}`}>
                                                {record.status === 'ON_LEAVE' ? `Leave: ${record.leaveType || ''}` : record.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {dailyReport.length === 0 && (
                            <div className="no-data">No records found for {selectedDate}</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Attendance;
