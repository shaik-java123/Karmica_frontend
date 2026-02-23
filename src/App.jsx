import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Departments from './pages/Departments';
import Leaves from './pages/Leaves';
import Attendance from './pages/Attendance';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import Organization from './pages/Organization';
import Payroll from './pages/Payroll';
import Appraisals from './pages/Appraisals';
import Onboarding from './pages/Onboarding';
import Worklist from './pages/Worklist';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ChatBot from './components/ChatBot';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'var(--dark-bg)',
                color: 'white'
            }}>
                <div className="animate-pulse">
                    <h2>Loading...</h2>
                </div>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'var(--dark-bg)',
                color: 'white'
            }}>
                <div className="animate-pulse">
                    <h2>Loading...</h2>
                </div>
            </div>
        );
    }

    return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <Router>
                    <AuthProvider>
                        <Routes>
                            <Route path="/" element={<Navigate to="/login" />} />
                            <Route
                                path="/login"
                                element={
                                    <PublicRoute>
                                        <Login />
                                    </PublicRoute>
                                }
                            />
                            <Route
                                path="/register"
                                element={
                                    <PublicRoute>
                                        <Register />
                                    </PublicRoute>
                                }
                            />
                            <Route
                                path="/forgot-password"
                                element={
                                    <PublicRoute>
                                        <ForgotPassword />
                                    </PublicRoute>
                                }
                            />
                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <Dashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/employees"
                                element={
                                    <ProtectedRoute>
                                        <Employees />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/departments"
                                element={
                                    <ProtectedRoute>
                                        <Departments />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/leaves"
                                element={
                                    <ProtectedRoute>
                                        <Leaves />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/attendance"
                                element={
                                    <ProtectedRoute>
                                        <Attendance />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/tasks"
                                element={
                                    <ProtectedRoute>
                                        <Tasks />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute>
                                        <Profile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/change-password"
                                element={
                                    <ProtectedRoute>
                                        <ChangePassword />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/organization"
                                element={
                                    <ProtectedRoute>
                                        <Organization />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/payroll"
                                element={
                                    <ProtectedRoute>
                                        <Payroll />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/appraisals"
                                element={
                                    <ProtectedRoute>
                                        <Appraisals />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/onboarding"
                                element={
                                    <ProtectedRoute>
                                        <Onboarding />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/worklist"
                                element={
                                    <ProtectedRoute>
                                        <Worklist />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/analytics"
                                element={
                                    <ProtectedRoute>
                                        <AnalyticsDashboard />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                        {/* Karma AI Assistant — floats on every authenticated page */}
                        <ChatBot />
                    </AuthProvider>
                </Router>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
