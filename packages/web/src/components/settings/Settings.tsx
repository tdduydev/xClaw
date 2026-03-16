// ============================================================
// Settings - Agent configuration page
// ============================================================

import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { Settings as SettingsIcon, Save, Loader2 } from 'lucide-react';

interface AgentConfig {
    name: string;
    persona: string;
    llm: {
        provider: string;
        model: string;
        apiKey: string;
        baseUrl: string;
        temperature: number;
    };
}

const DEFAULT_CONFIG: AgentConfig = {
    name: 'AutoX',
    persona: 'A helpful AI assistant',
    llm: { provider: 'openai', model: 'gpt-4o-mini', apiKey: '', baseUrl: '', temperature: 0.7 },
};

export function Settings() {
    const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        api.getConfig()
            .then(res => setConfig({ ...DEFAULT_CONFIG, ...res }))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const save = async () => {
        setSaving(true);
        setStatus(null);
        try {
            await api.updateConfig(config);
            setStatus('Saved successfully');
        } catch (err: unknown) {
            setStatus(`Error: ${err instanceof Error ? err.message : 'Failed to save'}`);
        } finally {
            setSaving(false);
        }
    };

    const updateLLM = (key: string, value: unknown) => {
        setConfig(c => ({ ...c, llm: { ...c.llm, [key]: value } }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-500" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-2 mb-6">
                    <SettingsIcon size={24} className="text-slate-400" />
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                </div>

                <div className="space-y-6">
                    {/* Agent Basics */}
                    <Section title="Agent Profile">
                        <Field label="Agent Name">
                            <input
                                type="text"
                                value={config.name}
                                onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
                                className="input-field"
                            />
                        </Field>
                        <Field label="Persona / System Prompt">
                            <textarea
                                value={config.persona}
                                onChange={e => setConfig(c => ({ ...c, persona: e.target.value }))}
                                className="input-field h-28 resize-y"
                                placeholder="Describe how the agent should behave..."
                            />
                        </Field>
                    </Section>

                    {/* LLM Configuration */}
                    <Section title="LLM Configuration">
                        <Field label="Provider">
                            <select
                                value={config.llm.provider}
                                onChange={e => updateLLM('provider', e.target.value)}
                                className="input-field"
                            >
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic (Claude)</option>
                                <option value="ollama">Ollama (Local)</option>
                            </select>
                        </Field>
                        <Field label="Model">
                            <input
                                type="text"
                                value={config.llm.model}
                                onChange={e => updateLLM('model', e.target.value)}
                                className="input-field"
                                placeholder="gpt-4o-mini, claude-3-haiku, llama3..."
                            />
                        </Field>
                        <Field label="API Key">
                            <input
                                type="password"
                                value={config.llm.apiKey}
                                onChange={e => updateLLM('apiKey', e.target.value)}
                                className="input-field"
                                placeholder="sk-..."
                            />
                        </Field>
                        {config.llm.provider === 'ollama' && (
                            <Field label="Base URL">
                                <input
                                    type="text"
                                    value={config.llm.baseUrl}
                                    onChange={e => updateLLM('baseUrl', e.target.value)}
                                    className="input-field"
                                    placeholder="http://localhost:11434/v1"
                                />
                            </Field>
                        )}
                        <Field label="Temperature">
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    value={config.llm.temperature}
                                    onChange={e => updateLLM('temperature', parseFloat(e.target.value))}
                                    className="flex-1"
                                />
                                <span className="text-sm text-slate-300 w-8 text-right">
                                    {config.llm.temperature}
                                </span>
                            </div>
                        </Field>
                    </Section>

                    {/* Save */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={save}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Settings
                        </button>
                        {status && (
                            <span className={`text-sm ${status.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                                {status}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">{title}</h2>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
            {children}
        </div>
    );
}
