// ============================================================
// SkillsPanel - View and manage skills / tools
// ============================================================

import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { Puzzle, Power, PowerOff, RefreshCw, Wrench, ChevronDown, ChevronRight } from 'lucide-react';

interface Skill {
    id: string;
    name: string;
    description: string;
    version: string;
    category: string;
    active: boolean;
    tools: { name: string; description: string }[];
}

export function SkillsPanel() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);

    const fetchSkills = async () => {
        setLoading(true);
        try {
            const res = await api.getSkills();
            setSkills(res.skills || []);
        } catch {
            // backend might not be running
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSkills(); }, []);

    const toggleSkill = async (skill: Skill) => {
        try {
            if (skill.active) {
                await api.deactivateSkill(skill.id);
            } else {
                await api.activateSkill(skill.id);
            }
            fetchSkills();
        } catch (err) {
            console.error('Failed to toggle skill', err);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Skills & Tools</h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Manage agent capabilities by activating or deactivating skill packs
                        </p>
                    </div>
                    <button
                        onClick={fetchSkills}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-slate-300 hover:bg-dark-700 transition disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Skill list */}
                <div className="space-y-3">
                    {skills.length === 0 && !loading && (
                        <div className="text-center py-16">
                            <Puzzle size={48} className="text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">No skills loaded. Start the backend to see available skills.</p>
                        </div>
                    )}

                    {skills.map(skill => (
                        <div
                            key={skill.id}
                            className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden"
                        >
                            <div className="flex items-center gap-3 p-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${skill.active ? 'bg-green-500/20' : 'bg-slate-700/50'}`}>
                                    <Puzzle size={20} className={skill.active ? 'text-green-400' : 'text-slate-500'} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-white text-sm">{skill.name}</h3>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-700 text-slate-400">
                                            v{skill.version}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300">
                                            {skill.category}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5 truncate">{skill.description}</p>
                                </div>

                                <button
                                    onClick={() => setExpanded(expanded === skill.id ? null : skill.id)}
                                    className="p-1.5 hover:bg-dark-700 rounded text-slate-400"
                                >
                                    {expanded === skill.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>

                                <button
                                    onClick={() => toggleSkill(skill)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${skill.active
                                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                            : 'bg-dark-700 text-slate-400 hover:bg-dark-600'
                                        }`}
                                >
                                    {skill.active ? <Power size={12} /> : <PowerOff size={12} />}
                                    {skill.active ? 'Active' : 'Inactive'}
                                </button>
                            </div>

                            {/* Expanded: show tools */}
                            {expanded === skill.id && skill.tools.length > 0 && (
                                <div className="border-t border-dark-700 px-4 py-3 space-y-2">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                        Tools ({skill.tools.length})
                                    </p>
                                    {skill.tools.map(tool => (
                                        <div
                                            key={tool.name}
                                            className="flex items-start gap-2 px-3 py-2 bg-dark-900 rounded-lg"
                                        >
                                            <Wrench size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="text-xs font-mono text-white">{tool.name}</span>
                                                <p className="text-[11px] text-slate-500 mt-0.5">{tool.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
