import { useState, useEffect, useRef } from 'react';
import {
    Stethoscope, Plus, Search, User, FileText,
    AlertTriangle, Pill, CheckCircle, Clock, ChevronDown, X, Save, Loader2,
} from 'lucide-react';
import {
    getPatients, getEncounters, createEncounter, updateEncounter,
    getPatientAllergies, checkClinicalAlert, getMedications, createPrescription,
} from '../api';

/* ── Types ── */
interface Patient { id: string; name: { text: string }[]; identifier: { value: string }[]; gender: string; birthDate: string }
interface Encounter {
    id: string; patientId: string; patientName: string; date: string;
    status: 'in-progress' | 'completed';
    subjective: string; objective: string; assessment: string; plan: string;
    prescriptionIds: string[]; createdAt: string; updatedAt: string;
}
interface Allergy {
    id: string; code: { coding: { display: string }[] }; criticality: string;
    reaction?: { manifestation: { coding: { display: string }[] }[]; severity: string }[];
}
interface Medication {
    id: string; code: { coding: { display: string }[] };
    ingredient: { item: { concept: { coding: { display: string }[] } }; isActive: boolean }[];
}
interface Alert { id: string; severity: string; title: string; detail: string; allergySubstance: string; ingredient: string; medicationName: string }

/* ── Component ── */
export function EncounterPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [selectedEnc, setSelectedEnc] = useState<Encounter | null>(null);
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [autoSaveMsg, setAutoSaveMsg] = useState('');

    // SOAP form
    const [subjective, setSubjective] = useState('');
    const [objective, setObjective] = useState('');
    const [assessment, setAssessment] = useState('');
    const [plan, setPlan] = useState('');

    // Prescription in SOAP
    const [medications, setMedications] = useState<Medication[]>([]);
    const [medSearch, setMedSearch] = useState('');
    const [showMedDrop, setShowMedDrop] = useState(false);
    const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
    const [rxAlerts, setRxAlerts] = useState<Alert[]>([]);
    const [rxChecking, setRxChecking] = useState(false);
    const [rxResult, setRxResult] = useState<{ type: string; message: string } | null>(null);
    const [rxSubmitting, setRxSubmitting] = useState(false);

    const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(null);

    // Load
    useEffect(() => {
        getPatients().then((d) => setPatients(d.patients));
        getEncounters().then((d) => setEncounters(d.encounters));
        getMedications().then((d) => setMedications(d.medications));
    }, []);

    useEffect(() => {
        if (medSearch) getMedications(medSearch).then((d) => setMedications(d.medications));
    }, [medSearch]);

    // Load encounter detail
    useEffect(() => {
        if (selectedEnc) {
            setSubjective(selectedEnc.subjective);
            setObjective(selectedEnc.objective);
            setAssessment(selectedEnc.assessment);
            setPlan(selectedEnc.plan);
            setRxAlerts([]); setSelectedMed(null); setRxResult(null);
            getPatientAllergies(selectedEnc.patientId).then((d) => setAllergies(d.allergies || []));
        }
    }, [selectedEnc?.id]);

    // Auto-check allergy when selecting med
    useEffect(() => {
        if (selectedEnc && selectedMed) {
            setRxChecking(true); setRxAlerts([]); setRxResult(null);
            checkClinicalAlert(selectedEnc.patientId, selectedMed.id)
                .then((d) => { setRxAlerts(d.alerts || []); setRxChecking(false); })
                .catch(() => setRxChecking(false));
        } else { setRxAlerts([]); }
    }, [selectedEnc?.patientId, selectedMed?.id]);

    // Auto-save with debounce
    const doAutoSave = () => {
        if (!selectedEnc) return;
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(async () => {
            await updateEncounter(selectedEnc.id, { subjective, objective, assessment, plan });
            setAutoSaveMsg('Đã lưu tự động');
            setTimeout(() => setAutoSaveMsg(''), 2000);
            // update local list
            setEncounters((prev) => prev.map((e) =>
                e.id === selectedEnc.id ? { ...e, subjective, objective, assessment, plan, updatedAt: new Date().toISOString() } : e
            ));
        }, 1500);
    };

    useEffect(() => { doAutoSave(); return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); }; }, [subjective, objective, assessment, plan]);

    // Create new encounter
    const handleCreate = async (patientId: string) => {
        setSaving(true);
        const res = await createEncounter({ patientId });
        if (res.encounter) {
            setEncounters((prev) => [res.encounter, ...prev]);
            setSelectedEnc(res.encounter);
        }
        setSaving(false);
        setShowNew(false);
    };

    // Complete encounter
    const handleComplete = async () => {
        if (!selectedEnc) return;
        setSaving(true);
        const res = await updateEncounter(selectedEnc.id, { subjective, objective, assessment, plan, status: 'completed' });
        if (res.encounter) {
            setSelectedEnc(res.encounter);
            setEncounters((prev) => prev.map((e) => e.id === res.encounter.id ? res.encounter : e));
        }
        setSaving(false);
    };

    // Quick prescribe from SOAP
    const handlePrescribe = async (forceOverride = false) => {
        if (!selectedEnc || !selectedMed) return;
        setRxSubmitting(true);
        const res = await createPrescription({
            patientId: selectedEnc.patientId,
            medicationId: selectedMed.id,
            dosage: '1 viên', route: 'Đường uống', frequency: '3 lần/ngày',
            note: `Từ khám bệnh ${selectedEnc.id}`,
            forceOverride,
        });
        setRxSubmitting(false);
        if (res.status === 409) {
            setRxResult({ type: 'blocked', message: res.message || 'Bị chặn do dị ứng!' });
        } else if (res.overridden) {
            setRxResult({ type: 'overridden', message: 'Đã kê đơn (bỏ qua cảnh báo)' });
            setSelectedMed(null);
        } else if (res.prescription) {
            setRxResult({ type: 'success', message: 'Đã kê đơn thành công!' });
            setSelectedMed(null);
        }
    };

    return (
        <div className="flex h-full">
            {/* Sidebar: encounter list */}
            <div className="w-[300px] shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--his-border)', background: 'var(--his-surface)' }}>
                <div className="flex items-center gap-2 px-4 h-14 border-b" style={{ borderColor: 'var(--his-border)' }}>
                    <Stethoscope size={18} style={{ color: 'var(--his-info)' }} />
                    <span className="text-sm font-semibold flex-1" style={{ color: 'var(--his-fg)' }}>Khám bệnh</span>
                    <button
                        onClick={() => setShowNew(true)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: 'var(--his-primary)', color: '#fff' }}
                    >
                        <Plus size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {encounters.length === 0 && (
                        <div className="p-6 text-center text-xs" style={{ color: 'var(--his-fg-muted)' }}>
                            Chưa có lượt khám. Nhấn + để tạo mới.
                        </div>
                    )}
                    {encounters.map((enc) => (
                        <button
                            key={enc.id}
                            onClick={() => setSelectedEnc(enc)}
                            className="w-full px-4 py-3 border-b text-left cursor-pointer transition-colors"
                            style={{
                                borderColor: 'var(--his-border)',
                                background: selectedEnc?.id === enc.id ? 'var(--his-primary-soft)' : 'transparent',
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <User size={12} style={{ color: 'var(--his-fg-muted)' }} />
                                <span className="text-xs font-semibold" style={{ color: 'var(--his-fg)' }}>{enc.patientName}</span>
                                <span
                                    className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium"
                                    style={{
                                        background: enc.status === 'in-progress' ? 'var(--his-primary-soft)' : 'var(--his-success-soft)',
                                        color: enc.status === 'in-progress' ? 'var(--his-primary)' : 'var(--his-success)',
                                    }}
                                >
                                    {enc.status === 'in-progress' ? 'Đang khám' : 'Hoàn tất'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: 'var(--his-fg-muted)' }}>
                                <Clock size={10} /> {enc.date}
                                <span className="ml-auto">{enc.id}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main: SOAP form */}
            <div className="flex-1 overflow-y-auto p-6">
                {selectedEnc ? (
                    <div className="max-w-3xl mx-auto space-y-4">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--his-info-soft)' }}>
                                <Stethoscope size={20} style={{ color: 'var(--his-info)' }} />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-base font-bold" style={{ color: 'var(--his-fg)' }}>
                                    Khám bệnh — {selectedEnc.patientName}
                                </h1>
                                <p className="text-[11px]" style={{ color: 'var(--his-fg-muted)' }}>
                                    {selectedEnc.id} • {selectedEnc.date}
                                    <span className="ml-2 px-1.5 py-0.5 rounded font-medium"
                                        style={{
                                            background: selectedEnc.status === 'in-progress' ? 'var(--his-primary-soft)' : 'var(--his-success-soft)',
                                            color: selectedEnc.status === 'in-progress' ? 'var(--his-primary)' : 'var(--his-success)',
                                        }}>
                                        {selectedEnc.status === 'in-progress' ? 'Đang khám' : 'Hoàn tất'}
                                    </span>
                                </p>
                            </div>
                            {autoSaveMsg && (
                                <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--his-success)' }}>
                                    <CheckCircle size={12} /> {autoSaveMsg}
                                </span>
                            )}
                            {selectedEnc.status === 'in-progress' && (
                                <button
                                    onClick={handleComplete}
                                    disabled={saving}
                                    className="his-btn his-btn-primary his-btn-sm"
                                >
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Hoàn tất khám
                                </button>
                            )}
                        </div>

                        {/* Allergy warning banner */}
                        {allergies.length > 0 && (
                            <div className="rounded-xl border p-3 flex items-start gap-3 alert-pulse"
                                style={{ background: 'var(--his-danger-soft)', borderColor: '#fecaca' }}>
                                <AlertTriangle size={18} style={{ color: 'var(--his-danger)' }} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold" style={{ color: 'var(--his-danger)' }}>
                                        Bệnh nhân có {allergies.length} dị ứng thuốc
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {allergies.map((a) => (
                                            <span key={a.id} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                                style={{
                                                    background: a.criticality === 'high' ? '#fecaca' : '#fde68a',
                                                    color: a.criticality === 'high' ? '#dc2626' : '#92400e',
                                                }}>
                                                {a.code.coding[0]?.display}
                                                {a.criticality === 'high' ? ' ⚠ Cao' : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SOAP Sections */}
                        <div className="space-y-3">
                            <SOAPSection
                                letter="S" title="Subjective — Triệu chứng chủ quan" className="soap-s"
                                hint="Bệnh nhân than phiền gì? (đau đầu, sốt, ho...)"
                                value={subjective} onChange={setSubjective}
                                disabled={selectedEnc.status === 'completed'}
                            />
                            <SOAPSection
                                letter="O" title="Objective — Khám lâm sàng" className="soap-o"
                                hint="Dấu hiệu sinh tồn, kết quả khám (t°, HA, nhịp tim...)"
                                value={objective} onChange={setObjective}
                                disabled={selectedEnc.status === 'completed'}
                            />
                            <SOAPSection
                                letter="A" title="Assessment — Chẩn đoán" className="soap-a"
                                hint="Chẩn đoán chính, chẩn đoán phân biệt"
                                value={assessment} onChange={setAssessment}
                                disabled={selectedEnc.status === 'completed'}
                            />
                            <SOAPSection
                                letter="P" title="Plan — Kế hoạch điều trị" className="soap-p"
                                hint="Thuốc, xét nghiệm, tái khám..."
                                value={plan} onChange={setPlan}
                                disabled={selectedEnc.status === 'completed'}
                            />
                        </div>

                        {/* Quick Prescribe */}
                        {selectedEnc.status === 'in-progress' && (
                            <div className="his-card p-5 space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Pill size={16} style={{ color: 'var(--his-success)' }} />
                                    <h3 className="text-sm font-semibold" style={{ color: 'var(--his-fg)' }}>Kê đơn nhanh</h3>
                                </div>

                                {/* Medication picker */}
                                <div className="relative">
                                    <div
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer"
                                        style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)' }}
                                        onClick={() => setShowMedDrop(!showMedDrop)}
                                    >
                                        <Pill size={14} style={{ color: 'var(--his-fg-muted)' }} />
                                        {selectedMed ? (
                                            <span className="text-xs font-medium flex-1" style={{ color: 'var(--his-fg)' }}>
                                                {selectedMed.code.coding[0]?.display}
                                            </span>
                                        ) : (
                                            <input
                                                className="bg-transparent outline-none text-xs flex-1"
                                                placeholder="Tìm thuốc để kê..."
                                                value={medSearch}
                                                onChange={(e) => { setMedSearch(e.target.value); setShowMedDrop(true); }}
                                                onClick={(e) => { e.stopPropagation(); setShowMedDrop(true); }}
                                                style={{ color: 'var(--his-fg)' }}
                                            />
                                        )}
                                        {selectedMed && (
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedMed(null); setMedSearch(''); setRxAlerts([]); setRxResult(null); }} className="cursor-pointer">
                                                <X size={14} style={{ color: 'var(--his-fg-muted)' }} />
                                            </button>
                                        )}
                                        <ChevronDown size={14} style={{ color: 'var(--his-fg-muted)' }} />
                                    </div>
                                    {showMedDrop && !selectedMed && (
                                        <div className="absolute z-20 mt-1 w-full rounded-lg border shadow-lg max-h-48 overflow-y-auto" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                                            {medications.map((m) => (
                                                <button
                                                    key={m.id}
                                                    className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 cursor-pointer border-b"
                                                    style={{ borderColor: 'var(--his-border)' }}
                                                    onClick={() => { setSelectedMed(m); setShowMedDrop(false); }}
                                                >
                                                    <div className="font-medium" style={{ color: 'var(--his-fg)' }}>{m.code.coding[0]?.display}</div>
                                                    <div className="text-[10px]" style={{ color: 'var(--his-fg-muted)' }}>
                                                        {m.ingredient.filter((i) => i.isActive).map((i) => i.item.concept.coding[0]?.display).join(', ')}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Allergy check result */}
                                {rxChecking && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--his-primary-soft)' }}>
                                        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--his-primary)' }} />
                                        <span className="text-xs" style={{ color: 'var(--his-primary)' }}>Đang kiểm tra dị ứng...</span>
                                    </div>
                                )}

                                {rxAlerts.length > 0 && (
                                    <div className="rounded-xl border-2 p-3 space-y-2" style={{ borderColor: '#ef4444', background: 'var(--his-danger-soft)' }}>
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={16} style={{ color: 'var(--his-danger)' }} />
                                            <span className="text-xs font-bold" style={{ color: 'var(--his-danger)' }}>
                                                ⚠️ CẢNH BÁO DỊ ỨNG ({rxAlerts.length})
                                            </span>
                                        </div>
                                        {rxAlerts.map((alert) => (
                                            <div key={alert.id} className="p-2 rounded-lg border text-xs" style={{ background: '#fff', borderColor: '#fecaca' }}>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white mr-1"
                                                    style={{ background: alert.severity === 'critical' ? '#dc2626' : '#ea580c' }}>
                                                    {alert.severity.toUpperCase()}
                                                </span>
                                                <span className="font-semibold">{alert.title}</span>
                                                <p className="mt-1" style={{ color: 'var(--his-fg-muted)' }}>{alert.detail}</p>
                                            </div>
                                        ))}
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={() => { setSelectedMed(null); setRxAlerts([]); }} className="his-btn his-btn-sm his-btn-ghost">Huỷ</button>
                                            <button onClick={() => handlePrescribe(true)} disabled={rxSubmitting} className="his-btn his-btn-sm his-btn-danger">
                                                {rxSubmitting ? 'Đang lưu...' : 'Vẫn kê đơn (Override)'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {selectedMed && !rxChecking && rxAlerts.length === 0 && !rxResult && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 flex-1 p-2 rounded-lg" style={{ background: 'var(--his-success-soft)' }}>
                                            <CheckCircle size={14} style={{ color: 'var(--his-success)' }} />
                                            <span className="text-xs" style={{ color: 'var(--his-success)' }}>An toàn</span>
                                        </div>
                                        <button onClick={() => handlePrescribe()} disabled={rxSubmitting} className="his-btn his-btn-sm his-btn-primary">
                                            {rxSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Pill size={14} />}
                                            Kê đơn
                                        </button>
                                    </div>
                                )}

                                {rxResult && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg"
                                        style={{
                                            background: rxResult.type === 'success' ? 'var(--his-success-soft)' : rxResult.type === 'overridden' ? 'var(--his-warning-soft)' : 'var(--his-danger-soft)',
                                        }}>
                                        {rxResult.type === 'success' ? <CheckCircle size={14} style={{ color: 'var(--his-success)' }} /> : <AlertTriangle size={14} style={{ color: rxResult.type === 'overridden' ? 'var(--his-warning)' : 'var(--his-danger)' }} />}
                                        <span className="text-xs font-medium">{rxResult.message}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--his-fg-muted)' }}>
                        <Stethoscope size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">Chọn lượt khám hoặc tạo mới</p>
                        <p className="text-xs mt-1">Quy trình khám: S → O → A → P → Kê đơn</p>
                    </div>
                )}
            </div>

            {/* New Encounter Modal */}
            {showNew && (
                <NewEncounterModal
                    patients={patients}
                    loading={saving}
                    onClose={() => setShowNew(false)}
                    onCreate={handleCreate}
                />
            )}
        </div>
    );
}

/* ── SOAP Section ── */
function SOAPSection({ letter, title, className, hint, value, onChange, disabled }: {
    letter: string; title: string; className: string; hint: string;
    value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
    const colorMap: Record<string, string> = { S: '#6366f1', O: '#0ea5e9', A: '#f59e0b', P: '#10b981' };
    const bgMap: Record<string, string> = { S: '#eef2ff', O: '#f0f9ff', A: '#fffbeb', P: '#ecfdf5' };

    return (
        <div className={`his-card p-4 ${className}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: colorMap[letter] }}>
                    {letter}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--his-fg)' }}>{title}</span>
            </div>
            <textarea
                className="w-full rounded-lg px-3 py-2 text-xs border outline-none resize-none min-h-[80px]"
                style={{
                    borderColor: 'var(--his-border)',
                    background: disabled ? 'var(--his-surface-alt)' : bgMap[letter],
                    color: 'var(--his-fg)',
                }}
                placeholder={hint}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                rows={3}
            />
        </div>
    );
}

/* ── New Encounter Modal ── */
function NewEncounterModal({ patients, loading, onClose, onCreate }: {
    patients: Patient[]; loading: boolean; onClose: () => void; onCreate: (patientId: string) => void;
}) {
    const [search, setSearch] = useState('');
    const [filtered, setFiltered] = useState(patients);

    useEffect(() => {
        if (search) {
            const q = search.toLowerCase();
            setFiltered(patients.filter((p) =>
                p.name[0]?.text.toLowerCase().includes(q) || p.identifier[0]?.value.toLowerCase().includes(q)
            ));
        } else {
            setFiltered(patients);
        }
    }, [search, patients]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="rounded-xl border p-6 w-[420px] shadow-xl" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--his-fg)' }}>Tạo lượt khám mới</h3>
                    <button onClick={onClose} className="cursor-pointer"><X size={16} style={{ color: 'var(--his-fg-muted)' }} /></button>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--his-bg)' }}>
                    <Search size={14} style={{ color: 'var(--his-fg-muted)' }} />
                    <input
                        className="bg-transparent outline-none text-xs flex-1"
                        placeholder="Tìm bệnh nhân..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ color: 'var(--his-fg)' }}
                    />
                </div>
                <div className="max-h-[300px] overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--his-border)' }}>
                    {filtered.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => onCreate(p.id)}
                            disabled={loading}
                            className="w-full px-4 py-3 text-left border-b cursor-pointer hover:bg-blue-50 disabled:opacity-50"
                            style={{ borderColor: 'var(--his-border)' }}
                        >
                            <div className="text-xs font-semibold" style={{ color: 'var(--his-fg)' }}>{p.name[0]?.text}</div>
                            <div className="flex gap-3 text-[10px] mt-0.5" style={{ color: 'var(--his-fg-muted)' }}>
                                <span>Mã: {p.identifier[0]?.value}</span>
                                <span>{p.gender === 'male' ? 'Nam' : p.gender === 'female' ? 'Nữ' : 'Khác'}</span>
                                <span>{p.birthDate}</span>
                            </div>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <div className="p-4 text-center text-xs" style={{ color: 'var(--his-fg-muted)' }}>Không tìm thấy</div>
                    )}
                </div>
            </div>
        </div>
    );
}
