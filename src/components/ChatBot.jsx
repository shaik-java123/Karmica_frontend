import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatbotAPI } from '../services/api';
import './ChatBot.css';

/* ── Utility helpers ──────────────────────────── */
const formatTime = (date) =>
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

/** Converts basic markdown-style syntax into safe HTML spans */
const renderMarkdown = (text) => {
    if (!text) return '';
    return text
        // Bold **text**
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic *text*
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Inline code `code`
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bullet points  "- text" → bullet
        .replace(/^- (.+)$/gm, '• $1')
        // Line breaks
        .replace(/\n/g, '<br/>');
};

/* ── Quick suggestion chips ─────────────────── */
const SUGGESTIONS = [
    '📅 How to apply leave?',
    '💰 View my salary slip',
    '✅ Check-in for today',
    '📊 What is an appraisal cycle?',
    '📋 My pending tasks',
    '🏠 Navigate dashboard',
];

/* ── Initial bot greeting ───────────────────── */
const buildGreeting = (name) => ({
    id: 'greeting',
    role: 'bot',
    content: `Hi ${name ? name + '!' : 'there! 👋'}  \nI'm **Karma**, your Karmika HR Assistant.  \nI can help you navigate the system, answer HR policy questions, and guide you through features.  \nWhat can I help you with today?`,
    timestamp: new Date(),
});

/* ── ChatBot Component ──────────────────────── */
const ChatBot = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [hasNewMsg, setHasNewMsg] = useState(true); // show badge initially
    const [apiError, setApiError] = useState(null);

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const historyRef = useRef([]); // keep history without re-renders

    // Initialise greeting on mount / user change
    useEffect(() => {
        const displayName = user?.employeeName || user?.username || '';
        const firstName = displayName.split(' ')[0];
        setMessages([buildGreeting(firstName)]);
    }, [user]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Auto-resize textarea
    const handleTextareaInput = (e) => {
        setInputText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    };

    const openChat = () => {
        setIsOpen(true);
        setIsClosing(false);
        setHasNewMsg(false);
        setTimeout(() => textareaRef.current?.focus(), 350);
    };

    const closeChat = () => {
        setIsClosing(true);
        setTimeout(() => { setIsOpen(false); setIsClosing(false); }, 250);
    };

    const toggleChat = () => (isOpen ? closeChat() : openChat());

    /* ── Send message ──────────────────────── */
    const sendMessage = useCallback(async (text) => {
        const trimmed = (text || inputText).trim();
        if (!trimmed || isTyping) return;

        setInputText('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        setApiError(null);

        // Add user message to UI
        const userMsg = { id: Date.now(), role: 'user', content: trimmed, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);

        // ✅ Snapshot BEFORE pushing current message — backend will add it as the final turn
        const historySnapshot = historyRef.current.slice(-12);

        // Now push current user message into history (for future turns)
        historyRef.current = [...historyRef.current, { role: 'user', content: trimmed }];

        setIsTyping(true);

        try {
            // historySnapshot does NOT include the current message; backend appends it
            const response = await chatbotAPI.chat(trimmed, historySnapshot);
            const botReply = response.data?.reply || "I'm not sure I understood that. Could you rephrase?";

            const botMsg = { id: Date.now() + 1, role: 'bot', content: botReply, timestamp: new Date() };
            setMessages(prev => [...prev, botMsg]);

            // Add bot reply to history for next turn's context
            historyRef.current = [...historyRef.current, { role: 'model', content: botReply }];
        } catch (err) {
            const errText = err.response?.data?.error
                || err.response?.data?.details
                || 'Connection error. Please try again.';
            setApiError(errText);
            // Roll back the user message from history on error
            historyRef.current = historyRef.current.slice(0, -1);
        } finally {
            setIsTyping(false);
        }
    }, [inputText, isTyping]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleClearChat = () => {
        const displayName = user?.employeeName || user?.username || '';
        const firstName = displayName.split(' ')[0];
        setMessages([buildGreeting(firstName)]);
        historyRef.current = [];
        setApiError(null);
    };

    return (
        <div className="chatbot-launcher">
            {/* ── Chat Window ─────────────────── */}
            {(isOpen || isClosing) && (
                <div className={`chatbot-window${isClosing ? ' closing' : ''}`}
                    role="dialog"
                    aria-label="Karma HR Assistant">

                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-avatar">
                            🤖
                            <span className="chatbot-avatar-status" />
                        </div>
                        <div className="chatbot-header-info">
                            <div className="chatbot-header-name">Karma — HR Assistant</div>
                            <div className="chatbot-header-status">Online · Powered by Gemini AI</div>
                        </div>
                        <div className="chatbot-header-actions">
                            <button
                                className="chatbot-header-btn"
                                title="Clear chat"
                                onClick={handleClearChat}
                            >
                                🗑
                            </button>
                            <button
                                className="chatbot-header-btn"
                                title="Close"
                                onClick={closeChat}
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Quick Suggestions */}
                    <div className="chatbot-suggestions">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                className="chatbot-suggestion-chip"
                                onClick={() => sendMessage(s.replace(/^[^\s]+ /, ''))}
                                disabled={isTyping}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        <div className="chatbot-date-divider">Today</div>

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`chatbot-message ${msg.role === 'user' ? 'user' : 'bot'}`}
                            >
                                <div className="chatbot-msg-avatar">
                                    {msg.role === 'bot' ? '🤖' : '👤'}
                                </div>
                                <div>
                                    <div
                                        className="chatbot-bubble"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                    />
                                    <div className="chatbot-bubble-time">{formatTime(msg.timestamp)}</div>
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="chatbot-typing">
                                <div className="chatbot-msg-avatar">🤖</div>
                                <div className="chatbot-typing-bubble">
                                    <span className="chatbot-typing-dot" />
                                    <span className="chatbot-typing-dot" />
                                    <span className="chatbot-typing-dot" />
                                </div>
                            </div>
                        )}

                        {/* API Error */}
                        {apiError && (
                            <div className="chatbot-error-msg">
                                ⚠️ {apiError}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="chatbot-input-area">
                        <textarea
                            ref={textareaRef}
                            className="chatbot-textarea"
                            placeholder="Ask Karma anything… (Enter to send)"
                            value={inputText}
                            onChange={handleTextareaInput}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={isTyping}
                            aria-label="Chat message input"
                        />
                        <button
                            className="chatbot-send-btn"
                            onClick={() => sendMessage()}
                            disabled={!inputText.trim() || isTyping}
                            title="Send message"
                            aria-label="Send message"
                        >
                            {isTyping ? '⏳' : '➤'}
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="chatbot-footer">
                        Powered by <span>Google Gemini</span> · Karmika HRMS
                    </div>
                </div>
            )}

            {/* ── Floating Action Button ───────── */}
            <button
                className={`chatbot-fab${isOpen ? ' open' : ''}`}
                onClick={toggleChat}
                title="Chat with Karma AI"
                aria-label="Open HR Assistant"
            >
                <div className="chatbot-pulse-ring" />
                {hasNewMsg && !isOpen && (
                    <span className="chatbot-fab-badge">1</span>
                )}
                <span className="chatbot-fab-icon">
                    {isOpen ? '✕' : '🤖'}
                </span>
            </button>
        </div>
    );
};

export default ChatBot;
