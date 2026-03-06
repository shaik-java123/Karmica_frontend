import React, { useState, useEffect, useRef } from 'react';
import { lmsAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BackButton from '../components/BackButton';
import Icon from '../components/Icon';
import './LMS.css';

/* ──────────────── helpers ──────────────── */
/**
 * Strip fields whose value is an empty string so the backend never
 * receives "" for numeric / ID fields (avoids NumberFormatException).
 */
const cleanPayload = (obj) =>
    Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== '')
    );

const BACKEND_HOST = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace('/api', '');

const getFileUrl = (url) => {
    if (!url) return '';
    return url.startsWith('/uploads') ? `${BACKEND_HOST}${url}` : url;
};

const getCalendarUrl = (s) => {
    if (!s.scheduledAt) return '#';
    const start = new Date(s.scheduledAt);
    const end = new Date(start.getTime() + (s.durationMinutes || 60) * 60000);
    const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(s.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent('Join here: ' + (s.meetingLink || ''))}`;
};
const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtDateTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};
const PLATFORMS = [
    { value: 'google_meet', label: 'Google Meet', color: '#00897B', icon: '📹' },
    { value: 'zoom', label: 'Zoom', color: '#2D8CFF', icon: '🔵' },
    { value: 'teams', label: 'MS Teams', color: '#6264A7', icon: '💜' },
    { value: 'other', label: 'Other', color: '#64748b', icon: '🔗' },
];
const LESSON_TYPES = ['VIDEO', 'PDF', 'ARTICLE', 'QUIZ', 'ASSIGNMENT', 'EXTERNAL_LINK'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

/* ──────────────────────────────── component ──────────────────────────────── */
const LMS = () => {
    const { user } = useAuth();
    const toast = useToast();
    const fileRef = useRef(null);

    const canManage = ['ADMIN', 'HR', 'MANAGER'].includes(user?.role);

    /* ── state ── */
    const [tab, setTab] = useState('catalog');   // catalog | my-learning | sessions | admin
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [stats, setStats] = useState(null);
    const [myStats, setMyStats] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // selected course detail
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [courseSessions, setCourseSessions] = useState([]);
    const [courseEnrolled, setCourseEnrolled] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    // modals
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showLessonModal, setShowLessonModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [editingSession, setEditingSession] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [searchQ, setSearchQ] = useState('');

    // forms
    const [courseForm, setCourseForm] = useState({
        title: '', description: '', category: '', level: 'BEGINNER',
        durationHours: '', certificateEnabled: false, tags: '', thumbnailUrl: '', instructorId: ''
    });
    const [lessonForm, setLessonForm] = useState({
        title: '', description: '', type: 'VIDEO', contentUrl: '', durationMinutes: '', isFree: false
    });
    const [sessionForm, setSessionForm] = useState({
        title: '', agenda: '', meetingLink: '', platform: 'google_meet',
        scheduledAt: '', durationMinutes: '60'
    });

    /* ── load ── */
    useEffect(() => { loadData(); }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'catalog' || tab === 'admin') {
                const res = await lmsAPI.getCourses(searchQ || undefined);
                setCourses(res.data?.courses || []);
            }
            if (tab === 'my-learning') {
                const [enrRes, msRes] = await Promise.all([
                    lmsAPI.getMyEnrollments(),
                    lmsAPI.getMyStats(),
                ]);
                setEnrollments(enrRes.data?.enrollments || []);
                setMyStats(msRes.data?.data || null);
            }
            if (tab === 'sessions') {
                const res = await lmsAPI.getUpcomingSessions();
                setSessions(res.data?.sessions || []);
            }
            if (tab === 'admin') {
                const [stRes, empRes] = await Promise.all([
                    lmsAPI.getStats(),
                    employeeAPI.getAll(),
                ]);
                setStats(stRes.data?.data || null);
                setEmployees(empRes.data || []);
            }
        } catch (err) {
            toast.error('Failed to load LMS data');
        } finally {
            setLoading(false);
        }
    };

    /* ── search ── */
    const handleSearch = async (e) => {
        e.preventDefault();
        try {
            const res = await lmsAPI.getCourses(searchQ || undefined);
            setCourses(res.data?.courses || []);
        } catch { toast.error('Search failed'); }
    };

    /* ── open course detail ── */
    const openCourse = async (course) => {
        setSelectedCourse(course);
        setDetailLoading(true);
        try {
            const [lRes, sRes, enrRes] = await Promise.all([
                lmsAPI.getLessons(course.id),
                lmsAPI.getCourseSessions(course.id),
                lmsAPI.getMyEnrollments(),
            ]);
            setLessons(lRes.data?.lessons || []);
            setCourseSessions(sRes.data?.sessions || []);
            const myEnrolls = enrRes.data?.enrollments || [];
            setEnrollments(myEnrolls);
            const enrolled = myEnrolls.some(e => e.courseId === course.id);
            setCourseEnrolled(enrolled);
        } catch { toast.error('Failed to load course details'); }
        finally { setDetailLoading(false); }
    };

    /* ── enroll ── */
    const handleEnroll = async () => {
        try {
            await lmsAPI.enroll(selectedCourse.id);
            toast.success('Enrolled successfully!');
            openCourse(selectedCourse);
        } catch (e) { toast.error(e.response?.data?.error || 'Enrollment failed'); }
    };

    /* ── progress update ── */
    const handleProgress = async (courseId, pct) => {
        try {
            await lmsAPI.updateProgress(courseId, pct);
            toast.success('Progress updated');
            openCourse(selectedCourse);
        } catch { toast.error('Failed to update progress'); }
    };

    /* ── COURSE CRUD ── */
    const openCreateCourse = () => {
        setEditingCourse(null);
        setCourseForm({
            title: '', description: '', category: '', level: 'BEGINNER',
            durationHours: '', certificateEnabled: false, tags: '', thumbnailUrl: '', instructorId: ''
        });
        setShowCourseModal(true);
    };
    const openEditCourse = (course, e) => {
        e?.stopPropagation();
        setEditingCourse(course);
        setCourseForm({
            title: course.title || '',
            description: course.description || '',
            category: course.category || '',
            level: course.level || 'BEGINNER',
            durationHours: course.durationHours || '',
            certificateEnabled: course.certificateEnabled || false,
            tags: course.tags || '',
            thumbnailUrl: course.thumbnailUrl || '',
            instructorId: course.instructor?.id || '',
        });
        setShowCourseModal(true);
    };
    const saveCourse = async (e) => {
        e.preventDefault();
        try {
            const payload = cleanPayload(courseForm);
            if (editingCourse) {
                await lmsAPI.updateCourse(editingCourse.id, payload);
                toast.success('Course updated!');
            } else {
                await lmsAPI.createCourse(payload);
                toast.success('Course created!');
            }
            setShowCourseModal(false);
            loadData();
        } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
    };
    const publishCourse = async (id, e) => {
        e?.stopPropagation();
        try {
            await lmsAPI.publishCourse(id);
            toast.success('Course published!');
            loadData();
        } catch { toast.error('Publish failed'); }
    };
    const deleteCourse = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm('Delete this course?')) return;
        try {
            await lmsAPI.deleteCourse(id);
            toast.success('Deleted');
            loadData();
        } catch { toast.error('Delete failed'); }
    };

    /* ── LESSON CRUD ── */
    const openAddLesson = () => {
        setLessonForm({ title: '', description: '', type: 'VIDEO', contentUrl: '', durationMinutes: '', isFree: false });
        setUploadFile(null);
        setShowLessonModal(true);
    };
    const saveLesson = async (e) => {
        e.preventDefault();
        try {
            await lmsAPI.addLesson(selectedCourse.id, cleanPayload(lessonForm), uploadFile);
            toast.success('Lesson added!');
            setShowLessonModal(false);
            openCourse(selectedCourse);
        } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
    };
    const deleteLesson = async (lessonId) => {
        if (!window.confirm('Delete lesson?')) return;
        try {
            await lmsAPI.deleteLesson(lessonId);
            toast.success('Lesson deleted');
            openCourse(selectedCourse);
        } catch { toast.error('Delete failed'); }
    };

    /* ── SESSION CRUD ── */
    const openScheduleSession = (courseId) => {
        setEditingSession(null);
        setSessionForm({ title: '', agenda: '', meetingLink: '', platform: 'google_meet', scheduledAt: '', durationMinutes: '60' });
        setShowSessionModal(true);
    };
    const openEditSession = (session, e) => {
        e?.stopPropagation();
        setEditingSession(session);
        const iso = session.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : '';
        setSessionForm({
            title: session.title || '',
            agenda: session.agenda || '',
            meetingLink: session.meetingLink || '',
            platform: session.platform || 'google_meet',
            scheduledAt: iso,
            durationMinutes: session.durationMinutes || '60',
        });
        setShowSessionModal(true);
    };
    const saveSession = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...sessionForm, scheduledAt: new Date(sessionForm.scheduledAt).toISOString().slice(0, 19) };
            if (editingSession) {
                await lmsAPI.updateSession(editingSession.id, payload);
                toast.success('Session updated!');
            } else {
                await lmsAPI.scheduleSession(selectedCourse?.id || sessions[0]?.course?.id, payload);
                toast.success('Session scheduled!');
            }
            setShowSessionModal(false);
            loadData();
            if (selectedCourse) openCourse(selectedCourse);
        } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
    };
    const deleteSession = async (vcId, e) => {
        e?.stopPropagation();
        if (!window.confirm('Cancel this session?')) return;
        try {
            await lmsAPI.deleteSession(vcId);
            toast.success('Session cancelled');
            loadData();
            if (selectedCourse) openCourse(selectedCourse);
        } catch { toast.error('Delete failed'); }
    };

    /* ── pill helpers ── */
    const levelBadge = (l) => ({ BEGINNER: '#10b981', INTERMEDIATE: '#f59e0b', ADVANCED: '#ef4444' }[l] || '#64748b');
    const statusColor = (s) => ({ DRAFT: '#64748b', PUBLISHED: '#10b981', ARCHIVED: '#f59e0b' }[s] || '#64748b');
    const enrollColor = (s) => ({
        ENROLLED: '#3b82f6', IN_PROGRESS: '#f59e0b', COMPLETED: '#10b981', DROPPED: '#ef4444', REVISIT_REQUESTED: '#8b5cf6'
    }[s] || '#64748b');
    const sessionStatusColor = (s) => ({
        SCHEDULED: '#3b82f6', LIVE: '#10b981', COMPLETED: '#64748b', CANCELLED: '#ef4444'
    }[s] || '#64748b');

    const platInfo = (p) => PLATFORMS.find(x => x.value === p) || PLATFORMS[3];

    /* ──────────────── RENDER ──────────────── */

    /* course detail view */
    if (selectedCourse) {
        const enrObj = enrollments.find(e => e.courseId === selectedCourse.id);
        const progress = enrObj?.progressPercent ?? 0;
        const isCompleted = enrObj?.status === 'COMPLETED';
        const isRevisitRequested = enrObj?.status === 'REVISIT_REQUESTED';

        const handleRevisit = async () => {
            try {
                await lmsAPI.requestRevisit(selectedCourse.id);
                toast.success('Revisit request submitted! Awaiting admin approval.');
                openCourse(selectedCourse);
            } catch (e) { toast.error(e.response?.data?.error || 'Request failed'); }
        };

        return (
            <div className="lms-page">
                <div className="lms-detail-header">
                    <button className="lms-back-btn" onClick={() => setSelectedCourse(null)}>
                        <Icon name="back" size={18} /> Back to Courses
                    </button>
                    <div className="lms-detail-actions">
                        {canManage && (
                            <>
                                <button className="lms-btn lms-btn-ghost" onClick={() => openEditCourse(selectedCourse)}>
                                    <Icon name="edit" size={16} /> Edit
                                </button>
                                <button className="lms-btn lms-btn-primary" onClick={openAddLesson}>
                                    <Icon name="plus" size={16} /> Add Lesson
                                </button>
                                <button className="lms-btn lms-btn-success" onClick={() => openScheduleSession(selectedCourse.id)}>
                                    <Icon name="calendar" size={16} /> Schedule Session
                                </button>
                            </>
                        )}
                        {!courseEnrolled && selectedCourse.status === 'PUBLISHED' && (
                            <button className="lms-btn lms-btn-enroll" onClick={handleEnroll}>
                                Enroll Now
                            </button>
                        )}
                    </div>
                </div>

                {detailLoading ? <div className="lms-loading"><div className="lms-spinner" /></div> : (
                    <div className="lms-detail-body">
                        {/* Completed banner */}
                        {isCompleted && (
                            <div className="lms-completed-banner">
                                <div className="lms-completed-icon"><Icon name="award" size={32} /></div>
                                <div className="lms-completed-text">
                                    <h3>🎉 Course Completed!</h3>
                                    <p>Congratulations! You've successfully completed this course{enrObj?.completedAt ? ` on ${fmtDate(enrObj.completedAt)}` : ''}.</p>
                                </div>
                                <div className="lms-completed-actions">
                                    <a href={`${BACKEND_HOST}/api/lms/certificate/${enrObj?.id}`} target="_blank" rel="noreferrer"
                                        className="lms-btn lms-btn-certificate">
                                        <Icon name="award" size={16} /> Download Certificate
                                    </a>
                                    <button className="lms-btn lms-btn-revisit" onClick={handleRevisit}>
                                        <Icon name="refresh" size={16} /> Request Revisit
                                    </button>
                                </div>
                            </div>
                        )}

                        {isRevisitRequested && (
                            <div className="lms-completed-banner" style={{ borderColor: '#8b5cf6' }}>
                                <div className="lms-completed-icon" style={{ background: 'rgba(139,92,246,.15)', color: '#8b5cf6' }}><Icon name="clock" size={32} /></div>
                                <div className="lms-completed-text">
                                    <h3>Revisit Requested</h3>
                                    <p>Your request to revisit this course is pending admin approval.</p>
                                </div>
                                <a href={`${BACKEND_HOST}/api/lms/certificate/${enrObj?.id}`} target="_blank" rel="noreferrer"
                                    className="lms-btn lms-btn-certificate">
                                    <Icon name="award" size={16} /> View Certificate
                                </a>
                            </div>
                        )}

                        {/* Hero */}
                        <div className="lms-detail-hero">
                            {selectedCourse.thumbnailUrl
                                ? <img src={selectedCourse.thumbnailUrl} alt="thumbnail" className="lms-hero-thumb" />
                                : <div className="lms-hero-placeholder"><Icon name="school" size={64} /></div>
                            }
                            <div className="lms-detail-meta">
                                <div className="lms-detail-badges">
                                    <span className="lms-badge" style={{ background: statusColor(selectedCourse.status) }}>
                                        {selectedCourse.status}
                                    </span>
                                    <span className="lms-badge" style={{ background: levelBadge(selectedCourse.level) }}>
                                        {selectedCourse.level}
                                    </span>
                                    {selectedCourse.certificateEnabled && (
                                        <span className="lms-badge lms-badge-cert">
                                            <Icon name="award" size={12} /> Certificate
                                        </span>
                                    )}
                                    {isCompleted && (
                                        <span className="lms-badge" style={{ background: '#10b981' }}>
                                            ✓ COMPLETED
                                        </span>
                                    )}
                                </div>
                                <h1 className="lms-detail-title">{selectedCourse.title}</h1>
                                <p className="lms-detail-desc">{selectedCourse.description}</p>
                                <div className="lms-detail-info-row">
                                    {selectedCourse.category && <span><Icon name="folder" size={14} /> {selectedCourse.category}</span>}
                                    {selectedCourse.durationHours && <span><Icon name="clock" size={14} /> {selectedCourse.durationHours}h</span>}
                                    {selectedCourse.instructor && (
                                        <span><Icon name="users" size={14} /> {selectedCourse.instructor.firstName} {selectedCourse.instructor.lastName}</span>
                                    )}
                                    <span><Icon name="users" size={14} /> {selectedCourse.enrollments?.length ?? 0} enrolled</span>
                                </div>

                                {courseEnrolled && !isCompleted && !isRevisitRequested && (
                                    <div className="lms-progress-block">
                                        <div className="lms-progress-label">
                                            <span>Your progress</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="lms-progress-bar">
                                            <div className="lms-progress-fill" style={{ width: `${progress}%` }} />
                                        </div>
                                        <div className="lms-progress-btns">
                                            {[25, 50, 75, 100].map(p => (
                                                <button key={p} className="lms-btn lms-btn-xs"
                                                    onClick={() => handleProgress(selectedCourse.id, p)}
                                                >{p}%</button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(isCompleted || isRevisitRequested) && (
                                    <div className="lms-progress-block">
                                        <div className="lms-progress-label">
                                            <span>Completed</span>
                                            <span>100%</span>
                                        </div>
                                        <div className="lms-progress-bar">
                                            <div className="lms-progress-fill" style={{ width: '100%', background: '#10b981' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Lessons */}
                        <section className="lms-section">
                            <h2 className="lms-section-title"><Icon name="tasks" size={20} /> Lessons ({lessons.length})</h2>
                            {lessons.length === 0 ? (
                                <div className="lms-empty">No lessons added yet.</div>
                            ) : (
                                <div className="lms-lessons-list">
                                    {lessons.map((lesson, idx) => (
                                        <div key={lesson.id} className="lms-lesson-row">
                                            <div className="lms-lesson-number">{idx + 1}</div>
                                            <div className="lms-lesson-type-badge">{lesson.type}</div>
                                            <div className="lms-lesson-info">
                                                <strong>{lesson.title}</strong>
                                                {lesson.description && <p>{lesson.description}</p>}
                                            </div>
                                            <div className="lms-lesson-meta">
                                                {lesson.durationMinutes && <span>{lesson.durationMinutes} min</span>}
                                                {lesson.isFree && <span className="lms-free-tag">FREE</span>}
                                            </div>
                                            <div className="lms-lesson-actions">
                                                {(lesson.contentUrl || lesson.originalFileName) && (
                                                    <a href={getFileUrl(lesson.contentUrl)} target="_blank" rel="noreferrer"
                                                        className="lms-btn lms-btn-xs lms-btn-primary">
                                                        Open
                                                    </a>
                                                )}
                                                {canManage && (
                                                    <button className="lms-btn lms-btn-xs lms-btn-danger"
                                                        onClick={() => deleteLesson(lesson.id)}>
                                                        <Icon name="trash" size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Virtual classes */}
                        <section className="lms-section">
                            <h2 className="lms-section-title"><Icon name="calendar" size={20} /> Live Sessions ({courseSessions.length})</h2>
                            {courseSessions.length === 0 ? (
                                <div className="lms-empty">No sessions scheduled.</div>
                            ) : (
                                <div className="lms-sessions-grid">
                                    {courseSessions.map(s => {
                                        const pl = platInfo(s.platform);
                                        return (
                                            <div key={s.id} className="lms-session-card">
                                                <div className="lms-session-platform" style={{ background: pl.color }}>
                                                    {pl.icon} {pl.label}
                                                </div>
                                                <h3>{s.title}</h3>
                                                {s.agenda && <p className="lms-session-agenda">{s.agenda}</p>}
                                                <div className="lms-session-when">
                                                    <Icon name="calendar" size={14} /> {fmtDateTime(s.scheduledAt)}
                                                    &nbsp;·&nbsp; {s.durationMinutes} min
                                                </div>
                                                <div className="lms-session-footer">
                                                    <span className="lms-badge" style={{ background: sessionStatusColor(s.status) }}>
                                                        {s.status}
                                                    </span>
                                                    <a href={getCalendarUrl(s)} target="_blank" rel="noreferrer"
                                                        className="lms-btn lms-btn-xs" style={{ background: '#f59e0b', color: '#fff', textDecoration: 'none' }}>
                                                        <Icon name="calendar" size={13} /> Reminder
                                                    </a>
                                                    {s.meetingLink && (
                                                        <a href={s.meetingLink} target="_blank" rel="noreferrer"
                                                            className="lms-btn lms-btn-join">
                                                            Join Meeting
                                                        </a>
                                                    )}
                                                    {canManage && (
                                                        <button className="lms-btn lms-btn-xs lms-btn-danger"
                                                            onClick={(e) => deleteSession(s.id, e)}>
                                                            <Icon name="trash" size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* Add Lesson Modal */}
                {showLessonModal && (
                    <div className="lms-overlay" onClick={() => setShowLessonModal(false)}>
                        <div className="lms-modal" onClick={e => e.stopPropagation()}>
                            <div className="lms-modal-header">
                                <h2><Icon name="tasks" size={22} /> Add Lesson</h2>
                                <button onClick={() => setShowLessonModal(false)}><Icon name="x" size={20} /></button>
                            </div>
                            <form onSubmit={saveLesson} className="lms-form">
                                <div className="lms-form-row">
                                    <div className="lms-fg">
                                        <label>Title *</label>
                                        <input required value={lessonForm.title}
                                            onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                                            placeholder="Lesson title" />
                                    </div>
                                    <div className="lms-fg">
                                        <label>Type</label>
                                        <select value={lessonForm.type}
                                            onChange={e => setLessonForm({ ...lessonForm, type: e.target.value })}>
                                            {LESSON_TYPES.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="lms-fg">
                                    <label>Description</label>
                                    <textarea rows={3} value={lessonForm.description}
                                        onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })}
                                        placeholder="Short description..." />
                                </div>
                                <div className="lms-form-row">
                                    <div className="lms-fg">
                                        <label>Content URL (video/link)</label>
                                        <input value={lessonForm.contentUrl}
                                            onChange={e => setLessonForm({ ...lessonForm, contentUrl: e.target.value })}
                                            placeholder="https://..." />
                                    </div>
                                    <div className="lms-fg">
                                        <label>Duration (min)</label>
                                        <input type="number" min="1" value={lessonForm.durationMinutes}
                                            onChange={e => setLessonForm({ ...lessonForm, durationMinutes: e.target.value })} />
                                    </div>
                                </div>

                                {/* File upload */}
                                <div className="lms-fg">
                                    <label>Upload File (PDF / Video / etc.)</label>
                                    <div
                                        className={`lms-dropzone ${uploadFile ? 'has-file' : ''}`}
                                        onClick={() => fileRef.current?.click()}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => { e.preventDefault(); setUploadFile(e.dataTransfer.files[0]); }}
                                    >
                                        {uploadFile ? (
                                            <span>📄 {uploadFile.name}</span>
                                        ) : (
                                            <span>Drag & drop or <u>click to browse</u></span>
                                        )}
                                    </div>
                                    <input ref={fileRef} type="file" style={{ display: 'none' }}
                                        onChange={e => setUploadFile(e.target.files[0])} />
                                </div>

                                <label className="lms-check-label">
                                    <input type="checkbox" checked={lessonForm.isFree}
                                        onChange={e => setLessonForm({ ...lessonForm, isFree: e.target.checked })} />
                                    &nbsp; Free preview (visible to non-enrolled)
                                </label>

                                <div className="lms-modal-footer">
                                    <button type="button" className="lms-btn lms-btn-ghost" onClick={() => setShowLessonModal(false)}>Cancel</button>
                                    <button type="submit" className="lms-btn lms-btn-primary">Add Lesson</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Schedule Session Modal */}
                {showSessionModal && (
                    <div className="lms-overlay" onClick={() => setShowSessionModal(false)}>
                        <div className="lms-modal" onClick={e => e.stopPropagation()}>
                            <div className="lms-modal-header">
                                <h2><Icon name="calendar" size={22} /> Schedule Live Session</h2>
                                <button onClick={() => setShowSessionModal(false)}><Icon name="x" size={20} /></button>
                            </div>
                            <form onSubmit={saveSession} className="lms-form">
                                <div className="lms-fg">
                                    <label>Session Title *</label>
                                    <input required value={sessionForm.title}
                                        onChange={e => setSessionForm({ ...sessionForm, title: e.target.value })}
                                        placeholder="e.g. Week 1 Kickoff" />
                                </div>
                                <div className="lms-fg">
                                    <label>Agenda</label>
                                    <textarea rows={3} value={sessionForm.agenda}
                                        onChange={e => setSessionForm({ ...sessionForm, agenda: e.target.value })}
                                        placeholder="Topics to be covered..." />
                                </div>

                                {/* Platform selector */}
                                <div className="lms-fg">
                                    <label>Meeting Platform</label>
                                    <div className="lms-platform-grid">
                                        {PLATFORMS.map(pl => (
                                            <button key={pl.value} type="button"
                                                className={`lms-platform-btn ${sessionForm.platform === pl.value ? 'active' : ''}`}
                                                style={{ '--pl-color': pl.color }}
                                                onClick={() => setSessionForm({ ...sessionForm, platform: pl.value })}>
                                                {pl.icon} {pl.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="lms-fg">
                                    <label>Meeting Link *</label>
                                    <input required value={sessionForm.meetingLink}
                                        onChange={e => setSessionForm({ ...sessionForm, meetingLink: e.target.value })}
                                        placeholder="https://meet.google.com/xxx-xxxx-xxx" />
                                    <p className="lms-hint">
                                        Paste your Google Meet / Zoom / Teams link here.
                                        To use Google Meet: open <a href="https://meet.google.com" target="_blank" rel="noreferrer">meet.google.com</a> → New meeting → copy link.
                                    </p>
                                </div>

                                <div className="lms-form-row">
                                    <div className="lms-fg">
                                        <label>Date & Time *</label>
                                        <input required type="datetime-local" value={sessionForm.scheduledAt}
                                            onChange={e => setSessionForm({ ...sessionForm, scheduledAt: e.target.value })} />
                                    </div>
                                    <div className="lms-fg">
                                        <label>Duration (minutes)</label>
                                        <input type="number" min="15" value={sessionForm.durationMinutes}
                                            onChange={e => setSessionForm({ ...sessionForm, durationMinutes: e.target.value })} />
                                    </div>
                                </div>

                                <div className="lms-modal-footer">
                                    <button type="button" className="lms-btn lms-btn-ghost" onClick={() => setShowSessionModal(false)}>Cancel</button>
                                    <button type="submit" className="lms-btn lms-btn-primary">
                                        <Icon name="calendar" size={16} /> {editingSession ? 'Update' : 'Schedule'} Session
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit course modal */}
                {showCourseModal && (
                    <CourseModal
                        courseForm={courseForm}
                        setCourseForm={setCourseForm}
                        employees={employees}
                        editing={!!editingCourse}
                        onClose={() => setShowCourseModal(false)}
                        onSave={saveCourse}
                    />
                )}
            </div>
        );
    }

    /* ──── main tabs ──── */
    return (
        <div className="lms-page">
            <BackButton to="/dashboard" label="Back to Dashboard" />

            <div className="lms-header">
                <div className="lms-header-left">
                    <h1><Icon name="school" size={34} className="lms-header-icon" /> Learning &amp; Development</h1>
                    <p>Grow your skills with courses, live sessions &amp; more.</p>
                </div>
                {canManage && (
                    <button className="lms-btn lms-btn-primary" onClick={openCreateCourse}>
                        <Icon name="plus" size={18} /> New Course
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="lms-tabs">
                {[
                    { key: 'catalog', label: 'Course Catalog', icon: 'school' },
                    { key: 'my-learning', label: 'My Learning', icon: 'award' },
                    { key: 'sessions', label: 'Upcoming Sessions', icon: 'calendar' },
                    ...(canManage ? [{ key: 'admin', label: 'Admin', icon: 'chart' }] : []),
                ].map(t => (
                    <button key={t.key}
                        className={`lms-tab ${tab === t.key ? 'active' : ''}`}
                        onClick={() => setTab(t.key)}>
                        <Icon name={t.icon} size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Search bar (catalog tab) */}
            {tab === 'catalog' && (
                <form className="lms-search-row" onSubmit={handleSearch}>
                    <div className="lms-search-wrap">
                        <Icon name="search" size={18} className="lms-search-icon" />
                        <input
                            className="lms-search-input"
                            placeholder="Search courses by title, category or tag..."
                            value={searchQ}
                            onChange={e => setSearchQ(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="lms-btn lms-btn-primary">Search</button>
                </form>
            )}

            {loading ? (
                <div className="lms-loading"><div className="lms-spinner" /></div>
            ) : (
                <>
                    {/* ── CATALOG ── */}
                    {tab === 'catalog' && (
                        <div className="lms-courses-grid">
                            {courses.length === 0 && <div className="lms-empty"><Icon name="school" size={40} /><p>No courses available.</p></div>}
                            {courses.map(course => (
                                <div key={course.id} className="lms-course-card" onClick={() => openCourse(course)}>
                                    <div className="lms-course-thumb">
                                        {course.thumbnailUrl
                                            ? <img src={course.thumbnailUrl} alt="thumb" />
                                            : <div className="lms-thumb-placeholder"><Icon name="school" size={40} /></div>
                                        }
                                        <span className="lms-course-level-badge" style={{ background: levelBadge(course.level) }}>
                                            {course.level}
                                        </span>
                                    </div>
                                    <div className="lms-course-body">
                                        <div className="lms-course-cat">{course.category}</div>
                                        <h3 className="lms-course-title">{course.title}</h3>
                                        <p className="lms-course-desc">{course.description?.slice(0, 100)}{course.description?.length > 100 ? '…' : ''}</p>
                                        <div className="lms-course-footer">
                                            <div className="lms-course-meta">
                                                {course.durationHours && <span><Icon name="clock" size={13} /> {course.durationHours}h</span>}
                                                <span><Icon name="users" size={13} /> {course.enrollments?.length ?? 0}</span>
                                                {course.certificateEnabled && <span><Icon name="award" size={13} /> Cert</span>}
                                            </div>
                                            <span className="lms-badge" style={{ background: statusColor(course.status) }}>
                                                {course.status}
                                            </span>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <div className="lms-course-admin-bar" onClick={e => e.stopPropagation()}>
                                            {course.status === 'DRAFT' && (
                                                <button className="lms-btn lms-btn-xs lms-btn-success"
                                                    onClick={(e) => publishCourse(course.id, e)}>
                                                    Publish
                                                </button>
                                            )}
                                            <button className="lms-btn lms-btn-xs"
                                                onClick={(e) => openEditCourse(course, e)}>
                                                <Icon name="edit" size={13} />
                                            </button>
                                            <button className="lms-btn lms-btn-xs lms-btn-danger"
                                                onClick={(e) => deleteCourse(course.id, e)}>
                                                <Icon name="trash" size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── MY LEARNING ── */}
                    {tab === 'my-learning' && (
                        <>
                            {myStats && (
                                <div className="lms-stats-row">
                                    <div className="lms-stat-card lms-stat-blue">
                                        <div className="lms-stat-num">{myStats.totalEnrolled}</div>
                                        <div className="lms-stat-label">Enrolled</div>
                                    </div>
                                    <div className="lms-stat-card lms-stat-amber">
                                        <div className="lms-stat-num">{myStats.inProgress}</div>
                                        <div className="lms-stat-label">In Progress</div>
                                    </div>
                                    <div className="lms-stat-card lms-stat-green">
                                        <div className="lms-stat-num">{myStats.completed}</div>
                                        <div className="lms-stat-label">Completed</div>
                                    </div>
                                </div>
                            )}
                            {enrollments.length === 0 ? (
                                <div className="lms-empty">
                                    <Icon name="school" size={48} />
                                    <p>You haven't enrolled in any courses yet.</p>
                                    <button className="lms-btn lms-btn-primary" onClick={() => setTab('catalog')}>
                                        Browse Catalog
                                    </button>
                                </div>
                            ) : (
                                <div className="lms-enroll-list">
                                    {enrollments.map(enr => {
                                        const c = courses.find(c => c.id === enr.courseId);
                                        return (
                                            <div key={enr.id} className="lms-enroll-card"
                                                onClick={() => c && openCourse(c)}>
                                                <div className="lms-enroll-info">
                                                    <h3>{c?.title || 'Course #' + enr.courseId}</h3>
                                                    <p>{c?.category || '—'} · {c?.level || '—'}</p>
                                                </div>
                                                <div className="lms-enroll-progress">
                                                    <div className="lms-progress-bar">
                                                        <div className="lms-progress-fill" style={{ width: `${enr.progressPercent}%` }} />
                                                    </div>
                                                    <span>{enr.progressPercent}%</span>
                                                </div>
                                                <span className="lms-badge" style={{ background: enrollColor(enr.status) }}>
                                                    {enr.status?.replace('_', ' ')}
                                                </span>
                                                {enr.completedAt && (
                                                    <span className="lms-enroll-date">✓ {fmtDate(enr.completedAt)}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── SESSIONS ── */}
                    {tab === 'sessions' && (
                        <>
                            {sessions.length === 0 ? (
                                <div className="lms-empty">
                                    <Icon name="calendar" size={48} />
                                    <p>No upcoming sessions scheduled.</p>
                                </div>
                            ) : (
                                <div className="lms-sessions-grid">
                                    {sessions.map(s => {
                                        const pl = platInfo(s.platform);
                                        return (
                                            <div key={s.id} className="lms-session-card">
                                                <div className="lms-session-platform" style={{ background: pl.color }}>
                                                    {pl.icon} {pl.label}
                                                </div>
                                                <h3>{s.title}</h3>
                                                <p className="lms-session-course">
                                                    <Icon name="school" size={13} /> {s.course?.title}
                                                </p>
                                                {s.agenda && <p className="lms-session-agenda">{s.agenda}</p>}
                                                <div className="lms-session-when">
                                                    <Icon name="calendar" size={14} /> {fmtDateTime(s.scheduledAt)}
                                                    &nbsp;·&nbsp; {s.durationMinutes} min
                                                </div>
                                                <div className="lms-session-footer">
                                                    <span className="lms-badge" style={{ background: sessionStatusColor(s.status) }}>
                                                        {s.status}
                                                    </span>
                                                    {s.meetingLink && (
                                                        <a href={s.meetingLink} target="_blank" rel="noreferrer"
                                                            className="lms-btn lms-btn-join">
                                                            Join Meeting
                                                        </a>
                                                    )}
                                                    {canManage && (
                                                        <>
                                                            <button className="lms-btn lms-btn-xs"
                                                                onClick={(e) => openEditSession(s, e)}>
                                                                <Icon name="edit" size={13} />
                                                            </button>
                                                            <button className="lms-btn lms-btn-xs lms-btn-danger"
                                                                onClick={(e) => deleteSession(s.id, e)}>
                                                                <Icon name="trash" size={13} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── ADMIN ── */}
                    {tab === 'admin' && stats && (
                        <div className="lms-admin-panel">
                            <div className="lms-stats-row">
                                <div className="lms-stat-card lms-stat-purple">
                                    <div className="lms-stat-num">{stats.totalCourses}</div>
                                    <div className="lms-stat-label">Total Courses</div>
                                </div>
                                <div className="lms-stat-card lms-stat-green">
                                    <div className="lms-stat-num">{stats.publishedCourses}</div>
                                    <div className="lms-stat-label">Published</div>
                                </div>
                                <div className="lms-stat-card lms-stat-blue">
                                    <div className="lms-stat-num">{stats.totalEnrollments}</div>
                                    <div className="lms-stat-label">Enrollments</div>
                                </div>
                                <div className="lms-stat-card lms-stat-amber">
                                    <div className="lms-stat-num">{stats.totalUpcomingSessions}</div>
                                    <div className="lms-stat-label">Upcoming Sessions</div>
                                </div>
                            </div>
                            <div className="lms-admin-hint">
                                <Icon name="info" size={16} /> Use the <strong>Course Catalog</strong> tab to create, manage, and publish courses. Select any course to add lessons and schedule Google Meet sessions.
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Course Create/Edit Modal */}
            {showCourseModal && (
                <CourseModal
                    courseForm={courseForm}
                    setCourseForm={setCourseForm}
                    employees={employees}
                    editing={!!editingCourse}
                    onClose={() => setShowCourseModal(false)}
                    onSave={saveCourse}
                />
            )}

            {/* Session modal (from sessions tab) */}
            {showSessionModal && (
                <div className="lms-overlay" onClick={() => setShowSessionModal(false)}>
                    <div className="lms-modal" onClick={e => e.stopPropagation()}>
                        <div className="lms-modal-header">
                            <h2><Icon name="calendar" size={22} /> {editingSession ? 'Edit' : 'Schedule'} Session</h2>
                            <button onClick={() => setShowSessionModal(false)}><Icon name="x" size={20} /></button>
                        </div>
                        <form onSubmit={saveSession} className="lms-form">
                            <div className="lms-fg">
                                <label>Session Title *</label>
                                <input required value={sessionForm.title}
                                    onChange={e => setSessionForm({ ...sessionForm, title: e.target.value })} />
                            </div>
                            <div className="lms-fg">
                                <label>Meeting Platform</label>
                                <div className="lms-platform-grid">
                                    {PLATFORMS.map(pl => (
                                        <button key={pl.value} type="button"
                                            className={`lms-platform-btn ${sessionForm.platform === pl.value ? 'active' : ''}`}
                                            style={{ '--pl-color': pl.color }}
                                            onClick={() => setSessionForm({ ...sessionForm, platform: pl.value })}>
                                            {pl.icon} {pl.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="lms-fg">
                                <label>Meeting Link *</label>
                                <input required value={sessionForm.meetingLink}
                                    onChange={e => setSessionForm({ ...sessionForm, meetingLink: e.target.value })}
                                    placeholder="https://meet.google.com/..." />
                            </div>
                            <div className="lms-form-row">
                                <div className="lms-fg">
                                    <label>Date &amp; Time *</label>
                                    <input required type="datetime-local" value={sessionForm.scheduledAt}
                                        onChange={e => setSessionForm({ ...sessionForm, scheduledAt: e.target.value })} />
                                </div>
                                <div className="lms-fg">
                                    <label>Duration (min)</label>
                                    <input type="number" min="15" value={sessionForm.durationMinutes}
                                        onChange={e => setSessionForm({ ...sessionForm, durationMinutes: e.target.value })} />
                                </div>
                            </div>
                            <div className="lms-modal-footer">
                                <button type="button" className="lms-btn lms-btn-ghost" onClick={() => setShowSessionModal(false)}>Cancel</button>
                                <button type="submit" className="lms-btn lms-btn-primary">
                                    {editingSession ? 'Update' : 'Schedule'} Session
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ──────────────── Course Modal (reused) ──────────────── */
const CourseModal = ({ courseForm, setCourseForm, employees, editing, onClose, onSave }) => (
    <div className="lms-overlay" onClick={onClose}>
        <div className="lms-modal lms-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="lms-modal-header">
                <h2><Icon name="school" size={22} /> {editing ? 'Edit' : 'Create'} Course</h2>
                <button onClick={onClose}><Icon name="x" size={20} /></button>
            </div>
            <form onSubmit={onSave} className="lms-form">
                <div className="lms-fg">
                    <label>Course Title *</label>
                    <input required value={courseForm.title}
                        onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                        placeholder="e.g. Leadership Fundamentals" />
                </div>
                <div className="lms-fg">
                    <label>Description</label>
                    <textarea rows={4} value={courseForm.description}
                        onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                        placeholder="What will learners achieve?" />
                </div>
                <div className="lms-form-row">
                    <div className="lms-fg">
                        <label>Category *</label>
                        <input required value={courseForm.category}
                            onChange={e => setCourseForm({ ...courseForm, category: e.target.value })}
                            placeholder="e.g. Technical, Leadership, Compliance" />
                    </div>
                    <div className="lms-fg">
                        <label>Level</label>
                        <select value={courseForm.level}
                            onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}>
                            {LEVELS.map(l => <option key={l}>{l}</option>)}
                        </select>
                    </div>
                </div>
                <div className="lms-form-row">
                    <div className="lms-fg">
                        <label>Duration (hours)</label>
                        <input type="number" min="1" value={courseForm.durationHours}
                            onChange={e => setCourseForm({ ...courseForm, durationHours: e.target.value })} />
                    </div>
                    <div className="lms-fg">
                        <label>Instructor</label>
                        <select value={courseForm.instructorId}
                            onChange={e => setCourseForm({ ...courseForm, instructorId: e.target.value })}>
                            <option value="">— None —</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="lms-fg">
                    <label>Tags (comma-separated)</label>
                    <input value={courseForm.tags}
                        onChange={e => setCourseForm({ ...courseForm, tags: e.target.value })}
                        placeholder="react, java, leadership..." />
                </div>
                <div className="lms-fg">
                    <label>Thumbnail URL</label>
                    <input value={courseForm.thumbnailUrl}
                        onChange={e => setCourseForm({ ...courseForm, thumbnailUrl: e.target.value })}
                        placeholder="https://..." />
                </div>
                <label className="lms-check-label">
                    <input type="checkbox" checked={courseForm.certificateEnabled}
                        onChange={e => setCourseForm({ ...courseForm, certificateEnabled: e.target.checked })} />
                    &nbsp; Issue certificate upon completion
                </label>
                <div className="lms-modal-footer">
                    <button type="button" className="lms-btn lms-btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" className="lms-btn lms-btn-primary">
                        <Icon name="check" size={16} /> {editing ? 'Update' : 'Create'} Course
                    </button>
                </div>
            </form>
        </div>
    </div>
);

export default LMS;
