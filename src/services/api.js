import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    test: () => api.get('/auth/test'),
    changePassword: (data) => api.post('/auth/change-password', data),
};

// Employee API
export const employeeAPI = {
    getAll: () => api.get('/employees/list'),
    getById: (id) => api.get(`/employees/view/${id}`),
    create: (data) => api.post('/employees/create', data),
    update: (id, data) => api.put(`/employees/update/${id}`, data),
    search: (query) => api.get(`/employees/search?query=${query}`),
    getByDepartment: (deptId) => api.get(`/employees/department/${deptId}`),
    getCount: () => api.get('/employees/count'),
    deactivate: (id) => api.put(`/employees/deactivate/${id}`),
    activate: (id) => api.put(`/employees/activate/${id}`),
    getMe: () => api.get('/employees/me'),
    updateProfilePhoto: (photoUrl) => api.put('/employees/profile-photo', { photoUrl }),
    getMyTeam: () => api.get('/employees/my-team'),
};

// Leave API
export const leaveAPI = {
    apply: (data) => api.post('/leave/apply', data),
    getMyLeaves: () => api.get('/leave/my-leaves'),
    cancel: (id) => api.delete(`/leave/cancel/${id}`),
    getAll: () => api.get('/leave/all'),
    getPending: () => api.get('/leave/pending'),
    getTeamLeaves: () => api.get('/leave/team'),
    approve: (id, data) => api.post(`/leave/approve/${id}`, data),
    reject: (id, data) => api.post(`/leave/reject/${id}`, data),
    getStats: () => api.get('/leave/stats'),
};

// Attendance API
export const attendanceAPI = {
    checkIn: (data) => api.post('/attendance/checkin', data),
    checkOut: (data) => api.post('/attendance/checkout', data),
    getMyAttendance: (from, to) => {
        let url = '/attendance/my-attendance';
        if (from && to) {
            url += `?from=${from}&to=${to}`;
        }
        return api.get(url);
    },
    getTeamAttendance: (date) => {
        let url = '/attendance/team';
        if (date) {
            url += `?date=${date}`;
        }
        return api.get(url);
    },
    getAll: (date) => {
        let url = '/attendance/all';
        if (date) {
            url += `?date=${date}`;
        }
        return api.get(url);
    },
    getSummary: (date) => {
        let url = '/attendance/summary';
        if (date) {
            url += `?date=${date}`;
        }
        return api.get(url);
    },
    getTodayStatus: () => api.get('/attendance/today-status'),
    getDailyReport: (date) => {
        let url = '/attendance/daily-report';
        if (date) {
            url += `?date=${date}`;
        }
        return api.get(url);
    },
};

// Department API
export const departmentAPI = {
    getAll: (activeOnly = false) => api.get(`/departments/list?activeOnly=${activeOnly}`),
    getById: (id) => api.get(`/departments/${id}`),
    create: (data) => api.post('/departments/create', data),
    update: (id, data) => api.put(`/departments/update/${id}`, data),
    delete: (id) => api.delete(`/departments/delete/${id}`),
    getStats: () => api.get('/departments/stats'),
};

// Dashboard API
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    getHRAnalytics: () => api.get('/dashboard/hr-analytics'),
    getSummary: () => api.get('/dashboard/summary'),
};

// Notification API
export const notificationAPI = {
    getAll: () => api.get('/notifications'),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`),
    createAnnouncement: (data) => api.post('/notifications/announce', data),
};

// Task API
export const taskAPI = {
    create: (data) => api.post('/tasks/create', data),
    getMyTasks: () => api.get('/tasks/my-tasks'),
    getAssignedByMe: () => api.get('/tasks/assigned-by-me'),
    getAll: () => api.get('/tasks/all'),
    updateStatus: (id, data) => api.put(`/tasks/${id}/status`, data),
    update: (id, data) => api.put(`/tasks/${id}`, data),
    delete: (id) => api.delete(`/tasks/${id}`),
};

// Team Management (for HR to assign employees to managers)
export const teamAPI = {
    assignToManager: (employeeId, managerId) =>
        api.put(`/employees/assign-manager/${employeeId}`, { managerId }),
};

// Holiday API
export const holidayAPI = {
    getAll: () => api.get('/holidays'),
    getUpcoming: () => api.get('/holidays/upcoming'),
    create: (data) => api.post('/holidays', data),
    update: (id, data) => api.put(`/holidays/${id}`, data),
    delete: (id) => api.delete(`/holidays/${id}`),
};

// Leave Type API (Dynamic)
export const leaveTypeAPI = {
    getAll: () => api.get('/leave-types'),
    create: (data) => api.post('/leave-types', data),
    update: (id, data) => api.put(`/leave-types/${id}`, data),
    delete: (id) => api.delete(`/leave-types/${id}`),
};

// Application Configuration and Lookups
export const configAPI = {
    getLeaveTypes: () => leaveTypeAPI.getAll(), // Now uses DB
};

// Policy API
export const policyAPI = {
    getAll: () => api.get('/policies'),
    create: (data) => api.post('/policies', data),
    update: (id, data) => api.put(`/policies/${id}`, data),
    delete: (id) => api.delete(`/policies/${id}`),
};

// Salary Component API
export const salaryComponentAPI = {
    getAll: () => api.get('/salary-components'),
    getActive: () => api.get('/salary-components/active'),
    create: (data) => api.post('/salary-components', data),
    update: (id, data) => api.put(`/salary-components/${id}`, data),
    delete: (id) => api.delete(`/salary-components/${id}`),
};

// Payroll API
export const payrollAPI = {
    setEmployeeSalaryStructure: (employeeId, structures) =>
        api.post(`/payroll/employee/${employeeId}/salary-structure`, structures),
    getEmployeeSalaryStructure: (employeeId) =>
        api.get(`/payroll/employee/${employeeId}/salary-structure`),
    generateSalarySlip: (data) => api.post('/payroll/generate-slip', data),
    generateBulkSlips: (data) => api.post('/payroll/generate-bulk', data),
    getSalarySlips: (month, year) => {
        let url = '/payroll/slips';
        if (month && year) {
            url += `?month=${month}&year=${year}`;
        }
        return api.get(url);
    },
    getSalarySlipById: (id) => api.get(`/payroll/slip/${id}`),
    getMySalarySlips: () => api.get('/payroll/my-slips'),
    updatePaymentStatus: (id, data) => api.put(`/payroll/slip/${id}/payment-status`, data),
    // Approval workflow
    approveSalarySlip: (id, remarks) => api.put(`/payroll/slip/${id}/approve`, { remarks }),
    rejectSalarySlip: (id, reason) => api.put(`/payroll/slip/${id}/reject`, { reason }),
    getPendingApprovalSlips: () => api.get('/payroll/slips/pending-approval'),
    bulkApproveSalarySlips: (slipIds, remarks) => api.post('/payroll/slips/bulk-approve', { slipIds, remarks }),
    // Regenerate slip with latest salary structure values
    regenerateSalarySlip: (id) => api.post(`/payroll/slip/${id}/regenerate`),
};

// Appraisal API
export const appraisalAPI = {
    // Cycle Management
    createCycle: (data) => api.post('/appraisals/cycles', data),
    getAllCycles: () => api.get('/appraisals/cycles'),
    getActiveCycles: () => api.get('/appraisals/cycles/active'),
    activateCycle: (id) => api.post(`/appraisals/cycles/${id}/activate`),

    // Competency Management
    createCompetency: (data) => api.post('/appraisals/competencies', data),
    getAllCompetencies: () => api.get('/appraisals/competencies'),

    // Appraisal Management
    getMyAppraisals: () => api.get('/appraisals/my-appraisals'),
    getCycleAppraisals: (cycleId) => api.get(`/appraisals/cycles/${cycleId}/appraisals`),
    getAppraisal: (id) => api.get(`/appraisals/${id}`),
    addPeerReviewers: (id, peerIds) => api.post(`/appraisals/${id}/peer-reviewers`, { peerIds }),

    // Review Submission
    getMyPendingReviews: () => api.get('/appraisals/my-reviews/pending'),
    getReviewDetails: (reviewId) => api.get(`/appraisals/reviews/${reviewId}`),
    submitReview: (reviewId, data) => api.post(`/appraisals/reviews/${reviewId}/submit`, data),

    // Approval
    approveAppraisal: (id, remarks) => api.post(`/appraisals/${id}/approve`, { remarks }),
};

export default api;
