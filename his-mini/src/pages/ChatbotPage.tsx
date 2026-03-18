import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, LogIn, Loader2, Wifi, WifiOff } from 'lucide-react';
import { loginXClaw, chatXClaw } from '../api';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

export function ChatbotPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Xin chào! Tôi là trợ lý AI của xClaw. Tôi có thể giúp bạn tra cứu thông tin thuốc, kiểm tra tương tác thuốc, hoặc trả lời câu hỏi về y khoa.\n\nHãy đăng nhập xClaw để bắt đầu trò chuyện.', timestamp: new Date() },
    ]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const [showLogin, setShowLogin] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) return;
        setLoginLoading(true);
        setLoginError('');
        try {
            const res = await loginXClaw(email, password);
            if ('token' in res && res.token) {
                setToken(res.token);
                setShowLogin(false);
                setMessages((prev) => [...prev, {
                    role: 'system',
                    content: `✅ Đã đăng nhập thành công với ${email}. Bạn có thể bắt đầu trò chuyện.`,
                    timestamp: new Date(),
                }]);
            } else {
                setLoginError('error' in res ? res.error : 'Đăng nhập thất bại');
            }
        } catch {
            setLoginError('Không thể kết nối tới xClaw server');
        } finally {
            setLoginLoading(false);
        }
    };

    const send = async () => {
        const text = input.trim();
        if (!text || sending) return;
        if (!token) { setShowLogin(true); return; }

        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: new Date() }]);
        setSending(true);

        try {
            const res = await chatXClaw(token, text, sessionId);
            setSessionId(res.sessionId);
            setMessages((prev) => [...prev, {
                role: 'assistant',
                content: res.content || '(Không có phản hồi)',
                timestamp: new Date(),
            }]);
        } catch {
            setMessages((prev) => [...prev, {
                role: 'assistant',
                content: '⚠️ Không thể kết nối tới xClaw AI. Kiểm tra server hoặc đăng nhập lại.',
                timestamp: new Date(),
            }]);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--his-border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--his-primary-soft)' }}>
                    <Bot size={20} style={{ color: 'var(--his-primary)' }} />
                </div>
                <div className="flex-1">
                    <h1 className="text-sm font-bold" style={{ color: 'var(--his-fg)' }}>AI Chatbot — xClaw</h1>
                    <p className="text-[10px]" style={{ color: 'var(--his-fg-muted)' }}>Trợ lý AI chuyên khoa dược & y khoa</p>
                </div>
                <div className="flex items-center gap-2">
                    {token ? (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full" style={{ background: 'var(--his-success-soft)', color: 'var(--his-success)' }}>
                            <Wifi size={10} /> Đã kết nối
                        </span>
                    ) : (
                        <button
                            onClick={() => setShowLogin(true)}
                            className="his-btn his-btn-sm his-btn-primary"
                        >
                            <LogIn size={14} /> Đăng nhập
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                        {m.role !== 'user' && (
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: m.role === 'system' ? 'var(--his-success-soft)' : 'var(--his-primary-soft)' }}>
                                <Bot size={14} style={{ color: m.role === 'system' ? 'var(--his-success)' : 'var(--his-primary)' }} />
                            </div>
                        )}
                        <div
                            className="rounded-xl px-4 py-2.5 max-w-[70%] text-xs leading-relaxed whitespace-pre-wrap"
                            style={{
                                background: m.role === 'user' ? 'var(--his-primary)' : m.role === 'system' ? 'var(--his-success-soft)' : 'var(--his-surface)',
                                color: m.role === 'user' ? '#fff' : 'var(--his-fg)',
                                border: m.role === 'assistant' ? '1px solid var(--his-border)' : 'none',
                            }}
                        >
                            {m.content}
                        </div>
                        {m.role === 'user' && (
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--his-fg)', color: '#fff' }}>
                                <User size={14} />
                            </div>
                        )}
                    </div>
                ))}
                {sending && (
                    <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--his-primary-soft)' }}>
                            <Bot size={14} style={{ color: 'var(--his-primary)' }} />
                        </div>
                        <div className="rounded-xl px-4 py-2.5 text-xs flex items-center gap-2" style={{ background: 'var(--his-surface)', border: '1px solid var(--his-border)', color: 'var(--his-fg-muted)' }}>
                            <Loader2 size={12} className="animate-spin" /> Đang suy nghĩ...
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--his-border)' }}>
                <div className="flex gap-2">
                    <input
                        className="his-input flex-1"
                        style={{ fontSize: '13px' }}
                        placeholder={token ? 'Hỏi về thuốc, tương tác, dị ứng...' : 'Đăng nhập để bắt đầu trò chuyện...'}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && send()}
                    />
                    <button
                        onClick={send}
                        disabled={sending || !input.trim()}
                        className="his-btn his-btn-primary"
                        style={{ opacity: sending || !input.trim() ? 0.5 : 1 }}
                    >
                        <Send size={16} />
                    </button>
                </div>
                {!token && (
                    <p className="text-[10px] mt-2 text-center flex items-center justify-center gap-1" style={{ color: 'var(--his-fg-muted)' }}>
                        <WifiOff size={10} /> Chưa kết nối — nhấn Đăng nhập để kết nối xClaw AI
                    </p>
                )}
            </div>

            {/* Login Modal */}
            {showLogin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="rounded-xl border p-6 w-[380px] shadow-xl" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--his-primary-soft)' }}>
                                <Bot size={20} style={{ color: 'var(--his-primary)' }} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold" style={{ color: 'var(--his-fg)' }}>Đăng nhập xClaw</h3>
                                <p className="text-[10px]" style={{ color: 'var(--his-fg-muted)' }}>Kết nối với AI Agent server</p>
                            </div>
                        </div>

                        {loginError && (
                            <div className="rounded-lg p-2 mb-3 text-xs" style={{ background: 'var(--his-danger-soft)', color: 'var(--his-danger)' }}>
                                {loginError}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="his-label">Email</label>
                                <input className="his-input" placeholder="admin@xclaw.ai" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div>
                                <label className="his-label">Mật khẩu</label>
                                <input className="his-input" type="password" placeholder="••••••••" value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            <button onClick={() => setShowLogin(false)} className="his-btn his-btn-sm his-btn-ghost">Huỷ</button>
                            <button onClick={handleLogin} disabled={loginLoading || !email.trim() || !password.trim()} className="his-btn his-btn-sm his-btn-primary">
                                {loginLoading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                                Đăng nhập
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
