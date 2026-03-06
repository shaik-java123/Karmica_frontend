import React from 'react';

/**
 * A reusable Icon component with built-in SVG paths for common HRMS icons.
 * This replaces emojis and ensures high-quality, controllable icons.
 */
const Icon = ({ name, className = '', color = 'currentColor', size = 24 }) => {
    const icons = {
        users: (
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        ),
        building: (
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2m12-10h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2M10 22v-4a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v4M10 6h4M10 10h4M10 14h4" />
        ),
        chart: (
            <path d="M3 3v18h18M18 17l-3-3-3 3-4-4" />
        ),
        folder: (
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        ),
        calendar: (
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        ),
        trending: (
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        ),
        check: (
            <polyline points="20 6 9 17 4 12" />
        ),
        clock: (
            <circle cx="12" cy="12" r="10" />
        ),
        tasks: (
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m4-2v4m-3-2h6" />
        ),
        target: (
            <circle cx="12" cy="12" r="10" />
        ),
        school: (
            <path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
        ),
        announce: (
            <path d="M18 8a3 3 0 0 1 0 6M10 8v11a1 1 0 0 1-2 0v-5H4a2 2 0 1 1 0-4h4V8a5 5 0 0 1 10 0z" />
        ),
        money: (
            <rect x="2" y="6" width="20" height="12" rx="2" />
        ),
        briefcase: (
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        ),
        search: (
            <circle cx="11" cy="11" r="8" />
        ),
        flame: (
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.3-2.35.8-3.35 1.1 2.1 2.9 3.35 3.7 3.85z" />
        ),
        star: (
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        ),
        award: (
            <circle cx="12" cy="8" r="7" />
        ),
        info: (
            <circle cx="12" cy="12" r="10" />
        ),
        edit: (
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        ),
        trash: (
            <polyline points="3 6 5 6 21 6" />
        ),
        back: (
            <polyline points="15 18 9 12 15 6" />
        ),
        logout: (
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        ),
        bell: (
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        ),
        palm: (
            <path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8c0 1.66.89 3.08 2.24 3.93" />
        ),
        plus: (
            <path d="M12 5v14M5 12h14" />
        ),
        loading: (
            <circle cx="12" cy="12" r="10" />
        ),
        printer: (
            <polyline points="6 9 6 2 18 2 18 9" />
        ),
        refresh: (
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        ),
        moon: (
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        ),
        sun: (
            <circle cx="12" cy="12" r="5" />
        ),
        x: (
            <path d="M18 6L6 18M6 6l12 12" />
        )
    };

    // More complex paths for certain icons
    const specialIcons = {
        calendar: (
            <g>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth="2" fill="none" />
                <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2" />
                <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2" />
                <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2" />
            </g>
        ),
        clock: (
            <g>
                <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
                <polyline points="12 6 12 12 16 14" stroke={color} strokeWidth="2" fill="none" />
            </g>
        ),
        money: (
            <g>
                <rect x="2" y="6" width="20" height="12" rx="2" stroke={color} strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="2" stroke={color} strokeWidth="2" fill="none" />
                <path d="M6 12h.01M18 12h.01" stroke={color} strokeWidth="2" />
            </g>
        ),
        search: (
            <g>
                <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" fill="none" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth="2" />
            </g>
        ),
        tasks: (
            <g>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke={color} strokeWidth="2" fill="none" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke={color} strokeWidth="2" fill="none" />
            </g>
        ),
        trash: (
            <g>
                <polyline points="3 6 5 6 21 6" stroke={color} strokeWidth="2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="2" fill="none" />
            </g>
        ),
        target: (
            <g>
                <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="2" stroke={color} strokeWidth="2" fill="none" />
            </g>
        ),
        award: (
            <g>
                <circle cx="12" cy="8" r="7" stroke={color} strokeWidth="2" fill="none" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" stroke={color} strokeWidth="2" fill="none" />
            </g>
        ),
        info: (
            <g>
                <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
                <line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth="2" />
                <line x1="12" y1="8" x2="12.01" y2="8" stroke={color} strokeWidth="2" />
            </g>
        ),
        printer: (
            <g>
                <polyline points="6 9 6 2 18 2 18 9" stroke={color} strokeWidth="2" fill="none" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke={color} strokeWidth="2" fill="none" />
                <rect x="6" y="14" width="12" height="8" stroke={color} strokeWidth="2" fill="none" />
            </g>
        ),
        sun: (
            <g stroke={color} strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="5" fill="none" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </g>
        ),
        refresh: (
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        )
    };

    const iconContent = specialIcons[name] || (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {icons[name] || icons.users}
        </g>
    );

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={`lucide-icon ${className}`}
        >
            {iconContent}
        </svg>
    );
};

export default Icon;
