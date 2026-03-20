import { useState, useEffect } from 'react';
import {
    Bot, Plus, Trash2, Power, PowerOff, TestTube, RefreshCw,
    MessageSquare, ChevronRight, X, Eye, EyeOff, Send,
} from 'lucide-react';
import {
    getChannelTypes, getChannels, createChannel, deleteChannel,
    testChannel, activateChannel, deactivateChannel,
    getAgentSessions, getSessionMessages,
} from '../lib/api';

interface ChannelTypeInfo {
    id: string;
    name: string;
    icon: string;
    description: string;
    configFields: Array<{ key: string; label: string; type: string; required: boolean; placeholder?: string }>;
    setupGuide: string;
}

interface ChannelConnection {
    _id: string;
    channelType: string;
    name: string;
    config: Record<string, any>;
    status: string;
    lastConnectedAt?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

interface SessionInfo {
    _id: string;
    platform: string;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

interface MessageInfo {
    _id: string;
    sessionId: string;
    role: string;
    content: string;
    createdAt: string;
    metadata?: Record<string, any>;
}

export function AgentsPage() {
    const [channelTypes, setChannelTypes] = useState<ChannelTypeInfo[]>([]);
    const [channels, setChannels] = useState<ChannelConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedType, setSelectedType] = useState<ChannelTypeInfo | null>(null);
    const [addForm, setAddForm] = useState<{ name: string; config: Record<string, string> }>({ name: '', config: {} });
    const [adding, setAdding] = useState(false);

    // Sessions / Chat history
    const [tab, setTab] = useState<'channels' | 'history'>('channels');
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);
    const [messages, setMessages] = useState<MessageInfo[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [typesRes, channelsRes] = await Promise.all([
                getChannelTypes(),
                getChannels(),
            ]);
            setChannelTypes(typesRes.types || []);
            setChannels(channelsRes.channels || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    async function loadSessions() {
        setLoadingSessions(true);
        try {
            const res = await getAgentSessions();
            setSessions(res.sessions || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sessions');
        } finally {
            setLoadingSessions(false);
        }
    }

    async function loadMessages(session: SessionInfo) {
        setSelectedSession(session);
        try {
            const res = await getSessionMessages(session._id);
            setMessages(res.messages || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load messages');
        }
    }

    function openAddModal(type: ChannelTypeInfo) {
        setSelectedType(type);
        setAddForm({ name: `My ${type.name} Bot`, config: {} });
        setShowAddModal(true);
    }

    async function handleAdd() {
        if (!selectedType) return;
        setAdding(true);
        setError('');
        try {
            await createChannel({
                channelType: selectedType.id,
                name: addForm.name,
                config: addForm.config,
            });
            setSuccess(`${selectedType.name} channel created!`);
            setShowAddModal(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create channel');
        } finally {
            setAdding(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this channel connection?')) return;
        try {
            await deleteChannel(id);
            setSuccess('Channel deleted');
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        }
    }

    async function handleTest(id: string) {
        setError('');
        setSuccess('');
        try {
            const res = await testChannel(id);
            if (res.ok) {
                setSuccess(res.message || 'Connection verified!');
            } else {
                setError(res.message || 'Test failed');
            }
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Test failed');
        }
    }

    async function handleActivate(id: string) {
        try {
            const res = await activateChannel(id);
            setSuccess(res.message || 'Channel activated!');
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Activation failed');
        }
    }

    async function handleDeactivate(id: string) {
        try {
            await deactivateChannel(id);
            setSuccess('Channel deactivated');
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Deactivation failed');
        }
    }

    function getTypeInfo(typeId: string) {
        return channelTypes.find((t) => t.id === typeId);
    }

    const statusColor = (status: string) => {
        switch (status) {
            case 'active': return { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' };
            case 'error': return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' };
            default: return { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' };
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-fg)' }}>
                            <Bot size={28} style={{ color: 'var(--color-primary)' }} />
                            Agents
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>
                            Manage your AI agent channel connections — Telegram, Discord, Facebook, and more
                        </p>
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg transition-colors cursor-pointer"
                        style={{ color: 'var(--color-fg-muted)' }}
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-4 px-4 py-3 rounded-lg text-sm flex items-center justify-between" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                        {error}
                        <button onClick={() => setError('')} className="cursor-pointer"><X size={14} /></button>
                    </div>
                )}
                {success && (
                    <div className="mb-4 px-4 py-3 rounded-lg text-sm flex items-center justify-between" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                        {success}
                        <button onClick={() => setSuccess('')} className="cursor-pointer"><X size={14} /></button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--color-bg-soft)' }}>
                    <button
                        onClick={() => setTab('channels')}
                        className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer"
                        style={{
                            background: tab === 'channels' ? 'var(--color-bg-surface)' : 'transparent',
                            color: tab === 'channels' ? 'var(--color-fg)' : 'var(--color-fg-muted)',
                        }}
                    >
                        <Send size={14} className="inline mr-2" />
                        Channels
                    </button>
                    <button
                        onClick={() => { setTab('history'); loadSessions(); }}
                        className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer"
                        style={{
                            background: tab === 'history' ? 'var(--color-bg-surface)' : 'transparent',
                            color: tab === 'history' ? 'var(--color-fg)' : 'var(--color-fg-muted)',
                        }}
                    >
                        <MessageSquare size={14} className="inline mr-2" />
                        Chat History
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                    </div>
                ) : tab === 'channels' ? (
                    <>
                        {/* Connected Channels */}
                        {channels.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-fg)' }}>
                                    Connected Channels ({channels.length})
                                </h2>
                                <div className="grid gap-4">
                                    {channels.map((ch) => {
                                        const typeInfo = getTypeInfo(ch.channelType);
                                        const sc = statusColor(ch.status);
                                        return (
                                            <div
                                                key={ch._id}
                                                className="rounded-xl p-5 border"
                                                style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{typeInfo?.icon || '🔌'}</span>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold" style={{ color: 'var(--color-fg)' }}>{ch.name}</h3>
                                                                <span
                                                                    className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                                                                    style={{ background: sc.bg, color: sc.color }}
                                                                >
                                                                    {ch.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>
                                                                {typeInfo?.name} • Created {new Date(ch.createdAt).toLocaleDateString()}
                                                                {ch.metadata?.botUsername && ` • @${ch.metadata.botUsername}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleTest(ch._id)}
                                                            className="p-2 rounded-lg transition-colors cursor-pointer"
                                                            style={{ color: 'var(--color-fg-muted)' }}
                                                            title="Test Connection"
                                                        >
                                                            <TestTube size={16} />
                                                        </button>
                                                        {ch.status === 'active' ? (
                                                            <button
                                                                onClick={() => handleDeactivate(ch._id)}
                                                                className="p-2 rounded-lg transition-colors cursor-pointer"
                                                                style={{ color: '#ef4444' }}
                                                                title="Deactivate"
                                                            >
                                                                <PowerOff size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleActivate(ch._id)}
                                                                className="p-2 rounded-lg transition-colors cursor-pointer"
                                                                style={{ color: '#22c55e' }}
                                                                title="Activate"
                                                            >
                                                                <Power size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(ch._id)}
                                                            className="p-2 rounded-lg transition-colors cursor-pointer"
                                                            style={{ color: '#ef4444' }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Add New Channel */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-fg)' }}>
                                <Plus size={18} className="inline mr-1" />
                                Add Channel
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {channelTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => openAddModal(type)}
                                        className="text-left rounded-xl p-5 border transition-all cursor-pointer hover:scale-[1.02]"
                                        style={{
                                            background: 'var(--color-bg-surface)',
                                            borderColor: 'var(--color-border)',
                                        }}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-2xl">{type.icon}</span>
                                            <h3 className="font-semibold" style={{ color: 'var(--color-fg)' }}>{type.name}</h3>
                                        </div>
                                        <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{type.description}</p>
                                        <div className="flex items-center gap-1 mt-3 text-xs" style={{ color: 'var(--color-primary)' }}>
                                            Connect <ChevronRight size={12} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    /* Chat History Tab */
                    <div className="flex gap-4" style={{ height: 'calc(100vh - 280px)' }}>
                        {/* Session list */}
                        <div
                            className="w-80 shrink-0 rounded-xl border overflow-y-auto"
                            style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                        >
                            <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>Sessions</h3>
                            </div>
                            {loadingSessions ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="animate-spin w-5 h-5 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                                </div>
                            ) : sessions.length === 0 ? (
                                <p className="text-xs text-center py-10" style={{ color: 'var(--color-fg-muted)' }}>No sessions yet</p>
                            ) : (
                                <div className="p-1">
                                    {sessions.map((s) => (
                                        <button
                                            key={s._id}
                                            onClick={() => loadMessages(s)}
                                            className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer mb-0.5"
                                            style={{
                                                background: selectedSession?._id === s._id ? 'var(--color-primary-soft)' : 'transparent',
                                                color: selectedSession?._id === s._id ? 'var(--color-primary-light)' : 'var(--color-fg-muted)',
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs">
                                                    {s.platform === 'telegram' ? '✈️' : s.platform === 'discord' ? '🎮' : '💬'}
                                                </span>
                                                <span className="truncate flex-1 font-medium text-xs">{s.title || s._id}</span>
                                            </div>
                                            <p className="text-[10px] mt-0.5 opacity-60">
                                                {s.platform} • {new Date(s.updatedAt).toLocaleString()}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Messages */}
                        <div
                            className="flex-1 rounded-xl border overflow-y-auto"
                            style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                        >
                            {selectedSession ? (
                                <>
                                    <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                                        <div>
                                            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>
                                                {selectedSession.title || selectedSession._id}
                                            </h3>
                                            <p className="text-[10px]" style={{ color: 'var(--color-fg-muted)' }}>
                                                {selectedSession.platform} • {messages.length} messages
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {messages.map((msg) => (
                                            <div
                                                key={msg._id}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className="max-w-[75%] rounded-xl px-4 py-2.5 text-sm"
                                                    style={{
                                                        background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-soft)',
                                                        color: msg.role === 'user' ? '#fff' : 'var(--color-fg)',
                                                    }}
                                                >
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                    <p className="text-[10px] mt-1 opacity-50">
                                                        {new Date(msg.createdAt).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {messages.length === 0 && (
                                            <p className="text-center text-xs py-10" style={{ color: 'var(--color-fg-muted)' }}>No messages</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Select a session to view chat history</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Add Channel Modal */}
                {showAddModal && selectedType && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <div
                            className="rounded-2xl p-6 w-full max-w-md mx-4"
                            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
                        >
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{selectedType.icon}</span>
                                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-fg)' }}>
                                        Connect {selectedType.name}
                                    </h2>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="cursor-pointer" style={{ color: 'var(--color-fg-muted)' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Setup guide */}
                            <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-light)' }}>
                                💡 {selectedType.setupGuide}
                            </div>

                            <div className="space-y-4">
                                {/* Channel name */}
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}>Channel Name</label>
                                    <input
                                        type="text"
                                        value={addForm.name}
                                        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                                        style={{
                                            background: 'var(--color-bg)',
                                            borderColor: 'var(--color-border)',
                                            color: 'var(--color-fg)',
                                        }}
                                    />
                                </div>

                                {/* Config fields */}
                                {selectedType.configFields.map((field) => (
                                    <div key={field.key}>
                                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-fg-muted)' }}>
                                            {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                                                value={addForm.config[field.key] || ''}
                                                onChange={(e) => setAddForm({
                                                    ...addForm,
                                                    config: { ...addForm.config, [field.key]: e.target.value },
                                                })}
                                                placeholder={field.placeholder}
                                                className="w-full px-3 py-2 rounded-lg text-sm border outline-none pr-9"
                                                style={{
                                                    background: 'var(--color-bg)',
                                                    borderColor: 'var(--color-border)',
                                                    color: 'var(--color-fg)',
                                                }}
                                            />
                                            {field.type === 'password' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                                                    style={{ color: 'var(--color-fg-muted)' }}
                                                >
                                                    {showPasswords[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer border"
                                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-fg-muted)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdd}
                                    disabled={adding}
                                    className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer"
                                    style={{ background: 'var(--color-primary)', color: '#fff', opacity: adding ? 0.7 : 1 }}
                                >
                                    {adding ? 'Connecting...' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
