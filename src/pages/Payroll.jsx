import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { payrollAPI, salaryComponentAPI, employeeAPI } from '../services/api';
import BackButton from '../components/BackButton';
import './Payroll.css';

// ---------- helpers ----------
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const getMonthName = (m) => MONTH_NAMES[m - 1] ?? '';

const fmt = (n) => (typeof n === 'number' ? n.toFixed(2) : '0.00');

const APPROVAL_LABELS = {
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
};

const APPROVAL_CSS = {
    PENDING_APPROVAL: 'warn',
    APPROVED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'muted',
};

// ---------- default company settings ----------
const DEFAULT_COMPANY = {
    name: 'Karmika Technologies Pvt. Ltd.',
    address: '123, Business Park, Bengaluru – 560001',
    cin: '',
    gstin: '',
};

const loadCompanySettings = () => {
    try {
        const s = localStorage.getItem('payroll_company_settings');
        return s ? { ...DEFAULT_COMPANY, ...JSON.parse(s) } : { ...DEFAULT_COMPANY };
    } catch { return { ...DEFAULT_COMPANY }; }
};
const saveCompanySettings = (s) =>
    localStorage.setItem('payroll_company_settings', JSON.stringify(s));

// ============================================================
const Payroll = () => {
    const { user } = useAuth();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState('slips');
    const [loading, setLoading] = useState(false);

    // roles
    const isAdminOrHR = ['ADMIN', 'HR'].includes(user?.role);
    const isFinanceOrAdmin = ['ADMIN', 'FINANCE'].includes(user?.role);
    const canViewAllSlips = ['ADMIN', 'HR', 'FINANCE'].includes(user?.role);

    // ---- Company Settings ----
    const [companySettings, setCompanySettings] = useState(loadCompanySettings);
    const [editingCompany, setEditingCompany] = useState(false);
    const [companyDraft, setCompanyDraft] = useState({ ...companySettings });

    const handleSaveCompany = () => {
        saveCompanySettings(companyDraft);
        setCompanySettings({ ...companyDraft });
        setEditingCompany(false);
        toast.success('Company settings saved');
    };

    // ---- Salary Components ----
    const [components, setComponents] = useState([]);
    const [showComponentModal, setShowComponentModal] = useState(false);
    const [componentForm, setComponentForm] = useState({
        code: '', name: '', type: 'EARNING', calculationType: 'FIXED',
        defaultPercentage: 0, isActive: true, isMandatory: false, description: ''
    });

    // ---- Salary Slips ----
    const [salarySlips, setSalarySlips] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [showSlipModal, setShowSlipModal] = useState(false);

    // Approval/Reject modals
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [approveRemarks, setApproveRemarks] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [actionSlipId, setActionSlipId] = useState(null);

    // ---- Employee Salary Structure ----
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeSalaryStructure, setEmployeeSalaryStructure] = useState([]);

    // ---- Tax Calculator ----
    const [taxData, setTaxData] = useState({
        annualIncome: '', regime: 'NEW',
        exemptions: { section80C: '', section80D: '', hra: '', other: '' },
        result: null
    });

    // ============================================================
    // Fetch
    // ============================================================
    const fetchComponents = useCallback(async () => {
        try {
            const res = await salaryComponentAPI.getAll();
            setComponents(res.data);
        } catch { toast.error('Failed to fetch salary components'); }
    }, []);

    const fetchSalarySlips = useCallback(async () => {
        try {
            setLoading(true);
            const res = await payrollAPI.getSalarySlips(selectedMonth, selectedYear);
            setSalarySlips(res.data.slips || []);
        } catch { toast.error('Failed to fetch salary slips'); }
        finally { setLoading(false); }
    }, [selectedMonth, selectedYear]);

    const fetchMySalarySlips = useCallback(async () => {
        try {
            setLoading(true);
            const res = await payrollAPI.getMySalarySlips();
            setSalarySlips(res.data.slips || []);
        } catch { toast.error('Failed to fetch salary slips'); }
        finally { setLoading(false); }
    }, []);

    const fetchEmployees = useCallback(async () => {
        try {
            const res = await employeeAPI.getAll();
            setEmployees(res.data);
        } catch { toast.error('Failed to fetch employees'); }
    }, []);

    useEffect(() => {
        if (activeTab === 'components' && isAdminOrHR) fetchComponents();
        else if (activeTab === 'slips') {
            if (canViewAllSlips) fetchSalarySlips();
            else fetchMySalarySlips();
        }
        else if (activeTab === 'structure' && isAdminOrHR) {
            fetchEmployees();
            fetchComponents();
        }
    }, [activeTab, selectedMonth, selectedYear]);

    // ============================================================
    // Salary Structure
    // ============================================================
    const fetchEmployeeStructure = async (employeeId) => {
        try {
            setLoading(true);
            const res = await payrollAPI.getEmployeeSalaryStructure(employeeId);
            // Backend returns flat DTOs: { id, componentId, componentCode, componentName, componentType, calculationType, defaultPercentage, amount, isActive }
            const savedStructures = res.data.structures || [];

            // Merge all components from the components list with any saved amounts
            const merged = components.map(comp => {
                const existing = savedStructures.find(s => String(s.componentId) === String(comp.id));
                return {
                    componentId: comp.id,
                    componentName: comp.name,
                    componentCode: comp.code,
                    componentType: comp.type,           // 'EARNING' | 'DEDUCTION'
                    calculationType: comp.calculationType,
                    defaultPercentage: comp.defaultPercentage || 0,
                    amount: existing ? existing.amount : 0,
                    isEnabled: !!existing,
                    id: existing ? existing.id : null,
                };
            });
            setEmployeeSalaryStructure(merged);
        } catch { toast.error('Failed to fetch salary structure'); }
        finally { setLoading(false); }
    };

    const handleEmployeeSelect = (empId) => {
        const emp = employees.find(e => e.id === parseInt(empId));
        setSelectedEmployee(emp || null);
        if (emp) fetchEmployeeStructure(emp.id);
        else setEmployeeSalaryStructure([]);
    };

    const handleStructureChange = (componentId, field, value) =>
        setEmployeeSalaryStructure(prev =>
            prev.map(item => item.componentId === componentId ? { ...item, [field]: value } : item)
        );

    const getBasicAmount = () => {
        const b = employeeSalaryStructure.find(i => i.componentCode === 'BASIC');
        return b ? parseFloat(b.amount || 0) : 0;
    };

    const calcDisplayAmount = (item, basicAmount, totalEarnings) => {
        if (!item.isEnabled) return 0;
        const compDef = components.find(c => c.id === item.componentId);
        if (!compDef || item.calculationType === 'FIXED') return parseFloat(item.amount || 0);
        if (item.calculationType === 'PERCENTAGE_OF_BASIC') return (basicAmount * compDef.defaultPercentage) / 100;
        if (item.calculationType === 'PERCENTAGE_OF_GROSS') return (totalEarnings * compDef.defaultPercentage) / 100;
        return parseFloat(item.amount || 0);
    };

    const calcTotals = () => {
        const basic = getBasicAmount();
        const earnings = employeeSalaryStructure
            .filter(i => i.componentType === 'EARNING' && i.isEnabled)
            .reduce((sum, i) => sum + calcDisplayAmount(i, basic, 0), 0);
        const deductions = employeeSalaryStructure
            .filter(i => i.componentType === 'DEDUCTION' && i.isEnabled)
            .reduce((sum, i) => sum + calcDisplayAmount(i, basic, earnings), 0);
        return { earnings, deductions, net: earnings - deductions };
    };

    const handleSaveStructure = async () => {
        if (!selectedEmployee) return;
        try {
            setLoading(true);
            const basicAmount = getBasicAmount();

            // First pass: calculate earnings total for PERCENTAGE_OF_GROSS deductions
            let grossForCalc = 0;
            employeeSalaryStructure.forEach(item => {
                if (item.isEnabled && item.componentType === 'EARNING') {
                    const compDef = components.find(c => c.id === item.componentId);
                    let amt = parseFloat(item.amount || 0);
                    if (item.calculationType === 'PERCENTAGE_OF_BASIC' && compDef && basicAmount > 0)
                        amt = (basicAmount * compDef.defaultPercentage) / 100;
                    grossForCalc += amt;
                }
            });

            // Build flat payload: only enabled components
            const payload = employeeSalaryStructure
                .filter(item => item.isEnabled)
                .map(item => {
                    const compDef = components.find(c => c.id === item.componentId);
                    let amt = parseFloat(item.amount || 0);
                    if (item.calculationType === 'PERCENTAGE_OF_BASIC' && compDef && basicAmount > 0)
                        amt = (basicAmount * compDef.defaultPercentage) / 100;
                    else if (item.calculationType === 'PERCENTAGE_OF_GROSS' && compDef && grossForCalc > 0)
                        amt = (grossForCalc * compDef.defaultPercentage) / 100;
                    return {
                        componentId: item.componentId,  // flat — matches new backend
                        amount: parseFloat(amt.toFixed(2)),
                        isActive: true,
                    };
                });

            const res = await payrollAPI.setEmployeeSalaryStructure(selectedEmployee.id, payload);
            toast.success(res.data.message || 'Salary structure updated successfully');

            // Refresh UI from the server's saved values (source of truth)
            if (res.data.structures) {
                const saved = res.data.structures;
                const refreshed = components.map(comp => {
                    const existing = saved.find(s => String(s.componentId) === String(comp.id));
                    return {
                        componentId: comp.id,
                        componentName: comp.name,
                        componentCode: comp.code,
                        componentType: comp.type,
                        calculationType: comp.calculationType,
                        defaultPercentage: comp.defaultPercentage || 0,
                        amount: existing ? existing.amount : 0,
                        isEnabled: !!existing,
                        id: existing ? existing.id : null,
                    };
                });
                setEmployeeSalaryStructure(refreshed);
            }
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to save salary structure'); }
        finally { setLoading(false); }
    };

    // ============================================================
    // Components
    // ============================================================
    const handleCreateComponent = async (e) => {
        e.preventDefault();
        try {
            await salaryComponentAPI.create(componentForm);
            toast.success('Component created successfully');
            setShowComponentModal(false);
            setComponentForm({ code: '', name: '', type: 'EARNING', calculationType: 'FIXED', defaultPercentage: 0, isActive: true, isMandatory: false, description: '' });
            fetchComponents();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to create component'); }
    };

    // ============================================================
    // Slip Actions
    // ============================================================
    const handleGenerateBulkSlips = async () => {
        if (!window.confirm(`Generate salary slips for all employees for ${getMonthName(selectedMonth)} ${selectedYear}?`)) return;
        try {
            setLoading(true);
            const res = await payrollAPI.generateBulkSlips({ month: selectedMonth, year: selectedYear });
            toast.success(res.data.message);
            fetchSalarySlips();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to generate slips');
        } finally { setLoading(false); }
    };

    const handleViewSlip = async (slipId) => {
        try {
            const res = await payrollAPI.getSalarySlipById(slipId);
            setSelectedSlip(res.data.slip);
            setShowSlipModal(true);
        } catch { toast.error('Failed to fetch slip details'); }
    };

    const handleRegenerate = async (slipId) => {
        if (!window.confirm('Regenerate this slip with the latest salary structure values? This will recalculate all amounts.')) return;
        try {
            setLoading(true);
            const res = await payrollAPI.regenerateSalarySlip(slipId);
            toast.success(res.data.message || 'Slip regenerated');
            fetchSalarySlips();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to regenerate slip');
        } finally { setLoading(false); }
    };

    // Approve
    const openApproveModal = (slipId) => { setActionSlipId(slipId); setApproveRemarks(''); setShowApproveModal(true); };
    const handleApprove = async () => {
        try {
            await payrollAPI.approveSalarySlip(actionSlipId, approveRemarks);
            toast.success('Salary slip approved');
            setShowApproveModal(false);
            if (showSlipModal) handleViewSlip(actionSlipId);
            canViewAllSlips ? fetchSalarySlips() : fetchMySalarySlips();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to approve'); }
    };

    // Reject
    const openRejectModal = (slipId) => { setActionSlipId(slipId); setRejectReason(''); setShowRejectModal(true); };
    const handleReject = async () => {
        if (!rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
        try {
            await payrollAPI.rejectSalarySlip(actionSlipId, rejectReason);
            toast.success('Salary slip rejected');
            setShowRejectModal(false);
            if (showSlipModal) setShowSlipModal(false);
            canViewAllSlips ? fetchSalarySlips() : fetchMySalarySlips();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to reject'); }
    };

    // ============================================================
    // PDF Print
    // ============================================================
    const handlePrint = (slip) => {
        const earningsRows = Object.entries(slip.earnings || {}).map(([k, v]) =>
            `<tr><td>${k}</td><td style="text-align:right">₹${Number(v).toFixed(2)}</td></tr>`).join('');
        const deductionRows = Object.entries(slip.deductions || {}).map(([k, v]) =>
            `<tr><td>${k}</td><td style="text-align:right">₹${Number(v).toFixed(2)}</td></tr>`).join('');
        const html = `<!DOCTYPE html><html><head><title>Salary Slip – ${slip.monthYear}</title>
<style>
  body{font-family:Arial,sans-serif;padding:30px;color:#222;}
  .header{text-align:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px;}
  .company-name{font-size:22px;font-weight:bold;color:#1a237e;}
  .company-sub{font-size:13px;color:#555;}
  .slip-title{font-size:16px;font-weight:bold;margin-top:8px;color:#333;}
  .approval-badge{display:inline-block;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:bold;
    background:${slip.approvalStatus === 'APPROVED' ? '#d1fae5' : '#fef3c7'};
    color:${slip.approvalStatus === 'APPROVED' ? '#065f46' : '#92400e'};}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}
  .section{border:1px solid #ddd;border-radius:6px;padding:12px;}
  .section h3{margin:0 0 8px;font-size:13px;color:#1a237e;border-bottom:1px solid #ddd;padding-bottom:4px;}
  .section p{margin:4px 0;font-size:13px;}
  table{width:100%;border-collapse:collapse;}
  td{padding:6px 4px;font-size:13px;border-bottom:1px solid #eee;}
  .total td{font-weight:bold;border-top:2px solid #ccc;border-bottom:none;}
  .net-box{text-align:center;background:#ecfdf5;border:2px solid #10b981;border-radius:8px;padding:15px;margin-top:15px;}
  .net-label{font-size:14px;color:#065f46;font-weight:600;}
  .net-amount{font-size:24px;font-weight:900;color:#059669;}
  .footer{margin-top:30px;text-align:center;font-size:11px;color:#888;}
</style></head><body>
<div class="header">
  <div class="company-name">${companySettings.name}</div>
  <div class="company-sub">${companySettings.address}${companySettings.cin ? ' | CIN: ' + companySettings.cin : ''}${companySettings.gstin ? ' | GSTIN: ' + companySettings.gstin : ''}</div>
  <div class="slip-title">SALARY SLIP – ${slip.monthYear?.toUpperCase()}</div>
  <span class="approval-badge">${APPROVAL_LABELS[slip.approvalStatus] || slip.approvalStatus}</span>
</div>
<div class="grid">
  <div class="section">
    <h3>Employee Details</h3>
    <p><b>Name:</b> ${slip.employeeName}</p>
    <p><b>Employee ID:</b> ${slip.employeeCode}</p>
    <p><b>Designation:</b> ${slip.designation || '—'}</p>
    <p><b>Department:</b> ${slip.department || '—'}</p>
  </div>
  <div class="section">
    <h3>Bank Details</h3>
    <p><b>Bank:</b> ${slip.bankName || 'N/A'}</p>
    <p><b>Account No:</b> ${slip.accountNumber || 'N/A'}</p>
    <p><b>IFSC:</b> ${slip.ifscCode || 'N/A'}</p>
  </div>
  <div class="section">
    <h3>Attendance</h3>
    <p><b>Working Days:</b> ${slip.workingDays}</p>
    <p><b>Present:</b> ${slip.presentDays}</p>
    <p><b>Leave:</b> ${slip.leaveDays || 0}</p>
    <p><b>Absent:</b> ${slip.absentDays || 0}</p>
  </div>
  <div class="section">
    <h3>Pay Period</h3>
    <p><b>Month:</b> ${slip.monthYear}</p>
    <p><b>Generated By:</b> ${slip.generatedBy || '—'}</p>
    ${slip.approvedBy ? `<p><b>Approved By:</b> ${slip.approvedBy}</p>` : ''}
  </div>
</div>
<div class="grid">
  <div class="section">
    <h3>Earnings</h3>
    <table>${earningsRows}
    <tr class="total"><td>Gross Salary</td><td style="text-align:right">₹${fmt(slip.grossSalary)}</td></tr>
    </table>
  </div>
  <div class="section">
    <h3>Deductions</h3>
    <table>${deductionRows}
    <tr class="total"><td>Total Deductions</td><td style="text-align:right">₹${fmt(slip.totalDeductions)}</td></tr>
    </table>
  </div>
</div>
<div class="net-box">
  <div class="net-label">Net Salary Payable</div>
  <div class="net-amount">₹${fmt(slip.netSalary)}</div>
</div>
<div class="footer">This is a system-generated salary slip and does not require a signature. | ${companySettings.name}</div>
</body></html>`;
        const w = window.open('', '', 'height=700,width=900');
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
    };

    // ============================================================
    // Tax Calculator
    // ============================================================
    const calculateTax = () => {
        let { annualIncome, regime, exemptions } = taxData;
        annualIncome = parseFloat(annualIncome) || 0;
        const stdDed = regime === 'NEW' ? 75000 : 50000;
        let taxable = annualIncome - stdDed;
        let totalDed = stdDed;
        if (regime === 'OLD') {
            const d80C = Math.min(parseFloat(exemptions.section80C) || 0, 150000);
            const d80D = parseFloat(exemptions.section80D) || 0;
            const hra = parseFloat(exemptions.hra) || 0;
            const other = parseFloat(exemptions.other) || 0;
            const extra = d80C + d80D + hra + other;
            taxable -= extra; totalDed += extra;
        }
        if (taxable < 0) taxable = 0;
        let tax = 0;
        if (regime === 'NEW') {
            if (taxable > 300000) tax += (Math.min(taxable, 700000) - 300000) * 0.05;
            if (taxable > 700000) tax += (Math.min(taxable, 1000000) - 700000) * 0.10;
            if (taxable > 1000000) tax += (Math.min(taxable, 1200000) - 1000000) * 0.15;
            if (taxable > 1200000) tax += (Math.min(taxable, 1500000) - 1200000) * 0.20;
            if (taxable > 1500000) tax += (taxable - 1500000) * 0.30;
            if (taxable <= 700000) tax = 0;
        } else {
            if (taxable <= 500000) { tax = 0; }
            else {
                if (taxable > 250000) tax += (Math.min(taxable, 500000) - 250000) * 0.05;
                if (taxable > 500000) tax += (Math.min(taxable, 1000000) - 500000) * 0.20;
                if (taxable > 1000000) tax += (taxable - 1000000) * 0.30;
            }
        }
        const cess = tax * 0.04;
        setTaxData(prev => ({
            ...prev,
            result: { taxableIncome: taxable, totalDeductions: totalDed, baseTax: tax, cess, totalTax: tax + cess, monthlyTax: (tax + cess) / 12 }
        }));
    };

    // ============================================================
    // Render helpers
    // ============================================================
    const { earnings: totalE, deductions: totalD, net: totalN } = calcTotals();

    // ============================================================
    // JSX
    // ============================================================
    return (
        <div className="payroll-page">
            <BackButton to="/dashboard" label="Back to Dashboard" />
            <h1>💰 Payroll Management</h1>

            <div className="tabs">
                <button className={activeTab === 'slips' ? 'tab active' : 'tab'} onClick={() => setActiveTab('slips')}>Salary Slips</button>
                <button className={activeTab === 'tax' ? 'tab active' : 'tab'} onClick={() => setActiveTab('tax')}>Tax Calculator</button>
                {isAdminOrHR && <>
                    <button className={activeTab === 'components' ? 'tab active' : 'tab'} onClick={() => setActiveTab('components')}>Salary Components</button>
                    <button className={activeTab === 'structure' ? 'tab active' : 'tab'} onClick={() => setActiveTab('structure')}>Salary Structure</button>
                </>}
                {(isAdminOrHR || isFinanceOrAdmin) && (
                    <button className={activeTab === 'settings' ? 'tab active' : 'tab'} onClick={() => setActiveTab('settings')}>⚙️ Settings</button>
                )}
            </div>

            {/* ====== SALARY SLIPS TAB ====== */}
            {activeTab === 'slips' && (
                <div className="slips-section">
                    <div className="section-header">
                        <div className="filters">
                            <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                                {[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - 2 + i; return <option key={y} value={y}>{y}</option>; })}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {isAdminOrHR && (
                                <button className="btn btn-primary" onClick={handleGenerateBulkSlips} disabled={loading}>
                                    📊 Generate Bulk Slips
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? <div className="loading">Loading...</div> : (
                        <div className="slips-table">
                            <table>
                                <thead>
                                    <tr>
                                        {canViewAllSlips && <th>Employee</th>}
                                        <th>Month / Year</th>
                                        <th>Gross Salary</th>
                                        <th>Deductions</th>
                                        <th>Net Salary</th>
                                        <th>Payment</th>
                                        <th>Approval</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salarySlips.map(slip => (
                                        <tr key={slip.id}>
                                            {canViewAllSlips && <td>{slip.employeeName}</td>}
                                            <td>{slip.monthYear}</td>
                                            <td>₹{fmt(slip.grossSalary)}</td>
                                            <td>₹{fmt(slip.totalDeductions)}</td>
                                            <td className="net-salary">₹{fmt(slip.netSalary)}</td>
                                            <td>
                                                <span className={`status-badge ${slip.paymentStatus?.toLowerCase()}`}>
                                                    {slip.paymentStatus}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`approval-badge-sm ${APPROVAL_CSS[slip.approvalStatus]}`}>
                                                    {APPROVAL_LABELS[slip.approvalStatus] || slip.approvalStatus}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn-icon" onClick={() => handleViewSlip(slip.id)} title="View">👁️</button>
                                                <button className="btn-icon" onClick={() => handlePrint(slip)} title="Print">🖨️</button>
                                                {isAdminOrHR && slip.approvalStatus !== 'APPROVED' && (
                                                    <button className="btn-icon" onClick={() => handleRegenerate(slip.id)} title="Refresh values from structure">🔄</button>
                                                )}
                                                {isFinanceOrAdmin && slip.approvalStatus === 'PENDING_APPROVAL' && (
                                                    <>
                                                        <button className="btn-icon approve-icon" onClick={() => openApproveModal(slip.id)} title="Approve">✅</button>
                                                        <button className="btn-icon reject-icon" onClick={() => openRejectModal(slip.id)} title="Reject">❌</button>
                                                    </>
                                                )}
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

            {/* ====== TAX CALCULATOR TAB ====== */}
            {activeTab === 'tax' && (
                <div className="tax-calculator-section">
                    <div className="calculator-container">
                        <div className="calculator-form">
                            <h2>Income Tax Estimator (FY 2024-25)</h2>
                            <div className="form-group">
                                <label>Annual Gross Income (₹)</label>
                                <input type="number" value={taxData.annualIncome} onChange={e => setTaxData({ ...taxData, annualIncome: e.target.value })} placeholder="e.g. 1200000" />
                            </div>
                            <div className="form-group">
                                <label>Tax Regime</label>
                                <div className="regime-toggle">
                                    <button className={`toggle-btn ${taxData.regime === 'NEW' ? 'active' : ''}`} onClick={() => setTaxData({ ...taxData, regime: 'NEW' })}>New Regime</button>
                                    <button className={`toggle-btn ${taxData.regime === 'OLD' ? 'active' : ''}`} onClick={() => setTaxData({ ...taxData, regime: 'OLD' })}>Old Regime</button>
                                </div>
                            </div>
                            {taxData.regime === 'OLD' && (
                                <div className="exemptions-group">
                                    <h3>Exemptions & Deductions</h3>
                                    <div className="input-row">
                                        <div className="form-group"><label>Section 80C (Max 1.5L)</label><input type="number" value={taxData.exemptions.section80C} onChange={e => setTaxData({ ...taxData, exemptions: { ...taxData.exemptions, section80C: e.target.value } })} /></div>
                                        <div className="form-group"><label>Section 80D</label><input type="number" value={taxData.exemptions.section80D} onChange={e => setTaxData({ ...taxData, exemptions: { ...taxData.exemptions, section80D: e.target.value } })} /></div>
                                    </div>
                                    <div className="input-row">
                                        <div className="form-group"><label>HRA Exemption</label><input type="number" value={taxData.exemptions.hra} onChange={e => setTaxData({ ...taxData, exemptions: { ...taxData.exemptions, hra: e.target.value } })} /></div>
                                        <div className="form-group"><label>Other Exemptions</label><input type="number" value={taxData.exemptions.other} onChange={e => setTaxData({ ...taxData, exemptions: { ...taxData.exemptions, other: e.target.value } })} /></div>
                                    </div>
                                </div>
                            )}
                            <button className="btn btn-primary full-width" onClick={calculateTax}>Calculate Tax</button>
                        </div>
                        {taxData.result && (
                            <div className="calculator-result">
                                <h3>Calculation Result</h3>
                                <div className="result-row"><span>Gross Income:</span><span>₹{parseFloat(taxData.annualIncome).toLocaleString()}</span></div>
                                <div className="result-row deduction"><span>Total Deductions:</span><span>- ₹{taxData.result.totalDeductions.toLocaleString()}</span></div>
                                <div className="result-row total"><span>Taxable Income:</span><span>₹{taxData.result.taxableIncome.toLocaleString()}</span></div>
                                <div className="divider"></div>
                                <div className="result-row"><span>Base Tax:</span><span>₹{taxData.result.baseTax.toLocaleString()}</span></div>
                                <div className="result-row"><span>Health & Ed. Cess (4%):</span><span>₹{taxData.result.cess.toLocaleString()}</span></div>
                                <div className="result-row total final"><span>Total Tax Payable:</span><span>₹{taxData.result.totalTax.toLocaleString()}</span></div>
                                <div className="monthly-tax">Monthly Approx Tax: ₹{taxData.result.monthlyTax.toFixed(0)}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ====== SALARY COMPONENTS TAB ====== */}
            {activeTab === 'components' && isAdminOrHR && (
                <div className="components-section">
                    <div className="section-header">
                        <h2>Salary Components</h2>
                        <button className="btn btn-primary" onClick={() => setShowComponentModal(true)}>➕ Add Component</button>
                    </div>
                    <div className="components-grid">
                        {components.map(comp => (
                            <div key={comp.id} className={`component-card ${comp.type?.toLowerCase()}`}>
                                <h3>{comp.name}</h3>
                                <p className="code">Code: {comp.code}</p>
                                <p className="type">{comp.type}</p>
                                {comp.calculationType !== 'FIXED' && (
                                    <p className="calculation">{comp.defaultPercentage}% of {comp.calculationType.replace('PERCENTAGE_OF_', '')}</p>
                                )}
                                <div className="badges">
                                    {comp.isMandatory && <span className="badge mandatory">Mandatory</span>}
                                    <span className={`badge ${comp.isActive ? 'active' : 'inactive'}`}>{comp.isActive ? 'Active' : 'Inactive'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ====== SALARY STRUCTURE TAB ====== */}
            {activeTab === 'structure' && isAdminOrHR && (
                <div className="structure-section">
                    <div className="employee-sidebar">
                        <h3>Select Employee</h3>
                        <div className="employee-list-container">
                            <select className="employee-select-list" size="15" onChange={e => handleEmployeeSelect(e.target.value)}>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="structure-details">
                        {selectedEmployee ? (
                            <>
                                <div className="structure-header">
                                    <div className="emp-info">
                                        <h2>{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                                        <p>{selectedEmployee.designation} | {selectedEmployee.department?.name}</p>
                                    </div>
                                    <button className="btn btn-primary" onClick={handleSaveStructure} disabled={loading}>💾 Save Structure</button>
                                </div>
                                {loading ? <div className="loading">Loading structure...</div> : (
                                    <div className="structure-form">
                                        {['EARNING', 'DEDUCTION'].map(type => {
                                            const basicAmt = getBasicAmount();
                                            const earnTotal = employeeSalaryStructure.filter(i => i.componentType === 'EARNING' && i.isEnabled).reduce((s, i) => s + calcDisplayAmount(i, basicAmt, 0), 0);
                                            return (
                                                <div key={type} className="components-group">
                                                    <h3>{type === 'EARNING' ? 'Earnings' : 'Deductions'}</h3>
                                                    <div className="structure-grid">
                                                        {employeeSalaryStructure.filter(i => i.componentType === type).map(item => {
                                                            const displayAmt = calcDisplayAmount(item, basicAmt, earnTotal);
                                                            return (
                                                                <div key={item.componentId} className={`structure-item ${item.isEnabled ? 'enabled' : 'disabled'}`}>
                                                                    <div className="item-header">
                                                                        <label className="checkbox-container">
                                                                            <input type="checkbox" checked={item.isEnabled} onChange={e => handleStructureChange(item.componentId, 'isEnabled', e.target.checked)} />
                                                                            <span className="item-name">
                                                                                {item.componentName}
                                                                                {item.calculationType !== 'FIXED' && <span className="calc-info"> (Auto)</span>}
                                                                            </span>
                                                                        </label>
                                                                    </div>
                                                                    <div className="item-input">
                                                                        <span className="currency">₹</span>
                                                                        <input
                                                                            type="number"
                                                                            value={item.calculationType === 'FIXED' ? item.amount : displayAmt.toFixed(2)}
                                                                            onChange={e => handleStructureChange(item.componentId, 'amount', e.target.value)}
                                                                            disabled={!item.isEnabled || item.calculationType !== 'FIXED'}
                                                                            placeholder="0.00"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className={`total-earnings ${type === 'DEDUCTION' ? 'deduction-total' : ''}`}>
                                                        {type === 'EARNING' ? `Total Earnings: ₹${totalE.toFixed(2)}` : `Total Deductions: ₹${totalD.toFixed(2)}`}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div style={{ marginTop: 20, padding: 15, background: 'rgba(100,200,100,0.1)', borderRadius: 8, border: '1px solid rgba(100,200,100,0.3)', textAlign: 'center' }}>
                                            <h3 style={{ color: '#10b981', margin: 0 }}>Net Salary Preview: ₹{totalN.toFixed(2)}</h3>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="no-selection"><p>Select an employee from the list to configure their salary structure.</p></div>
                        )}
                    </div>
                </div>
            )}

            {/* ====== SETTINGS TAB ====== */}
            {activeTab === 'settings' && (
                <div className="settings-section">
                    <div className="settings-card">
                        <div className="section-header">
                            <h2>🏢 Company / Pay Slip Settings</h2>
                            {!editingCompany && (
                                <button className="btn btn-primary" onClick={() => { setCompanyDraft({ ...companySettings }); setEditingCompany(true); }}>✏️ Edit</button>
                            )}
                        </div>
                        {editingCompany ? (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Company Name *</label>
                                        <input type="text" value={companyDraft.name} onChange={e => setCompanyDraft({ ...companyDraft, name: e.target.value })} placeholder="e.g. Acme Corp Pvt. Ltd." />
                                    </div>
                                    <div className="form-group">
                                        <label>Address</label>
                                        <input type="text" value={companyDraft.address} onChange={e => setCompanyDraft({ ...companyDraft, address: e.target.value })} placeholder="Full address" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>CIN (optional)</label>
                                        <input type="text" value={companyDraft.cin} onChange={e => setCompanyDraft({ ...companyDraft, cin: e.target.value })} placeholder="Corporate Identity Number" />
                                    </div>
                                    <div className="form-group">
                                        <label>GSTIN (optional)</label>
                                        <input type="text" value={companyDraft.gstin} onChange={e => setCompanyDraft({ ...companyDraft, gstin: e.target.value })} placeholder="GST Number" />
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button className="btn btn-secondary" onClick={() => setEditingCompany(false)}>Cancel</button>
                                    <button className="btn btn-primary" onClick={handleSaveCompany}>💾 Save Settings</button>
                                </div>
                            </>
                        ) : (
                            <div className="settings-preview">
                                <div className="preview-row"><span>Company Name:</span><strong>{companySettings.name}</strong></div>
                                <div className="preview-row"><span>Address:</span><strong>{companySettings.address}</strong></div>
                                {companySettings.cin && <div className="preview-row"><span>CIN:</span><strong>{companySettings.cin}</strong></div>}
                                {companySettings.gstin && <div className="preview-row"><span>GSTIN:</span><strong>{companySettings.gstin}</strong></div>}
                            </div>
                        )}
                    </div>

                    {/* Approval Flow Info */}
                    <div className="settings-card" style={{ marginTop: 20 }}>
                        <h2>📋 Approval Workflow</h2>
                        <div className="workflow-steps">
                            <div className="wf-step"><div className="wf-badge warn">PENDING APPROVAL</div><p>Slip generated by HR/Admin. Awaiting Finance review.</p></div>
                            <div className="wf-arrow">→</div>
                            <div className="wf-step"><div className="wf-badge success">APPROVED</div><p>Approved by Finance or Admin. Payment can be processed.</p></div>
                            <div className="wf-arrow">/</div>
                            <div className="wf-step"><div className="wf-badge danger">REJECTED</div><p>Rejected by Finance. HR must correct and regenerate.</p></div>
                        </div>
                        <div className="workflow-note">
                            <strong>Finance Role:</strong> Users with the <code>FINANCE</code> role can approve or reject salary slips. ADMIN can also perform these actions.
                        </div>
                    </div>
                </div>
            )}

            {/* ====== ADD COMPONENT MODAL ====== */}
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
                                    <input type="text" value={componentForm.code} onChange={e => setComponentForm({ ...componentForm, code: e.target.value.toUpperCase() })} required placeholder="e.g., BASIC, HRA" />
                                </div>
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input type="text" value={componentForm.name} onChange={e => setComponentForm({ ...componentForm, name: e.target.value })} required placeholder="e.g., Basic Salary" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Type *</label>
                                    <select value={componentForm.type} onChange={e => setComponentForm({ ...componentForm, type: e.target.value })}>
                                        <option value="EARNING">Earning</option>
                                        <option value="DEDUCTION">Deduction</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Calculation Type *</label>
                                    <select value={componentForm.calculationType} onChange={e => setComponentForm({ ...componentForm, calculationType: e.target.value })}>
                                        <option value="FIXED">Fixed Amount</option>
                                        <option value="PERCENTAGE_OF_BASIC">% of Basic</option>
                                        <option value="PERCENTAGE_OF_GROSS">% of Gross</option>
                                    </select>
                                </div>
                            </div>
                            {componentForm.calculationType !== 'FIXED' && (
                                <div className="form-group">
                                    <label>Default Percentage</label>
                                    <input type="number" step="0.01" value={componentForm.defaultPercentage} onChange={e => setComponentForm({ ...componentForm, defaultPercentage: parseFloat(e.target.value) })} />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={componentForm.description} onChange={e => setComponentForm({ ...componentForm, description: e.target.value })} rows="2" />
                            </div>
                            <div className="checkbox-group">
                                <label><input type="checkbox" checked={componentForm.isMandatory} onChange={e => setComponentForm({ ...componentForm, isMandatory: e.target.checked })} /> Mandatory</label>
                                <label><input type="checkbox" checked={componentForm.isActive} onChange={e => setComponentForm({ ...componentForm, isActive: e.target.checked })} /> Active</label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowComponentModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Component</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ====== SALARY SLIP DETAIL MODAL ====== */}
            {showSlipModal && selectedSlip && (
                <div className="modal-overlay">
                    <div className="modal-content slip-modal">
                        {/* Slip Header */}
                        <div className="slip-company-header">
                            <div className="slip-company-name">{companySettings.name}</div>
                            <div className="slip-company-sub">{companySettings.address}</div>
                            {(companySettings.cin || companySettings.gstin) && (
                                <div className="slip-company-sub">
                                    {companySettings.cin ? `CIN: ${companySettings.cin}` : ''}
                                    {companySettings.cin && companySettings.gstin ? ' | ' : ''}
                                    {companySettings.gstin ? `GSTIN: ${companySettings.gstin}` : ''}
                                </div>
                            )}
                            <div className="slip-title-bar">SALARY SLIP — {selectedSlip.monthYear?.toUpperCase()}</div>
                            <span className={`approval-badge-lg ${APPROVAL_CSS[selectedSlip.approvalStatus]}`}>
                                {APPROVAL_LABELS[selectedSlip.approvalStatus] || selectedSlip.approvalStatus}
                            </span>
                            <button className="slip-close-btn" onClick={() => setShowSlipModal(false)}>×</button>
                        </div>

                        <div className="slip-details">
                            <div className="slip-section">
                                <h3>Employee Details</h3>
                                <p><strong>Name:</strong> {selectedSlip.employeeName}</p>
                                <p><strong>Employee ID:</strong> {selectedSlip.employeeCode}</p>
                                <p><strong>Designation:</strong> {selectedSlip.designation || '—'}</p>
                                <p><strong>Department:</strong> {selectedSlip.department || '—'}</p>
                            </div>
                            <div className="slip-section">
                                <h3>Bank Details</h3>
                                <p><strong>Bank:</strong> {selectedSlip.bankName || 'N/A'}</p>
                                <p><strong>Account No:</strong> {selectedSlip.accountNumber || 'N/A'}</p>
                                <p><strong>IFSC:</strong> {selectedSlip.ifscCode || 'N/A'}</p>
                            </div>
                            <div className="slip-section">
                                <h3>Attendance</h3>
                                <p><strong>Working Days:</strong> {selectedSlip.workingDays}</p>
                                <p><strong>Present Days:</strong> {selectedSlip.presentDays}</p>
                                <p><strong>Leave Days:</strong> {selectedSlip.leaveDays || 0}</p>
                                <p><strong>Absent Days:</strong> {selectedSlip.absentDays || 0}</p>
                            </div>
                            <div className="slip-section">
                                <h3>Pay Info</h3>
                                <p><strong>Pay Period:</strong> {selectedSlip.monthYear}</p>
                                <p><strong>Generated By:</strong> {selectedSlip.generatedBy || '—'}</p>
                                {selectedSlip.approvedBy && <p><strong>Approved By:</strong> {selectedSlip.approvedBy}</p>}
                                {selectedSlip.approvalRemarks && <p><strong>Remarks:</strong> {selectedSlip.approvalRemarks}</p>}
                                {selectedSlip.rejectionReason && <p><strong>Rejection Reason:</strong> <span style={{ color: '#ef4444' }}>{selectedSlip.rejectionReason}</span></p>}
                            </div>
                            <div className="slip-section">
                                <h3>Earnings</h3>
                                {Object.keys(selectedSlip.earnings || {}).length > 0 ? (
                                    Object.entries(selectedSlip.earnings).map(([k, v]) => (
                                        <div key={k} className="slip-row">
                                            <span>{k}</span><span>₹{fmt(v)}</span>
                                        </div>
                                    ))
                                ) : <p className="no-data-msg">No earnings breakdown available</p>}
                                <div className="slip-row total">
                                    <span>Gross Salary</span><span>₹{fmt(selectedSlip.grossSalary)}</span>
                                </div>
                            </div>
                            <div className="slip-section">
                                <h3>Deductions</h3>
                                {Object.keys(selectedSlip.deductions || {}).length > 0 ? (
                                    Object.entries(selectedSlip.deductions).map(([k, v]) => (
                                        <div key={k} className="slip-row">
                                            <span>{k}</span><span>₹{fmt(v)}</span>
                                        </div>
                                    ))
                                ) : <p className="no-data-msg">No deductions breakdown available</p>}
                                <div className="slip-row total deduction-total">
                                    <span>Total Deductions</span><span>₹{fmt(selectedSlip.totalDeductions)}</span>
                                </div>
                            </div>
                            <div className="slip-section net-section">
                                <h3>Net Salary Payable</h3>
                                <div className="net-amount">₹{fmt(selectedSlip.netSalary)}</div>
                            </div>
                        </div>

                        <div className="modal-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 15 }}>
                            <button className="btn btn-secondary" onClick={() => setShowSlipModal(false)}>Close</button>
                            <button className="btn btn-primary" onClick={() => handlePrint(selectedSlip)}>🖨️ Print Slip</button>
                            {isAdminOrHR && selectedSlip.approvalStatus !== 'APPROVED' && (
                                <button className="btn btn-warning" onClick={() => handleRegenerate(selectedSlip.id)}>🔄 Regenerate</button>
                            )}
                            {isFinanceOrAdmin && selectedSlip.approvalStatus === 'PENDING_APPROVAL' && (
                                <>
                                    <button className="btn btn-success" onClick={() => { setShowSlipModal(false); openApproveModal(selectedSlip.id); }}>✅ Approve</button>
                                    <button className="btn btn-danger" onClick={() => { setShowSlipModal(false); openRejectModal(selectedSlip.id); }}>❌ Reject</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ====== APPROVE MODAL ====== */}
            {showApproveModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h2>✅ Approve Salary Slip</h2>
                            <button className="close-btn" onClick={() => setShowApproveModal(false)}>×</button>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 15 }}>
                            Once approved, this slip will be marked as processed. The employee will be able to view the approved slip.
                        </p>
                        <div className="form-group">
                            <label>Approval Remarks (optional)</label>
                            <textarea value={approveRemarks} onChange={e => setApproveRemarks(e.target.value)} rows="3" placeholder="Add any notes..." />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowApproveModal(false)}>Cancel</button>
                            <button className="btn btn-success" onClick={handleApprove}>Confirm Approval</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== REJECT MODAL ====== */}
            {showRejectModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h2>❌ Reject Salary Slip</h2>
                            <button className="close-btn" onClick={() => setShowRejectModal(false)}>×</button>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 15 }}>
                            Please provide a reason for rejection. HR will need to correct and regenerate the slip.
                        </p>
                        <div className="form-group">
                            <label>Rejection Reason *</label>
                            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows="3" placeholder="e.g. Incorrect basic salary, missing allowances..." />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleReject}>Confirm Rejection</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payroll;
