import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { payrollAPI, salaryComponentAPI, employeeAPI } from '../services/api';
import BackButton from '../components/BackButton';
import './Payroll.css';

const Payroll = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('slips');
    const [loading, setLoading] = useState(false);

    // Salary Components State
    const [components, setComponents] = useState([]);
    const [showComponentModal, setShowComponentModal] = useState(false);
    const [componentForm, setComponentForm] = useState({
        code: '',
        name: '',
        type: 'EARNING',
        calculationType: 'FIXED',
        defaultPercentage: 0,
        isActive: true,
        isMandatory: false,
        description: ''
    });

    // Salary Slips State
    const [salarySlips, setSalarySlips] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [showSlipModal, setShowSlipModal] = useState(false);

    // Employee Salary Structure State
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeSalaryStructure, setEmployeeSalaryStructure] = useState([]);

    const isAdminOrHR = ['ADMIN', 'HR'].includes(user?.role);

    useEffect(() => {
        if (activeTab === 'components' && isAdminOrHR) {
            fetchComponents();
        } else if (activeTab === 'slips') {
            if (isAdminOrHR) {
                fetchSalarySlips();
            } else {
                fetchMySalarySlips();
            }
        } else if (activeTab === 'structure' && isAdminOrHR) {
            fetchEmployees();
        }
    }, [activeTab, selectedMonth, selectedYear]);

    const fetchComponents = async () => {
        try {
            const response = await salaryComponentAPI.getAll();
            setComponents(response.data);
        } catch (error) {
            toast.error('Failed to fetch salary components');
        }
    };

    const fetchSalarySlips = async () => {
        try {
            setLoading(true);
            const response = await payrollAPI.getSalarySlips(selectedMonth, selectedYear);
            setSalarySlips(response.data.slips || []);
        } catch (error) {
            toast.error('Failed to fetch salary slips');
        } finally {
            setLoading(false);
        }
    };

    const fetchMySalarySlips = async () => {
        try {
            setLoading(true);
            const response = await payrollAPI.getMySalarySlips();
            setSalarySlips(response.data.slips || []);
        } catch (error) {
            toast.error('Failed to fetch salary slips');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await employeeAPI.getAll();
            setEmployees(response.data);
        } catch (error) {
            toast.error('Failed to fetch employees');
        }
    };

    const handleCreateComponent = async (e) => {
        e.preventDefault();
        try {
            await salaryComponentAPI.create(componentForm);
            toast.success('Component created successfully');
            setShowComponentModal(false);
            resetComponentForm();
            fetchComponents();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create component');
        }
    };

    const resetComponentForm = () => {
        setComponentForm({
            code: '',
            name: '',
            type: 'EARNING',
            calculationType: 'FIXED',
            defaultPercentage: 0,
            isActive: true,
            isMandatory: false,
            description: ''
        });
    };

    const handleGenerateBulkSlips = async () => {
        if (!window.confirm(`Generate salary slips for all employees for ${getMonthName(selectedMonth)} ${selectedYear}?`)) {
            return;
        }

        try {
            setLoading(true);
            console.log('Generating bulk slips for:', { month: selectedMonth, year: selectedYear });
            const response = await payrollAPI.generateBulkSlips({
                month: selectedMonth,
                year: selectedYear
            });
            console.log('Bulk slip response:', response.data);
            toast.success(response.data.message);
            fetchSalarySlips();
        } catch (error) {
            console.error('Bulk slip generation error:', error);
            console.error('Error response:', error.response);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to generate slips';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleViewSlip = async (slipId) => {
        try {
            const response = await payrollAPI.getSalarySlipById(slipId);
            setSelectedSlip(response.data.slip);
            setShowSlipModal(true);
        } catch (error) {
            toast.error('Failed to fetch slip details');
        }
    };

    const handleDownloadSlip = (slip) => {
        // Generate HTML for salary slip
        const slipHTML = generateSalarySlipHTML(slip);

        // Create a new window and print
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(slipHTML);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const generateSalarySlipHTML = (slip) => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Salary Slip - ${slip.monthYear}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .company-name { font-size: 24px; font-weight: bold; }
                    .slip-title { font-size: 18px; margin-top: 10px; }
                    .section { margin: 20px 0; }
                    .section-title { font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px; }
                    table { width: 100%; border-collapse: collapse; }
                    td { padding: 8px; border-bottom: 1px solid #ddd; }
                    .label { font-weight: bold; width: 40%; }
                    .earnings-table, .deductions-table { margin: 10px 0; }
                    .total-row { font-weight: bold; background: #f0f0f0; }
                    .net-salary { font-size: 18px; font-weight: bold; color: green; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">Karmika HRMS</div>
                    <div class="slip-title">Salary Slip for ${slip.monthYear}</div>
                </div>

                <div class="section">
                    <div class="section-title">Employee Details</div>
                    <table>
                        <tr><td class="label">Employee ID:</td><td>${slip.employeeCode}</td></tr>
                        <tr><td class="label">Name:</td><td>${slip.employeeName}</td></tr>
                        <tr><td class="label">Designation:</td><td>${slip.designation}</td></tr>
                        <tr><td class="label">Department:</td><td>${slip.department}</td></tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Bank Details</div>
                    <table>
                        <tr><td class="label">Bank Name:</td><td>${slip.bankName || 'N/A'}</td></tr>
                        <tr><td class="label">Account Number:</td><td>${slip.accountNumber || 'N/A'}</td></tr>
                        <tr><td class="label">IFSC Code:</td><td>${slip.ifscCode || 'N/A'}</td></tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Attendance Summary</div>
                    <table>
                        <tr><td class="label">Working Days:</td><td>${slip.workingDays}</td></tr>
                        <tr><td class="label">Present Days:</td><td>${slip.presentDays}</td></tr>
                        <tr><td class="label">Leave Days:</td><td>${slip.leaveDays || 0}</td></tr>
                        <tr><td class="label">Absent Days:</td><td>${slip.absentDays || 0}</td></tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Earnings</div>
                    <table class="earnings-table">
                        ${Object.entries(slip.earnings || {}).map(([key, value]) =>
            `<tr><td class="label">${key}:</td><td>₹${value.toFixed(2)}</td></tr>`
        ).join('')}
                        <tr class="total-row"><td class="label">Gross Salary:</td><td>₹${slip.grossSalary.toFixed(2)}</td></tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Deductions</div>
                    <table class="deductions-table">
                        ${Object.entries(slip.deductions || {}).map(([key, value]) =>
            `<tr><td class="label">${key}:</td><td>₹${value.toFixed(2)}</td></tr>`
        ).join('')}
                        <tr class="total-row"><td class="label">Total Deductions:</td><td>₹${slip.totalDeductions.toFixed(2)}</td></tr>
                    </table>
                </div>

                <div class="section">
                    <table>
                        <tr class="total-row net-salary">
                            <td class="label">Net Salary:</td>
                            <td>₹${slip.netSalary.toFixed(2)}</td>
                        </tr>
                    </table>
                </div>

                <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
                    This is a computer-generated salary slip and does not require a signature.
                </div>
            </body>
            </html>
        `;
    };

    const getMonthName = (month) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1];
    };

    return (
        <div className="payroll-page">
            <BackButton to="/dashboard" label="Back to Dashboard" />
            <h1>💰 Payroll Management</h1>

            <div className="tabs">
                <button
                    className={activeTab === 'slips' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('slips')}
                >
                    Salary Slips
                </button>
                {isAdminOrHR && (
                    <>
                        <button
                            className={activeTab === 'components' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('components')}
                        >
                            Salary Components
                        </button>
                        <button
                            className={activeTab === 'structure' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('structure')}
                        >
                            Employee Salary Structure
                        </button>
                    </>
                )}
            </div>

            {/* Salary Slips Tab */}
            {activeTab === 'slips' && (
                <div className="slips-section">
                    <div className="section-header">
                        <div className="filters">
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                                {[...Array(12)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                                ))}
                            </select>
                            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                                {[...Array(5)].map((_, i) => {
                                    const year = new Date().getFullYear() - 2 + i;
                                    return <option key={year} value={year}>{year}</option>;
                                })}
                            </select>
                        </div>
                        {isAdminOrHR && (
                            <button className="btn btn-primary" onClick={handleGenerateBulkSlips} disabled={loading}>
                                📊 Generate Bulk Slips
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : (
                        <div className="slips-table">
                            <table>
                                <thead>
                                    <tr>
                                        {isAdminOrHR && <th>Employee</th>}
                                        <th>Month/Year</th>
                                        <th>Gross Salary</th>
                                        <th>Deductions</th>
                                        <th>Net Salary</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salarySlips.map((slip) => (
                                        <tr key={slip.id}>
                                            {isAdminOrHR && <td>{slip.employeeName}</td>}
                                            <td>{slip.monthYear}</td>
                                            <td>₹{slip.grossSalary.toFixed(2)}</td>
                                            <td>₹{slip.totalDeductions.toFixed(2)}</td>
                                            <td className="net-salary">₹{slip.netSalary.toFixed(2)}</td>
                                            <td>
                                                <span className={`status-badge ${slip.paymentStatus.toLowerCase()}`}>
                                                    {slip.paymentStatus}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn-icon" onClick={() => handleViewSlip(slip.id)} title="View">
                                                    👁️
                                                </button>
                                                <button className="btn-icon" onClick={() => handleDownloadSlip(slip)} title="Download">
                                                    📥
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {salarySlips.length === 0 && (
                                <div className="no-data">No salary slips found for {getMonthName(selectedMonth)} {selectedYear}</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Salary Components Tab */}
            {activeTab === 'components' && isAdminOrHR && (
                <div className="components-section">
                    <div className="section-header">
                        <h2>Salary Components</h2>
                        <button className="btn btn-primary" onClick={() => setShowComponentModal(true)}>
                            ➕ Add Component
                        </button>
                    </div>

                    <div className="components-grid">
                        {components.map((comp) => (
                            <div key={comp.id} className={`component-card ${comp.type.toLowerCase()}`}>
                                <h3>{comp.name}</h3>
                                <p className="code">Code: {comp.code}</p>
                                <p className="type">{comp.type}</p>
                                {comp.calculationType !== 'FIXED' && (
                                    <p className="calculation">{comp.defaultPercentage}% of {comp.calculationType.replace('PERCENTAGE_OF_', '')}</p>
                                )}
                                <div className="badges">
                                    {comp.isMandatory && <span className="badge mandatory">Mandatory</span>}
                                    {comp.isActive ? <span className="badge active">Active</span> : <span className="badge inactive">Inactive</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Component Modal */}
            {showComponentModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Add Salary Component</h2>
                            <button className="close-btn" onClick={() => setShowComponentModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateComponent}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Code *</label>
                                    <input
                                        type="text"
                                        value={componentForm.code}
                                        onChange={(e) => setComponentForm({ ...componentForm, code: e.target.value.toUpperCase() })}
                                        required
                                        placeholder="e.g., BASIC, HRA"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input
                                        type="text"
                                        value={componentForm.name}
                                        onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
                                        required
                                        placeholder="e.g., Basic Salary"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Type *</label>
                                    <select
                                        value={componentForm.type}
                                        onChange={(e) => setComponentForm({ ...componentForm, type: e.target.value })}
                                    >
                                        <option value="EARNING">Earning</option>
                                        <option value="DEDUCTION">Deduction</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Calculation Type *</label>
                                    <select
                                        value={componentForm.calculationType}
                                        onChange={(e) => setComponentForm({ ...componentForm, calculationType: e.target.value })}
                                    >
                                        <option value="FIXED">Fixed Amount</option>
                                        <option value="PERCENTAGE_OF_BASIC">% of Basic</option>
                                        <option value="PERCENTAGE_OF_GROSS">% of Gross</option>
                                    </select>
                                </div>
                            </div>

                            {componentForm.calculationType !== 'FIXED' && (
                                <div className="form-group">
                                    <label>Default Percentage</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={componentForm.defaultPercentage}
                                        onChange={(e) => setComponentForm({ ...componentForm, defaultPercentage: parseFloat(e.target.value) })}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={componentForm.description}
                                    onChange={(e) => setComponentForm({ ...componentForm, description: e.target.value })}
                                    rows="3"
                                />
                            </div>

                            <div className="checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={componentForm.isMandatory}
                                        onChange={(e) => setComponentForm({ ...componentForm, isMandatory: e.target.checked })}
                                    />
                                    Mandatory Component
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={componentForm.isActive}
                                        onChange={(e) => setComponentForm({ ...componentForm, isActive: e.target.checked })}
                                    />
                                    Active
                                </label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowComponentModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Component
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Salary Slip Detail Modal */}
            {showSlipModal && selectedSlip && (
                <div className="modal-overlay">
                    <div className="modal-content slip-modal">
                        <div className="modal-header">
                            <h2>Salary Slip - {selectedSlip.monthYear}</h2>
                            <button className="close-btn" onClick={() => setShowSlipModal(false)}>×</button>
                        </div>
                        <div className="slip-details">
                            <div className="slip-section">
                                <h3>Employee Details</h3>
                                <p><strong>Name:</strong> {selectedSlip.employeeName}</p>
                                <p><strong>Employee ID:</strong> {selectedSlip.employeeCode}</p>
                                <p><strong>Designation:</strong> {selectedSlip.designation}</p>
                                <p><strong>Department:</strong> {selectedSlip.department}</p>
                            </div>

                            <div className="slip-section">
                                <h3>Bank Details</h3>
                                <p><strong>Bank:</strong> {selectedSlip.bankName || 'N/A'}</p>
                                <p><strong>Account:</strong> {selectedSlip.accountNumber || 'N/A'}</p>
                                <p><strong>IFSC:</strong> {selectedSlip.ifscCode || 'N/A'}</p>
                            </div>

                            <div className="slip-section">
                                <h3>Attendance</h3>
                                <p><strong>Working Days:</strong> {selectedSlip.workingDays}</p>
                                <p><strong>Present:</strong> {selectedSlip.presentDays}</p>
                                <p><strong>Leave:</strong> {selectedSlip.leaveDays || 0}</p>
                                <p><strong>Absent:</strong> {selectedSlip.absentDays || 0}</p>
                            </div>

                            <div className="slip-section">
                                <h3>Earnings</h3>
                                {Object.entries(selectedSlip.earnings || {}).map(([key, value]) => (
                                    <p key={key}><strong>{key}:</strong> ₹{value.toFixed(2)}</p>
                                ))}
                                <p className="total"><strong>Gross Salary:</strong> ₹{selectedSlip.grossSalary.toFixed(2)}</p>
                            </div>

                            <div className="slip-section">
                                <h3>Deductions</h3>
                                {Object.entries(selectedSlip.deductions || {}).map(([key, value]) => (
                                    <p key={key}><strong>{key}:</strong> ₹{value.toFixed(2)}</p>
                                ))}
                                <p className="total"><strong>Total Deductions:</strong> ₹{selectedSlip.totalDeductions.toFixed(2)}</p>
                            </div>

                            <div className="slip-section net-section">
                                <h3>Net Salary</h3>
                                <p className="net-amount">₹{selectedSlip.netSalary.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowSlipModal(false)}>Close</button>
                            <button className="btn btn-primary" onClick={() => handleDownloadSlip(selectedSlip)}>
                                📥 Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payroll;
