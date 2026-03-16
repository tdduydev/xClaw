// ============================================================
// ChatPanel - AI chat interface
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../stores';
import { api } from '../../utils/api';
import { Send, Trash2, Bot, User, Loader2 } from 'lucide-react';

export function ChatPanel() {
    const [input, setInput] = useState('');
    const messages = useChatStore(s => s.messages);
    const sessionId = useChatStore(s => s.sessionId);
    const isLoading = useChatStore(s => s.isLoading);
    const addMessage = useChatStore(s => s.addMessage);
    const setLoading = useChatStore(s => s.setLoading);
    const clearMessages = useChatStore(s => s.clearMessages);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        setInput('');
        addMessage({
            id: crypto.randomUUID(),
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        });

        setLoading(true);
        try {
            const res = await api.chat(sessionId, text);
            addMessage({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: res.response,
                timestamp: new Date().toISOString(),
            });
        } catch (err: unknown) {
            addMessage({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
                timestamp: new Date().toISOString(),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-dark-700">
                <div className="flex items-center gap-2">
                    <Bot size={20} className="text-primary-400" />
                    <h2 className="font-semibold text-white">AutoX Chat</h2>
                </div>
                <button
                    onClick={clearMessages}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition"
                    title="Clear chat"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <Bot size={48} className="mb-4 opacity-30" />
                        <p className="text-lg font-medium">AutoX Agent</p>
                        <p className="text-sm mt-1">Send a message to start a conversation</p>
                    </div>
                )}

                {messages.map(msg => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                                <Bot size={16} className="text-primary-400" />
                            </div>
                        )}
                        <div
                            className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-dark-800 text-slate-200 border border-dark-700'
                                }`}
                        >
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                            <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-primary-200' : 'text-slate-500'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                                <User size={16} className="text-white" />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                            <Bot size={16} className="text-primary-400" />
                        </div>
                        <div className="bg-dark-800 border border-dark-700 rounded-xl px-4 py-3">
                            <Loader2 size={16} className="animate-spin text-primary-400" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-dark-700">
                <div className="flex items-end gap-2 bg-dark-800 border border-dark-700 rounded-xl p-2 focus-within:border-primary-500 transition">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 resize-none outline-none px-2 py-1 max-h-32"
                        style={{ minHeight: '36px' }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="p-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
