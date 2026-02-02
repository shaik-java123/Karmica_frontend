import React, { useState, useEffect } from 'react';
import { taskAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BackButton from '../components/BackButton';
import './Tasks.css';

const Tasks = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('my-tasks');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignedToId: '',
        dueDate: '',
        priority: 'MEDIUM'
    });

    const canAssignTasks = ['ADMIN', 'HR', 'MANAGER'].includes(user?.role);

    useEffect(() => {
        fetchTasks();
        if (canAssignTasks) {
            fetchEmployees();
        }
    }, [activeTab]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            let response;
            if (activeTab === 'my-tasks') {
                response = await taskAPI.getMyTasks();
            } else if (activeTab === 'assigned-by-me' && canAssignTasks) {
                response = await taskAPI.getAssignedByMe();
            } else if (activeTab === 'all' && (user?.role === 'ADMIN' || user?.role === 'HR')) {
                response = await taskAPI.getAll();
            }
            setTasks(response?.data?.tasks || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await employeeAPI.getAll();
            setEmployees(response.data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await taskAPI.create(formData);
            toast.success('Task assigned successfully!');
            setShowModal(false);
            resetForm();
            fetchTasks();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create task');
        }
    };

    const handleStatusUpdate = async (taskId, newStatus, comments = '') => {
        try {
            await taskAPI.updateStatus(taskId, { status: newStatus, comments });
            toast.success('Task status updated!');
            fetchTasks();
        } catch (error) {
            toast.error('Failed to update task status');
        }
    };

    const handleDelete = async (taskId) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            try {
                await taskAPI.delete(taskId);
                toast.success('Task deleted successfully!');
                fetchTasks();
            } catch (error) {
                toast.error('Failed to delete task');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            assignedToId: '',
            dueDate: '',
            priority: 'MEDIUM'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            TODO: '#FFA500',
            IN_PROGRESS: '#3B82F6',
            COMPLETED: '#22C55E',
            CANCELLED: '#6B7280'
        };
        return colors[status] || '#6B7280';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            LOW: '#10B981',
            MEDIUM: '#F59E0B',
            HIGH: '#EF4444',
            URGENT: '#DC2626'
        };
        return colors[priority] || '#F59E0B';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const isOverdue = (dueDate, status) => {
        if (status === 'COMPLETED' || status === 'CANCELLED') return false;
        return new Date(dueDate) < new Date();
    };

    return (
        <div className="tasks-page">
            <BackButton to="/dashboard" label="Back to Dashboard" />

            <div className="tasks-header">
                <h1>📋 Task Management</h1>
                {canAssignTasks && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + Assign Task
                    </button>
                )}
            </div>

            <div className="tabs">
                <button
                    className={activeTab === 'my-tasks' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('my-tasks')}
                >
                    My Tasks
                </button>
                {canAssignTasks && (
                    <button
                        className={activeTab === 'assigned-by-me' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('assigned-by-me')}
                    >
                        Assigned by Me
                    </button>
                )}
                {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                    <button
                        className={activeTab === 'all' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('all')}
                    >
                        All Tasks
                    </button>
                )}
            </div>

            {loading ? (
                <div className="loading">Loading tasks...</div>
            ) : (
                <div className="tasks-grid">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`task-card ${isOverdue(task.dueDate, task.status) ? 'overdue' : ''}`}
                        >
                            <div className="task-header">
                                <div>
                                    <h3>{task.title}</h3>
                                    <p className="task-assigned">
                                        {activeTab === 'my-tasks'
                                            ? `Assigned by: ${task.assignedBy?.firstName} ${task.assignedBy?.lastName}`
                                            : `Assigned to: ${task.assignedTo?.firstName} ${task.assignedTo?.lastName}`
                                        }
                                    </p>
                                </div>
                                <div className="task-badges">
                                    <span
                                        className="priority-badge"
                                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                                    >
                                        {task.priority}
                                    </span>
                                    <span
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(task.status) }}
                                    >
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            <div className="task-details">
                                <p className="task-description">{task.description}</p>
                                <p className="task-due-date">
                                    <strong>📅 Due:</strong> {formatDate(task.dueDate)}
                                    {isOverdue(task.dueDate, task.status) && (
                                        <span className="overdue-label"> (OVERDUE)</span>
                                    )}
                                </p>
                                {task.comments && (
                                    <p className="task-comments">
                                        <strong>💬 Comments:</strong> {task.comments}
                                    </p>
                                )}
                            </div>

                            <div className="task-actions">
                                {activeTab === 'my-tasks' && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                                    <>
                                        {task.status === 'TODO' && (
                                            <button
                                                className="btn-start"
                                                onClick={() => handleStatusUpdate(task.id, 'IN_PROGRESS')}
                                            >
                                                ▶ Start
                                            </button>
                                        )}
                                        {task.status === 'IN_PROGRESS' && (
                                            <button
                                                className="btn-complete"
                                                onClick={() => handleStatusUpdate(task.id, 'COMPLETED')}
                                            >
                                                ✓ Complete
                                            </button>
                                        )}
                                    </>
                                )}
                                {activeTab === 'assigned-by-me' && (
                                    <button
                                        className="btn-delete"
                                        onClick={() => handleDelete(task.id)}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tasks.length === 0 && !loading && (
                <div className="no-data">No tasks found</div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Assign New Task</h2>
                        <form onSubmit={handleSubmit}>
                            <input
                                type="text"
                                placeholder="Task Title *"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                            <textarea
                                placeholder="Task Description *"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="4"
                                required
                            />
                            <select
                                value={formData.assignedToId}
                                onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                                required
                            >
                                <option value="">Select Employee *</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName} - {emp.designation}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                required
                            />
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                required
                            >
                                <option value="LOW">Low Priority</option>
                                <option value="MEDIUM">Medium Priority</option>
                                <option value="HIGH">High Priority</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Assign Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
