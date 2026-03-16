// ============================================================
// Node Type definitions for the workflow builder palette
// ============================================================

import {
  Play, Brain, Wrench, GitBranch, Repeat, Code, Globe, Database,
  Bell, Clock, ArrowRightLeft, Merge, Workflow, Send,
  type LucideIcon,
} from 'lucide-react';

export interface NodeTypeConfig {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;         // tailwind bg color
  borderColor: string;
  category: 'trigger' | 'ai' | 'control' | 'action' | 'data' | 'output';
  defaultConfig: Record<string, unknown>;
}

export const NODE_TYPES: NodeTypeConfig[] = [
  // ─── Triggers ───────────────────────────────────────────
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Starting point of the workflow',
    icon: Play,
    color: 'bg-green-500/20',
    borderColor: 'border-green-500',
    category: 'trigger',
    defaultConfig: { triggerType: 'manual' },
  },

  // ─── AI ─────────────────────────────────────────────────
  {
    type: 'llm-call',
    label: 'LLM Call',
    description: 'Send a prompt to an AI model',
    icon: Brain,
    color: 'bg-purple-500/20',
    borderColor: 'border-purple-500',
    category: 'ai',
    defaultConfig: { prompt: '', systemPrompt: '', model: 'default' },
  },

  // ─── Actions ────────────────────────────────────────────
  {
    type: 'tool-call',
    label: 'Tool Call',
    description: 'Execute a registered tool/skill',
    icon: Wrench,
    color: 'bg-blue-500/20',
    borderColor: 'border-blue-500',
    category: 'action',
    defaultConfig: { toolName: '', arguments: {} },
  },
  {
    type: 'http-request',
    label: 'HTTP Request',
    description: 'Make an HTTP API call',
    icon: Globe,
    color: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500',
    category: 'action',
    defaultConfig: { url: '', method: 'GET', headers: {}, body: '' },
  },
  {
    type: 'code',
    label: 'Run Code',
    description: 'Execute custom JavaScript code',
    icon: Code,
    color: 'bg-amber-500/20',
    borderColor: 'border-amber-500',
    category: 'action',
    defaultConfig: { code: '// Access inputs via `inputs` variable\nreturn inputs;' },
  },
  {
    type: 'notification',
    label: 'Notification',
    description: 'Send a notification message',
    icon: Bell,
    color: 'bg-rose-500/20',
    borderColor: 'border-rose-500',
    category: 'action',
    defaultConfig: { message: '', channel: 'default' },
  },

  // ─── Control Flow ───────────────────────────────────────
  {
    type: 'condition',
    label: 'If / Else',
    description: 'Branch based on a condition',
    icon: GitBranch,
    color: 'bg-orange-500/20',
    borderColor: 'border-orange-500',
    category: 'control',
    defaultConfig: { expression: '' },
  },
  {
    type: 'loop',
    label: 'Loop',
    description: 'Repeat a set of actions',
    icon: Repeat,
    color: 'bg-orange-500/20',
    borderColor: 'border-orange-500',
    category: 'control',
    defaultConfig: { maxIterations: 10, condition: '' },
  },
  {
    type: 'switch',
    label: 'Switch',
    description: 'Multi-branch routing',
    icon: ArrowRightLeft,
    color: 'bg-orange-500/20',
    borderColor: 'border-orange-500',
    category: 'control',
    defaultConfig: { cases: [] },
  },
  {
    type: 'wait',
    label: 'Wait / Delay',
    description: 'Pause execution for a duration',
    icon: Clock,
    color: 'bg-slate-500/20',
    borderColor: 'border-slate-500',
    category: 'control',
    defaultConfig: { seconds: 5 },
  },
  {
    type: 'merge',
    label: 'Merge',
    description: 'Merge multiple branches',
    icon: Merge,
    color: 'bg-slate-500/20',
    borderColor: 'border-slate-500',
    category: 'control',
    defaultConfig: {},
  },

  // ─── Data ───────────────────────────────────────────────
  {
    type: 'transform',
    label: 'Transform',
    description: 'Transform data with a template',
    icon: ArrowRightLeft,
    color: 'bg-indigo-500/20',
    borderColor: 'border-indigo-500',
    category: 'data',
    defaultConfig: { template: '' },
  },
  {
    type: 'memory-read',
    label: 'Memory Read',
    description: 'Read from agent memory',
    icon: Database,
    color: 'bg-teal-500/20',
    borderColor: 'border-teal-500',
    category: 'data',
    defaultConfig: { query: '' },
  },
  {
    type: 'memory-write',
    label: 'Memory Write',
    description: 'Write to agent memory',
    icon: Database,
    color: 'bg-teal-500/20',
    borderColor: 'border-teal-500',
    category: 'data',
    defaultConfig: { content: '', type: 'fact', tags: [] },
  },
  {
    type: 'sub-workflow',
    label: 'Sub-Workflow',
    description: 'Call another workflow',
    icon: Workflow,
    color: 'bg-violet-500/20',
    borderColor: 'border-violet-500',
    category: 'data',
    defaultConfig: { workflowId: '' },
  },

  // ─── Output ─────────────────────────────────────────────
  {
    type: 'output',
    label: 'Output',
    description: 'End node with final output',
    icon: Send,
    color: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500',
    category: 'output',
    defaultConfig: {},
  },
];

export const NODE_CATEGORIES = [
  { id: 'trigger', label: 'Triggers', color: 'text-green-400' },
  { id: 'ai', label: 'AI', color: 'text-purple-400' },
  { id: 'action', label: 'Actions', color: 'text-blue-400' },
  { id: 'control', label: 'Control Flow', color: 'text-orange-400' },
  { id: 'data', label: 'Data', color: 'text-indigo-400' },
  { id: 'output', label: 'Output', color: 'text-emerald-400' },
];
