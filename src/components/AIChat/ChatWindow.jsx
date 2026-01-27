import React, { useState, useEffect, useRef } from 'react';
import { useAI } from '../../context/AIContext';
import { useTheme } from '../../App';
import API from '../../services/api';
import './ChatWindow.css';

const ChatWindow = () => {
    const { isOpen, toggleChat, messages, addMessage, isLoading, setIsLoading, currentContext } = useAI();
    const { isDarkMode } = useTheme();
    const messagesEndRef = useRef(null);
    const [input, setInput] = useState('');

    useEffect(() => {
        console.log("ChatWindow mounted");
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input;
        addMessage(userMessage, 'user');
        setInput('');
        setIsLoading(true);

        try {
            // Context bilgisini ekle
            const contextPrompt = currentContext
                ? `[Context: User is viewing ${currentContext.type}: ${currentContext.title}] `
                : '';

            // Filter history to ensure it complies with Gemini API (must start with User)
            // We skip the first message if it's the welcome message from AI
            const validHistory = messages
                .filter(m => m.sender !== 'ai' || m.id !== messages[0].id) // Simple check: exclude first message if AI
                .filter((_, i) => i < messages.length - 1) // Exclude the message we just added (it's sent as 'message' param)
                .map(m => ({
                    role: m.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                }));

            // Gemini API expects history, but we are sending the last message separately as 'message'
            // So validHistory should only contain previous exchange. 
            // However, our addMessage adds it to state immediately.
            // Let's refine: validHistory should be ALL previous messages except the one we just typed.

            const historyForApi = messages
                .filter(m => m.text !== userMessage) // Exclude current message (it might not be unique but mostly works for this simple app)
                .filter((_, index) => index > 0) // Skip the very first welcome message
                .map(m => ({
                    role: m.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                }));

            const response = await API.post('/api/ai/chat', {
                message: contextPrompt + userMessage,
                history: historyForApi
            });

            if (response.data && response.data.reply) {
                addMessage(response.data.reply, 'ai');
            } else {
                addMessage("Üzgünüm, şu an cevap veremiyorum.", 'ai');
            }
        } catch (error) {
            console.error("Chat Error:", error);
            addMessage("Bir hata oluştu. Lütfen tekrar deneyin.", 'ai');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <div className={`ai-fab ${isOpen ? 'hidden' : ''}`} onClick={toggleChat}>
                <div className="ai-icon">✨</div>
                <span className="ai-fab-text">Ask AI</span>
            </div>

            {/* Chat Window */}
            <div className={`ai-chat-window ${isOpen ? 'open' : ''} ${isDarkMode ? 'dark' : 'light'}`}>
                <div className="ai-header">
                    <div className="ai-header-title">
                        <span className="ai-status-dot"></span>
                        <h3>AI Cinema Assistant</h3>
                    </div>
                    <button className="ai-close-btn" onClick={toggleChat}>×</button>
                </div>

                <div className="ai-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.sender}`}>
                            <div className="message-content">
                                {msg.text}
                            </div>
                            <div className="message-time">
                                {new Date(msg.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message ai loading">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="ai-input-area" onSubmit={handleSend}>
                    <input
                        type="text"
                        placeholder="Film hakkında soru sor..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={!input.trim() || isLoading}>
                        ➤
                    </button>
                </form>
            </div>
        </>
    );
};

export default ChatWindow;
