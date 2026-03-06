import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import BackButton from '../components/BackButton';
import Icon from '../components/Icon';
import './SystemHealth.css';

const SystemHealth = () => {
    const { user } = useAuth();
    const [breakers, setBreakers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const intervalRef = useRef(null);

    const fetchCircuitBreakers = useCallback(async (showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        try {
            const res = await adminAPI.getCircuitBreakers();
            setBreakers(res.data.circuitBreakers || []);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error('Failed to fetch circuit breakers:', err);
            // If 403, user doesn't have ADMIN role
            if (err.response?.status === 403) {
                setError('Access denied. Admin role required to view system health.');
            } else {
                setError(err.response?.data?.message || 'Failed to load circuit breaker data.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchCircuitBreakers(true);
    }, [fetchCircuitBreakers]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(() => fetchCircuitBreakers(false), 10000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [autoRefresh, fetchCircuitBreakers]);

    const handleRefresh = () => fetchCircuitBreakers(true);

    // ── Computed Values ──────────────────────────────────────────
    const totalBreakers = breakers.length;
    const closedCount = breakers.filter(b => b.state === 'CLOSED').length;
    const openCount = breakers.filter(b => b.state === 'OPEN').length;
    const halfOpenCount = breakers.filter(b => b.state === 'HALF_OPEN').length;
    const totalCalls = breakers.reduce((sum, b) => sum + (b.bufferedCalls || 0), 0);
    const unreachableCount = breakers.filter(b => b.serviceReachable === false).length;

    // Health considers BOTH circuit breaker state AND live service reachability
    const overallHealth = openCount > 0 ? 'critical'
        : unreachableCount > 0 ? 'degraded'
            : halfOpenCount > 0 ? 'degraded'
                : 'healthy';
    const healthText = {
        healthy: { title: 'All Systems Operational', desc: 'All services are reachable and circuit breakers are in CLOSED state.' },
        degraded: { title: 'Service Issue Detected', desc: 'One or more services are unreachable. Circuit breakers may trip after failed calls accumulate.' },
        critical: { title: 'Service Disruption Active', desc: 'Circuit breakers are OPEN — requests are being blocked to prevent cascade failures.' },
    };

    const getServiceDescription = (name) => {
        const descriptions = {
            ollamaService: 'AI Chatbot (Karma) — Ollama LLM',
            randomUserService: 'RandomUser API — Integration Demo',
            externalService: 'External Service — General Purpose',
        };
        return descriptions[name] || name;
    };

    const getStateInfo = (state) => {
        const states = {
            CLOSED: { label: 'Closed', class: 'closed', icon: '✓', desc: 'Normal operation — all requests pass through to the service' },
            OPEN: { label: 'Open', class: 'open', icon: '✕', desc: 'Requests are being rejected to prevent cascade failure. Waiting for recovery timeout.' },
            HALF_OPEN: { label: 'Half-Open', class: 'half_open', icon: '◐', desc: 'Testing recovery — limited requests are allowed through to check if service is back.' },
            DISABLED: { label: 'Disabled', class: 'closed', icon: '○', desc: 'Circuit breaker is disabled.' },
            FORCED_OPEN: { label: 'Forced Open', class: 'open', icon: '⊘', desc: 'Manually forced open by an administrator.' },
            METRICS_ONLY: { label: 'Metrics Only', class: 'closed', icon: '◉', desc: 'Monitoring only — not blocking any calls.' },
        };
        return states[state] || states.CLOSED;
    };

    const getFailureRateClass = (rate, threshold) => {
        if (rate < 0) return 'low';
        if (rate >= threshold) return 'high';
        if (rate >= threshold * 0.6) return 'medium';
        return 'low';
    };

    const formatRate = (rate) => rate < 0 ? '0' : rate.toFixed(1);

    // ── Render ───────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="system-health">
                <div className="sh-loading">
                    <div className="sh-loading-spinner" />
                    <p>Loading system health data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="system-health">
                <header className="sh-header">
                    <div className="sh-header-left">
                        <BackButton />
                        <h1>System Health</h1>
                    </div>
                </header>
                <div className="sh-error">
                    <Icon name="x" size={48} color="#f87171" />
                    <h2>Unable to Load</h2>
                    <p>{error}</p>
                    <button className="sh-refresh-btn" onClick={handleRefresh}>
                        <Icon name="refresh" size={16} /> Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="system-health">
            {/* Header */}
            <header className="sh-header">
                <div className="sh-header-left">
                    <BackButton />
                    <h1>
                        <Icon name="chart" size={28} className="header-icon" />
                        System Health
                    </h1>
                </div>
                <div className="sh-header-actions">
                    <div className="sh-auto-refresh">
                        <input
                            type="checkbox"
                            id="autoRefresh"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <label htmlFor="autoRefresh">Auto-refresh (10s)</label>
                    </div>
                    {lastUpdated && (
                        <span className="sh-last-updated">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        className={`sh-refresh-btn ${refreshing ? 'spinning' : ''}`}
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <Icon name="refresh" size={16} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </header>

            {/* Health Banner */}
            <div className={`sh-health-banner ${overallHealth}`}>
                <div className="sh-health-icon">
                    {overallHealth === 'healthy' && '✓'}
                    {overallHealth === 'degraded' && '◐'}
                    {overallHealth === 'critical' && '✕'}
                </div>
                <div className="sh-health-text">
                    <h2>{healthText[overallHealth].title}</h2>
                    <p>{healthText[overallHealth].desc}</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="sh-stats-row">
                <div className="sh-stat-card glass-card">
                    <div className="sh-stat-value blue">{totalBreakers}</div>
                    <div className="sh-stat-label">Total Breakers</div>
                </div>
                <div className="sh-stat-card glass-card">
                    <div className="sh-stat-value green">{closedCount}</div>
                    <div className="sh-stat-label">Closed (Healthy)</div>
                </div>
                <div className="sh-stat-card glass-card">
                    <div className="sh-stat-value red">{openCount}</div>
                    <div className="sh-stat-label">Open (Failing)</div>
                </div>
                <div className="sh-stat-card glass-card">
                    <div className="sh-stat-value yellow">{halfOpenCount}</div>
                    <div className="sh-stat-label">Half-Open (Testing)</div>
                </div>
            </div>

            {/* Circuit Breaker Cards */}
            <h3 className="sh-breakers-section-title">
                <Icon name="trending" size={20} /> Circuit Breakers
            </h3>

            <div className="sh-breakers-grid">
                {breakers.map((cb) => {
                    const stateInfo = getStateInfo(cb.state);
                    const failureRate = cb.failureRate ?? -1;
                    const threshold = cb.failureRateThreshold ?? 50;
                    const displayRate = parseFloat(formatRate(failureRate));

                    // Resolve service reachability for wire/node colors
                    const isReachable = cb.serviceReachable;
                    const isProbeConfigured = cb.serviceReachable !== null && cb.serviceReachable !== undefined;

                    // Wire animation: reflects actual reachability if probe exists
                    const wireClass = cb.state === 'OPEN' ? 'blocked'
                        : cb.state === 'HALF_OPEN' ? 'testing'
                            : (isProbeConfigured && !isReachable) ? 'blocked' : 'flowing';

                    const sourceClass = 'active';
                    const breakerClass = cb.state === 'CLOSED'
                        ? (isProbeConfigured && !isReachable ? 'warning' : 'success')
                        : cb.state === 'OPEN' ? 'danger' : 'warning';
                    const serviceClass = isProbeConfigured
                        ? (isReachable ? 'success' : 'danger')
                        : (cb.state === 'CLOSED' ? 'success' : 'danger');

                    // Top border color reflects real health
                    const cardStateClass = cb.state === 'OPEN' ? 'open'
                        : (isProbeConfigured && !isReachable) ? 'open'
                            : cb.state === 'HALF_OPEN' ? 'half_open' : 'closed';

                    return (
                        <div key={cb.name} className={`sh-breaker-card glass-card state-${cardStateClass}`}>
                            <div className="sh-breaker-card-inner">
                                {/* Header with CB state + Live Status */}
                                <div className="sh-breaker-header">
                                    <div>
                                        <div className="sh-breaker-name">{cb.name}</div>
                                        <div className="sh-breaker-desc">{getServiceDescription(cb.name)}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {/* Live Service Status Badge */}
                                        {isProbeConfigured && (
                                            <div className={`sh-state-badge ${isReachable ? 'closed' : 'open'}`}
                                                title={cb.serviceHealthMessage}
                                            >
                                                <span className="sh-state-dot" />
                                                {isReachable ? 'Online' : 'Offline'}
                                            </div>
                                        )}
                                        {!isProbeConfigured && (
                                            <div className="sh-state-badge half_open" title="No health probe configured">
                                                <span className="sh-state-dot" />
                                                Unknown
                                            </div>
                                        )}
                                        {/* Circuit Breaker State Badge */}
                                        <div className={`sh-state-badge ${stateInfo.class}`}>
                                            <span className="sh-state-dot" />
                                            CB: {stateInfo.label}
                                        </div>
                                    </div>
                                </div>

                                {/* Live Health Probe Message */}
                                {isProbeConfigured && (
                                    <div className={`sh-service-probe ${isReachable ? 'online' : 'offline'}`}>
                                        <span className="sh-probe-indicator" />
                                        <span className="sh-probe-text">
                                            {cb.serviceHealthMessage}
                                            {cb.serviceLatencyMs != null && isReachable && (
                                                <span className="sh-probe-latency"> ({cb.serviceLatencyMs}ms)</span>
                                            )}
                                        </span>
                                    </div>
                                )}

                                {/* Circuit Diagram */}
                                <div className="sh-circuit-visual">
                                    <div className={`sh-circuit-node ${sourceClass}`}>
                                        <div className="sh-circuit-node-circle">⚡</div>
                                        <span className="sh-circuit-node-label">Request</span>
                                    </div>
                                    <div className={`sh-circuit-wire ${wireClass}`} />
                                    <div className={`sh-circuit-node ${breakerClass}`}>
                                        <div className="sh-circuit-node-circle">{stateInfo.icon}</div>
                                        <span className="sh-circuit-node-label">Breaker</span>
                                    </div>
                                    <div className={`sh-circuit-wire ${wireClass}`} />
                                    <div className={`sh-circuit-node ${serviceClass}`}>
                                        <div className="sh-circuit-node-circle">
                                            {isProbeConfigured ? (isReachable ? '☁' : '✕') : '☁'}
                                        </div>
                                        <span className="sh-circuit-node-label">Service</span>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="sh-metrics-grid">
                                    <div className="sh-metric-item">
                                        <span className="sh-metric-number success">
                                            {cb.successfulCalls ?? 0}
                                        </span>
                                        <span className="sh-metric-label">Successful</span>
                                    </div>
                                    <div className="sh-metric-item">
                                        <span className="sh-metric-number danger">
                                            {cb.failedCalls ?? 0}
                                        </span>
                                        <span className="sh-metric-label">Failed</span>
                                    </div>
                                    <div className="sh-metric-item">
                                        <span className={`sh-metric-number ${(cb.notPermittedCalls ?? 0) > 0 ? 'danger' : 'neutral'}`}>
                                            {cb.notPermittedCalls ?? 0}
                                        </span>
                                        <span className="sh-metric-label">Rejected</span>
                                    </div>
                                </div>

                                {/* Failure Rate Bar */}
                                <div className="sh-failure-rate-section">
                                    <div className="sh-failure-rate-header">
                                        <span className="sh-failure-rate-label">Failure Rate</span>
                                        <span className="sh-failure-rate-value"
                                            style={{ color: getFailureRateClass(displayRate, threshold) === 'high' ? '#f87171' : getFailureRateClass(displayRate, threshold) === 'medium' ? '#fbbf24' : '#34d399' }}
                                        >
                                            {formatRate(failureRate)}% / {threshold}%
                                        </span>
                                    </div>
                                    <div className="sh-failure-rate-bar">
                                        <div
                                            className={`sh-failure-rate-fill ${getFailureRateClass(displayRate, threshold)}`}
                                            style={{ width: `${Math.max(displayRate, 0)}%` }}
                                        />
                                        <div
                                            className="sh-failure-threshold"
                                            style={{ left: `${threshold}%` }}
                                        >
                                            <span className="sh-failure-threshold-label">Threshold</span>
                                        </div>
                                    </div>
                                </div>

                                {/* State Description */}
                                <div className="sh-state-description">
                                    <span className="sh-state-description-icon">
                                        <Icon name="info" size={16} color="rgba(255,255,255,0.4)" />
                                    </span>
                                    {cb.stateDescription || stateInfo.desc}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SystemHealth;
