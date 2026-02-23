import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import BackButton from '../components/BackButton';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('employees');

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await dashboardAPI.getTeamAnalytics();
            setAnalytics(res.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="analytics-loading">Loading Analytics...</div>;
    }

    if (!analytics || analytics.error) {
        return (
            <div className="analytics-error">
                <BackButton />
                <h2>Error Loading Analytics</h2>
                <p>{analytics?.error || 'Could not fetch data.'}</p>
            </div>
        );
    }

    const {
        totalEmployees,
        attendanceCount,
        leavesTaken,
        allocatedResource,
        benchResource,
        projectCount,
        attendanceRate,
        employeeDetails = [],
        todayAttendanceDetails = [],
        monthlyLeaveDetails = [],
        projectDetails = []
    } = analytics;

    // Charts Data
    const resourceDistributionData = [
        { name: 'Allocated', value: allocatedResource },
        { name: 'On Bench', value: benchResource }
    ];

    const teamOverviewData = [
        { name: 'Total Employees', count: totalEmployees },
        { name: 'Present Today', count: attendanceCount },
        { name: 'Leaves Taken (Month)', count: leavesTaken }
    ];

    return (
        <div className="analytics-dashboard">
            <header className="analytics-header">
                <div className="header-left">
                    <BackButton />
                    <h1>Team Analytics Dashboard</h1>
                </div>
            </header>

            <div className="analytics-content">
                {/* Top Metrics Row */}
                <div className="metrics-grid">
                    <div className="metric-card glass-card">
                        <div className="metric-icon primary">👥</div>
                        <div className="metric-info">
                            <h3>Total Employees</h3>
                            <p>{totalEmployees}</p>
                        </div>
                    </div>
                    <div className="metric-card glass-card">
                        <div className="metric-icon success">✅</div>
                        <div className="metric-info">
                            <h3>Today's Attendance</h3>
                            <p>{attendanceCount} ({attendanceRate}%)</p>
                        </div>
                    </div>
                    <div className="metric-card glass-card">
                        <div className="metric-icon warning">📉</div>
                        <div className="metric-info">
                            <h3>Leaves (This Month)</h3>
                            <p>{leavesTaken}</p>
                        </div>
                    </div>
                    <div className="metric-card glass-card">
                        <div className="metric-icon info">📁</div>
                        <div className="metric-info">
                            <h3>Project Count</h3>
                            <p>{projectCount}</p>
                        </div>
                    </div>
                </div>

                {/* Charts Area */}
                <div className="charts-grid">
                    <div className="chart-container glass-card">
                        <h3>Resource Allocation (Bench vs Allocated)</h3>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={resourceDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {resourceDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-container glass-card">
                        <h3>Team Overview</h3>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={teamOverviewData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="name" stroke="#ccc" />
                                    <YAxis stroke="#ccc" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(20,20,20,0.8)', borderColor: '#444' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="count" fill="#8884d8" radius={[8, 8, 0, 0]}>
                                        {teamOverviewData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Drill Down Details */}
                <div className="drill-down-section glass-card">
                    <div className="tabs-header">
                        <button className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>Employees List</button>
                        <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>Today's Attendance</button>
                        <button className={`tab-btn ${activeTab === 'leaves' ? 'active' : ''}`} onClick={() => setActiveTab('leaves')}>Monthly Leaves</button>
                        <button className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>Projects Mapping</button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'employees' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Department</th>
                                            <th>Designation</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employeeDetails.length > 0 ? employeeDetails.map((emp, i) => (
                                            <tr key={i}>
                                                <td>{emp.employeeId}</td>
                                                <td>{emp.name}</td>
                                                <td>{emp.department}</td>
                                                <td>{emp.designation || 'N/A'}</td>
                                                <td><span className={`status-badge ${emp.status.toLowerCase()}`}>{emp.status}</span></td>
                                            </tr>
                                        )) : <tr><td colSpan="5" className="empty-row">No Employee Data</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'attendance' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Check-In</th>
                                            <th>Check-Out</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todayAttendanceDetails.length > 0 ? todayAttendanceDetails.map((att, i) => (
                                            <tr key={i}>
                                                <td>{att.employeeName} ({att.employeeId})</td>
                                                <td>{att.checkInTime}</td>
                                                <td>{att.checkOutTime}</td>
                                                <td><span className={`status-badge ${att.status.toLowerCase()}`}>{att.status}</span></td>
                                            </tr>
                                        )) : <tr><td colSpan="4" className="empty-row">No Attendance Data For Today</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'leaves' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Leave Type</th>
                                            <th>Start Date</th>
                                            <th>End Date</th>
                                            <th>Days</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlyLeaveDetails.length > 0 ? monthlyLeaveDetails.map((lv, i) => (
                                            <tr key={i}>
                                                <td>{lv.employeeName} ({lv.employeeId})</td>
                                                <td>{lv.leaveType}</td>
                                                <td>{lv.startDate}</td>
                                                <td>{lv.endDate}</td>
                                                <td>{lv.days}</td>
                                            </tr>
                                        )) : <tr><td colSpan="5" className="empty-row">No Leaves Taken This Month</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'projects' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Project ID</th>
                                            <th>Name</th>
                                            <th>Deadline</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {projectDetails.length > 0 ? projectDetails.map((proj, i) => (
                                            <tr key={i}>
                                                <td>{proj.id}</td>
                                                <td>{proj.name}</td>
                                                <td>{proj.deadline}</td>
                                                <td><span className={`status-badge ${proj.status.replace(' ', '-').toLowerCase()}`}>{proj.status}</span></td>
                                            </tr>
                                        )) : <tr><td colSpan="4" className="empty-row">No Projects Found</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AnalyticsDashboard;
