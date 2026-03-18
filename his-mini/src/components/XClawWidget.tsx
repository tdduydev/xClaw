import { useState, useRef, useEffect, type FormEvent } from 'react';
import { MessageSquare, X, Minimize2, Maximize2, Loader2, Send, Bot, Trash2 } from 'lucide-react';
import { loginXClaw, chatXClaw } from '../api';
import type { PatientContext } from '../App';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

function buildSystemMsg(pc: PatientContext): ChatMessage {
    return {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: `📋 Đang xem hồ sơ: ${pc.name} (${pc.gender === 'male' ? 'Nam' : 'Nữ'}, ${pc.birthDate})\n` +
            (pc.allergies.length > 0 ? `⚠️ Dị ứng: ${pc.allergies.join(', ')}\n` : '✅ Không có dị ứng\n') +
            (pc.prescriptions.length > 0 ? `💊 Đơn thuốc: ${pc.prescriptions.join(', ')}` : '📝 Chưa có đơn thuốc'),
        timestamp: new Date(),
    };
}

export function XClawWidget({ patientContext }: { patientContext: PatientContext | null }) {
    const [open, setOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const [lastPatientId, setLastPatientId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Pulse
    const [pulse, setPulse] = useState(true);
    useEffect(() => { const t = setTimeout(() => setPulse(false), 5000); return () => clearTimeout(t); }, []);

    // Auto-scroll
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, loading]);

    // Patient context changed while widget is open
    useEffect(() => {
        if (patientContext && patientContext.id !== lastPatientId && open) {
            setLastPatientId(patientContext.id);
            setSessionId(`his-${patientContext.id}-${Date.now()}`);
            setMessages([buildSystemMsg(patientContext)]);
        }
    }, [patientContext, open, lastPatientId]);

    const ensureToken = async (): Promise<string> => {
        if (token) return token;
        const res = await loginXClaw('doctor@his.local', 'doctor123');
        if ('error' in res) throw new Error(res.error);
        setToken(res.token);
        return res.token;
    };

    const buildMessage = (userText: string): string => {
        if (!patientContext) return userText;
        return [
            `[Ngữ cảnh bệnh nhân HIS]`,
            `Họ tên: ${patientContext.name}`,
            `Giới tính: ${patientContext.gender === 'male' ? 'Nam' : patientContext.gender === 'female' ? 'Nữ' : 'Khác'}`,
            `Ngày sinh: ${patientContext.birthDate}`,
            `Dị ứng thuốc: ${patientContext.allergies.length > 0 ? patientContext.allergies.join(', ') : 'Không có'}`,
            `Đơn thuốc hiện tại: ${patientContext.prescriptions.length > 0 ? patientContext.prescriptions.join(', ') : 'Chưa có'}`,
            `[Câu hỏi của bác sĩ]`,
            userText,
        ].join('\n');
    };

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || loading) return;

        setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: new Date() }]);
        setInput('');
        setLoading(true);

        try {
            const t = await ensureToken();
            const res = await chatXClaw(t, buildMessage(text), sessionId, 'healthcare');
            if (res.sessionId) setSessionId(res.sessionId);
            setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: res.content, timestamp: new Date() }]);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
            setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: `❌ ${msg}`, timestamp: new Date() }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const clearChat = () => {
        setSessionId(`his-${Date.now()}`);
        setMessages(patientContext ? [buildSystemMsg(patientContext)] : []);
    };

    const handleOpen = () => {
        setOpen(true);
        if (patientContext && patientContext.id !== lastPatientId) {
            setLastPatientId(patientContext.id);
            setSessionId(`his-${patientContext.id}-${Date.now()}`);
            setMessages([buildSystemMsg(patientContext)]);
        }
    };

    const quickQuestions = patientContext ? [
        'Bệnh nhân này bệnh gì?',
        'Có tiền sử dị ứng không?',
        'Tóm tắt hồ sơ bệnh nhân',
    ] : [];

    return (
        <>
            {/* Floating Bubble */}
            {!open && (
                <button
                    onClick={handleOpen}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110"
                    style={{
                        background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                        animation: pulse ? 'widget-pulse 2s ease-in-out infinite' : undefined,
                    }}
                    title="Mở xClaw AI Assistant"
                >
                    <MessageSquare size={24} color="#fff" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[8px] font-bold flex items-center justify-center"
                        style={{ background: patientContext ? '#10b981' : '#6366f1', color: '#fff', border: '2px solid var(--his-bg)' }}>
                        {patientContext ? 'BN' : 'AI'}
                    </span>
                </button>
            )}

            {/* Chat Panel */}
            {open && (
                <div className="fixed z-50 flex flex-col shadow-2xl overflow-hidden transition-all"
                    style={{
                        bottom: '24px', right: '24px',
                        width: minimized ? '320px' : '420px',
                        height: minimized ? '48px' : '620px',
                        borderRadius: '16px',
                        border: '1px solid var(--his-border)',
                        background: 'var(--his-surface)',
                    }}>

                    {/* Header */}
                    <div className="flex items-center gap-2 px-4 py-2.5 shrink-0 cursor-pointer select-none"
                        style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                        onClick={() => setMinimized(!minimized)}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.2)' }}>
                            <MessageSquare size={14} color="#38bdf8" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-white">xClaw AI</span>
                            {patientContext && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded truncate"
                                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                    {patientContext.name}
                                </span>
                            )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); clearChat(); }}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer" title="Xoá chat">
                            <Trash2 size={13} color="#64748b" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer">
                            {minimized ? <Maximize2 size={14} color="#94a3b8" /> : <Minimize2 size={14} color="#94a3b8" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer">
                            <X size={14} color="#94a3b8" />
                        </button>
                    </div>

                    {/* Body */}
                    {!minimized && (
                        <>
                            {/* Messages Area */}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: 'var(--his-bg)' }}>
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                        <Bot size={32} style={{ color: 'var(--his-primary)', opacity: 0.5 }} />
                                        <p className="text-xs mt-3 font-medium" style={{ color: 'var(--his-fg-muted)' }}>
                                            {patientContext ? `Hỏi xClaw AI về ${patientContext.name}` : 'Chọn bệnh nhân để có ngữ cảnh'}
                                        </p>
                                        <p className="text-[10px] mt-1" style={{ color: 'var(--his-fg-muted)', opacity: 0.6 }}>
                                            Healthcare domain • xClaw v2
                                        </p>
                                    </div>
                                )}

                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'system' ? (
                                            <div className="w-full rounded-lg p-3 text-[11px] leading-relaxed border"
                                                style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderColor: '#bbf7d0', color: 'var(--his-fg)', whiteSpace: 'pre-line' }}>
                                                {msg.content}
                                            </div>
                                        ) : msg.role === 'user' ? (
                                            <div className="max-w-[80%] rounded-2xl rounded-br-md px-3 py-2 text-xs"
                                                style={{ background: 'var(--his-primary)', color: '#fff' }}>
                                                {msg.content}
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 max-w-[85%]">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                                    style={{ background: 'var(--his-primary-soft)' }}>
                                                    <Bot size={12} style={{ color: 'var(--his-primary)' }} />
                                                </div>
                                                <div className="rounded-2xl rounded-bl-md px-3 py-2 text-xs leading-relaxed border"
                                                    style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)', color: 'var(--his-fg)', whiteSpace: 'pre-wrap' }}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {loading && (
                                    <div className="flex gap-2">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                            style={{ background: 'var(--his-primary-soft)' }}>
                                            <Loader2 size={12} className="animate-spin" style={{ color: 'var(--his-primary)' }} />
                                        </div>
                                        <div className="rounded-2xl rounded-bl-md px-3 py-2 text-xs border"
                                            style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)', color: 'var(--his-fg-muted)' }}>
                                            Đang suy nghĩ...
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick Questions */}
                            {quickQuestions.length > 0 && messages.length <= 1 && (
                                <div className="px-4 py-2 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid var(--his-border)' }}>
                                    {quickQuestions.map((q) => (
                                        <button key={q} onClick={() => setInput(q)}
                                            className="text-[10px] px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                                            style={{ background: 'var(--his-primary-soft)', color: 'var(--his-primary)' }}>
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input */}
                            <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2.5"
                                style={{ borderTop: '1px solid var(--his-border)', background: 'var(--his-surface)' }}>
                                <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                                    placeholder={patientContext ? `Hỏi về ${patientContext.name}...` : 'Nhập câu hỏi...'}
                                    className="flex-1 bg-transparent outline-none text-xs" style={{ color: 'var(--his-fg)' }}
                                    disabled={loading} autoFocus />
                                <button type="submit" disabled={!input.trim() || loading}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-30 transition-colors"
                                    style={{ background: 'var(--his-primary)' }}>
                                    <Send size={14} color="#fff" />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}

            <style>{`
                @keyframes widget-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.4); }
                    50% { box-shadow: 0 0 0 12px rgba(14, 165, 233, 0); }
                }
            `}</style>
        </>
    );
}
