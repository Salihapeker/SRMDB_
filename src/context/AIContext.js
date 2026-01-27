import React, { createContext, useState, useContext, useCallback } from 'react';

const AIContext = createContext();

export const useAI = () => {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error('useAI must be used within an AIProvider');
    }
    return context;
};

export const AIProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Merhaba! Ben senin Sinema Asistanınım. Şu an incelediğin film hakkında bana soru sorabilirsin.", sender: 'ai' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentContext, setCurrentContext] = useState(null); // { type: 'movie', id: 123, title: 'Inception' }

    const toggleChat = useCallback(() => setIsOpen(prev => !prev), []);

    const setContext = useCallback((context) => {
        setCurrentContext(context);
        // Context değiştiğinde isteğe bağlı olarak bir karşılama mesajı eklenebilir
        // setMessages([{ text: `Merhaba! ${context.title} hakkında ne bilmek istersin?`, sender: 'ai' }]);
    }, []);

    const addMessage = useCallback((text, sender = 'user') => {
        setMessages(prev => [...prev, { id: Date.now(), text, sender }]);
    }, []);

    const clearHistory = useCallback(() => {
        setMessages([{ id: Date.now(), text: "Sohbet temizlendi. Nasıl yardımcı olabilirim?", sender: 'ai' }]);
    }, []);

    return (
        <AIContext.Provider value={{
            isOpen,
            toggleChat,
            messages,
            addMessage,
            isLoading,
            setIsLoading,
            currentContext,
            setContext,
            clearHistory
        }}>
            {children}
        </AIContext.Provider>
    );
};
