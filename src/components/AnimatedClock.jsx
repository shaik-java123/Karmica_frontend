import React, { useState, useEffect } from 'react';
import './AnimatedClock.css';

const AnimatedClock = ({ isCheckedIn, onCheckIn, onCheckOut, loading, checkInTime, completed }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            if (isCheckedIn && checkInTime) {
                try {
                    // checkInTime is usually "HH:mm:ss"
                    const [hours, minutes, seconds] = checkInTime.split(':').map(Number);
                    const checkInDate = new Date();
                    checkInDate.setHours(hours, minutes, seconds || 0, 0);

                    const diffMs = now - checkInDate;
                    if (diffMs > 0) {
                        const diffHrs = Math.floor(diffMs / 3600000);
                        const diffMins = Math.floor((diffMs % 3600000) / 60000);
                        const diffSecs = Math.floor((diffMs % 60000) / 1000);

                        setElapsedTime(
                            `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`
                        );
                    }
                } catch (e) {
                    console.error("Error calculating elapsed time", e);
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isCheckedIn, checkInTime]);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="animated-clock-container">
            <div className="clock-display">
                <div className="clock-icon">
                    <svg
                        className={`clock-svg ${isCheckedIn ? 'spinning' : ''}`}
                        viewBox="0 0 100 100"
                        width="120"
                        height="120"
                    >
                        {/* Clock circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="rgba(99, 102, 241, 0.1)"
                            stroke="rgba(99, 102, 241, 0.5)"
                            strokeWidth="2"
                        />

                        {/* Clock markings */}
                        {[...Array(12)].map((_, i) => {
                            const angle = (i * 30 - 90) * (Math.PI / 180);
                            const x1 = 50 + 38 * Math.cos(angle);
                            const y1 = 50 + 38 * Math.sin(angle);
                            const x2 = 50 + 42 * Math.cos(angle);
                            const y2 = 50 + 42 * Math.sin(angle);
                            return (
                                <line
                                    key={i}
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke="rgba(255, 255, 255, 0.3)"
                                    strokeWidth="2"
                                />
                            );
                        })}

                        {/* Hour hand */}
                        <line
                            x1="50"
                            y1="50"
                            x2={50 + 20 * Math.sin((currentTime.getHours() % 12 + currentTime.getMinutes() / 60) * 30 * Math.PI / 180)}
                            y2={50 - 20 * Math.cos((currentTime.getHours() % 12 + currentTime.getMinutes() / 60) * 30 * Math.PI / 180)}
                            stroke="white"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />

                        {/* Minute hand */}
                        <line
                            x1="50"
                            y1="50"
                            x2={50 + 30 * Math.sin(currentTime.getMinutes() * 6 * Math.PI / 180)}
                            y2={50 - 30 * Math.cos(currentTime.getMinutes() * 6 * Math.PI / 180)}
                            stroke="rgba(99, 102, 241, 1)"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />

                        {/* Second hand */}
                        <line
                            x1="50"
                            y1="50"
                            x2={50 + 35 * Math.sin(currentTime.getSeconds() * 6 * Math.PI / 180)}
                            y2={50 - 35 * Math.cos(currentTime.getSeconds() * 6 * Math.PI / 180)}
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeLinecap="round"
                            className="second-hand"
                        />

                        {/* Center dot */}
                        <circle cx="50" cy="50" r="4" fill="white" />
                    </svg>
                </div>

                <div className="time-display">
                    <div className="current-time">{formatTime(currentTime)}</div>
                    <div className="current-date">{formatDate(currentTime)}</div>
                </div>
            </div>

            <div className="clock-actions">
                {completed ? (
                    <div className="completed-badge-clock">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                        <span>Work Completed</span>
                    </div>
                ) : !isCheckedIn ? (
                    <button
                        className="btn-clock btn-check-in"
                        onClick={onCheckIn}
                        disabled={loading}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        <span>Check In</span>
                    </button>
                ) : (
                    <button
                        className="btn-clock btn-check-out"
                        onClick={onCheckOut}
                        disabled={loading}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Check Out</span>
                    </button>
                )}
            </div>

            {isCheckedIn && (
                <div className="status-indicator-container">
                    <div className="status-indicator">
                        <span className="status-dot pulsing"></span>
                        <span className="status-text">Currently Working</span>
                    </div>
                    <div className="present-time-counter">
                        <span className="counter-label">Present Time:</span>
                        <span className="counter-value">{elapsedTime}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnimatedClock;
