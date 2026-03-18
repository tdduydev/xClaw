import { useState, useEffect } from 'react';
import { Pill, Search, AlertTriangle, CheckCircle, ShieldAlert, Loader2, ChevronDown, X, Bot, Sparkles } from 'lucide-react';
import { getPatients, getMedications, createPrescription, checkClinicalAlert, loginXClaw, aiCheckPrescription, getPatientAllergies } from '../api';

interface Patient { id: string; name: { text: string }[]; identifier: { value: string }[] }
interface Medication {
    id: string;
    code: { coding: { display: string }[] };
    form?: { coding: { display: string }[] };
    ingredient: { item: { concept: { coding: { display: string }[] } }; isActive: boolean }[];
}
interface Alert {
    id: string; severity: string; title: string; detail: string;
    allergySubstance: string; ingredient: string; medicationName: string;
}

export function PrescribePage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [medSearch, setMedSearch] = useState('');

    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [showMedDropdown, setShowMedDropdown] = useState(false);

    const [dosage, setDosage] = useState('1 viên');
    const [frequency, setFrequency] = useState('3 lần/ngày');
    const [route, setRoute] = useState('Đường uống');
    const [note, setNote] = useState('');

    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [checking, setChecking] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'blocked' | 'overridden'; message: string } | null>(null);

    // xClaw AI check state
    const [aiChecking, setAiChecking] = useState(false);
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [xclawToken, setXclawToken] = useState<string | null>(null);
    const [xclawSessionId, setXclawSessionId] = useState<string | undefined>(undefined);

    // Load data
    useEffect(() => {
        getPatients(patientSearch || undefined).then((d) => setPatients(d.patients));
    }, [patientSearch]);

    useEffect(() => {
        getMedications(medSearch || undefined).then((d) => setMedications(d.medications));
    }, [medSearch]);

    // Auto-check when both selected
    useEffect(() => {
        if (selectedPatient && selectedMed) {
            setChecking(true);
            setAlerts([]);
            setResult(null);
            checkClinicalAlert(selectedPatient.id, selectedMed.id).then((d) => {
                setAlerts(d.alerts || []);
                setChecking(false);
            }).catch(() => setChecking(false));
        } else {
            setAlerts([]);
        }
    }, [selectedPatient?.id, selectedMed?.id]);

    // xClaw AI prescription check
    const handleAiCheck = async () => {
        if (!selectedPatient || !selectedMed) return;
        setAiChecking(true);
        setAiResult(null);
        setShowAiPanel(true);
        try {
            // Auto-login if no token
            let token = xclawToken;
            if (!token) {
                const auth = await loginXClaw('doctor@his.local', 'doctor123');
                if ('error' in auth) throw new Error(auth.error);
                token = auth.token;
                setXclawToken(token);
            }
            // Fetch patient allergies
            const allergyData = await getPatientAllergies(selectedPatient.id);
            const allergyNames = (allergyData.allergies || []).map((a: { code: { coding: { display: string }[] } }) => a.code.coding[0]?.display).filter(Boolean);
            const medName = selectedMed.code.coding[0]?.display;
            const ingredients = selectedMed.ingredient.map((i) => i.item.concept.coding[0]?.display).filter(Boolean);

            const res = await aiCheckPrescription(token!, selectedPatient.name[0]?.text, allergyNames, medName, ingredients, `${dosage}, ${frequency}, ${route}`, xclawSessionId);
            setAiResult(res.content || 'Không nhận được phản hồi từ AI.');
            if (res.sessionId) setXclawSessionId(res.sessionId);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi kết nối xClaw';
            setAiResult(`❌ ${msg}`);
        } finally {
            setAiChecking(false);
        }
    };

    const handleSubmit = async (forceOverride = false) => {
        if (!selectedPatient || !selectedMed) return;
        setSubmitting(true);
        setResult(null);
        const res = await createPrescription({
            patientId: selectedPatient.id,
            medicationId: selectedMed.id,
            dosage, route, frequency, note,
            forceOverride,
        });
        setSubmitting(false);

        if (res.status === 409) {
            setAlerts(res.alerts || []);
            setResult({ type: 'blocked', message: res.message || 'Đơn thuốc bị chặn do cảnh báo dị ứng!' });
        } else if (res.overridden) {
            setResult({ type: 'overridden', message: '⚠️ Đơn thuốc đã được lưu (bác sĩ đã xác nhận bỏ qua cảnh báo).' });
            resetForm();
        } else if (res.prescription) {
            setResult({ type: 'success', message: '✅ Đơn thuốc đã được lưu thành công!' });
            resetForm();
        }
    };

    const resetForm = () => {
        setSelectedPatient(null);
        setSelectedMed(null);
        setDosage('1 viên');
        setFrequency('3 lần/ngày');
        setRoute('Đường uống');
        setNote('');
        setAlerts([]);
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--his-primary-soft)' }}>
                    <Pill size={20} style={{ color: 'var(--his-primary)' }} />
                </div>
                <div>
                    <h1 className="text-lg font-bold" style={{ color: 'var(--his-fg)' }}>Kê đơn thuốc</h1>
                    <p className="text-xs" style={{ color: 'var(--his-fg-muted)' }}>FHIR R5 MedicationRequest — với cảnh báo dị ứng tự động</p>
                </div>
            </div>

            {/* Result Banner */}
            {result && (
                <div
                    className="rounded-xl p-4 border mb-4 flex items-center gap-3"
                    style={{
                        background: result.type === 'success' ? 'var(--his-success-soft)' : result.type === 'overridden' ? 'var(--his-warning-soft)' : 'var(--his-danger-soft)',
                        borderColor: result.type === 'success' ? '#bbf7d0' : result.type === 'overridden' ? '#fde68a' : '#fecaca',
                    }}
                >
                    {result.type === 'success' ? (
                        <CheckCircle size={18} style={{ color: 'var(--his-success)' }} />
                    ) : (
                        <AlertTriangle size={18} style={{ color: result.type === 'overridden' ? 'var(--his-warning)' : 'var(--his-danger)' }} />
                    )}
                    <span className="text-xs font-medium flex-1" style={{ color: 'var(--his-fg)' }}>{result.message}</span>
                    <button onClick={() => setResult(null)} className="cursor-pointer"><X size={14} style={{ color: 'var(--his-fg-muted)' }} /></button>
                </div>
            )}

            {/* Form */}
            <div className="rounded-xl border p-5 space-y-5" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>

                {/* Patient Picker */}
                <div className="relative">
                    <label className="text-[10px] font-semibold block mb-1.5" style={{ color: 'var(--his-fg-muted)' }}>1. CHỌN BỆNH NHÂN</label>
                    <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer"
                        style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)' }}
                        onClick={() => setShowPatientDropdown(!showPatientDropdown)}
                    >
                        <Search size={14} style={{ color: 'var(--his-fg-muted)' }} />
                        {selectedPatient ? (
                            <span className="text-xs font-medium flex-1" style={{ color: 'var(--his-fg)' }}>
                                {selectedPatient.name[0]?.text} ({selectedPatient.identifier[0]?.value})
                            </span>
                        ) : (
                            <input
                                className="bg-transparent outline-none text-xs flex-1"
                                placeholder="Tìm bệnh nhân..."
                                value={patientSearch}
                                onChange={(e) => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                                onClick={(e) => { e.stopPropagation(); setShowPatientDropdown(true); }}
                                style={{ color: 'var(--his-fg)' }}
                            />
                        )}
                        {selectedPatient && (
                            <button onClick={(e) => { e.stopPropagation(); setSelectedPatient(null); setPatientSearch(''); }} className="cursor-pointer">
                                <X size={14} style={{ color: 'var(--his-fg-muted)' }} />
                            </button>
                        )}
                        <ChevronDown size={14} style={{ color: 'var(--his-fg-muted)' }} />
                    </div>
                    {showPatientDropdown && !selectedPatient && (
                        <div className="absolute z-20 mt-1 w-full rounded-lg border shadow-lg max-h-48 overflow-y-auto" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                            {patients.map((p) => (
                                <button
                                    key={p.id}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 cursor-pointer border-b"
                                    style={{ borderColor: 'var(--his-border)' }}
                                    onClick={() => { setSelectedPatient(p); setShowPatientDropdown(false); }}
                                >
                                    <span className="font-medium" style={{ color: 'var(--his-fg)' }}>{p.name[0]?.text}</span>
                                    <span className="ml-2" style={{ color: 'var(--his-fg-muted)' }}>({p.identifier[0]?.value})</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Medication Picker */}
                <div className="relative">
                    <label className="text-[10px] font-semibold block mb-1.5" style={{ color: 'var(--his-fg-muted)' }}>2. CHỌN THUỐC</label>
                    <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer"
                        style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)' }}
                        onClick={() => setShowMedDropdown(!showMedDropdown)}
                    >
                        <Pill size={14} style={{ color: 'var(--his-fg-muted)' }} />
                        {selectedMed ? (
                            <span className="text-xs font-medium flex-1" style={{ color: 'var(--his-fg)' }}>
                                {selectedMed.code.coding[0]?.display}
                            </span>
                        ) : (
                            <input
                                className="bg-transparent outline-none text-xs flex-1"
                                placeholder="Tìm thuốc..."
                                value={medSearch}
                                onChange={(e) => { setMedSearch(e.target.value); setShowMedDropdown(true); }}
                                onClick={(e) => { e.stopPropagation(); setShowMedDropdown(true); }}
                                style={{ color: 'var(--his-fg)' }}
                            />
                        )}
                        {selectedMed && (
                            <button onClick={(e) => { e.stopPropagation(); setSelectedMed(null); setMedSearch(''); }} className="cursor-pointer">
                                <X size={14} style={{ color: 'var(--his-fg-muted)' }} />
                            </button>
                        )}
                        <ChevronDown size={14} style={{ color: 'var(--his-fg-muted)' }} />
                    </div>
                    {showMedDropdown && !selectedMed && (
                        <div className="absolute z-20 mt-1 w-full rounded-lg border shadow-lg max-h-56 overflow-y-auto" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                            {medications.map((m) => (
                                <button
                                    key={m.id}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 cursor-pointer border-b"
                                    style={{ borderColor: 'var(--his-border)' }}
                                    onClick={() => { setSelectedMed(m); setShowMedDropdown(false); }}
                                >
                                    <div className="font-medium" style={{ color: 'var(--his-fg)' }}>{m.code.coding[0]?.display}</div>
                                    <div className="text-[10px]" style={{ color: 'var(--his-fg-muted)' }}>
                                        Hoạt chất: {m.ingredient.filter((i) => i.isActive).map((i) => i.item.concept.coding[0]?.display).join(', ')}
                                        {m.form && ` • ${m.form.coding[0]?.display}`}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Med Info */}
                {selectedMed && (
                    <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--his-primary-soft)' }}>
                        <div className="font-semibold mb-1" style={{ color: 'var(--his-primary)' }}>{selectedMed.code.coding[0]?.display}</div>
                        <div style={{ color: 'var(--his-fg-muted)' }}>
                            Hoạt chất: {selectedMed.ingredient.map((i) => (
                                <span key={i.item.concept.coding[0]?.display} className={i.isActive ? 'font-medium' : 'italic'}>
                                    {i.item.concept.coding[0]?.display}{i.isActive ? '' : ' (liên quan)'}
                                </span>
                            )).reduce<React.ReactNode[]>((a, b, i) => i === 0 ? [b] : [...a, ', ', b], [])}
                        </div>
                    </div>
                )}

                {/* Clinical Alert Section */}
                {checking && (
                    <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--his-primary-soft)' }}>
                        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--his-primary)' }} />
                        <span className="text-xs" style={{ color: 'var(--his-primary)' }}>Đang kiểm tra cảnh báo dị ứng...</span>
                    </div>
                )}

                {alerts.length > 0 && (
                    <div className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: '#ef4444', background: 'var(--his-danger-soft)' }}>
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={20} style={{ color: 'var(--his-danger)' }} />
                            <span className="text-sm font-bold" style={{ color: 'var(--his-danger)' }}>
                                ⚠️ CẢNH BÁO LÂM SÀNG ({alerts.length})
                            </span>
                        </div>
                        {alerts.map((alert) => (
                            <div key={alert.id} className="p-3 rounded-lg border" style={{ background: '#fff', borderColor: '#fecaca' }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white"
                                        style={{
                                            background: alert.severity === 'critical' ? '#dc2626' : alert.severity === 'high' ? '#ea580c' : '#d97706',
                                        }}
                                    >
                                        {alert.severity === 'critical' ? 'CRITICAL' : alert.severity === 'high' ? 'HIGH' : 'MODERATE'}
                                    </span>
                                    <span className="text-xs font-bold" style={{ color: 'var(--his-fg)' }}>{alert.title}</span>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--his-fg-muted)' }}>{alert.detail}</p>
                            </div>
                        ))}
                    </div>
                )}

                {selectedPatient && selectedMed && !checking && alerts.length === 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--his-success-soft)' }}>
                        <CheckCircle size={16} style={{ color: 'var(--his-success)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--his-success)' }}>Không phát hiện xung đột dị ứng — An toàn để kê đơn</span>
                    </div>
                )}

                {/* xClaw AI Check Section */}
                {selectedPatient && selectedMed && !checking && (
                    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: '#8b5cf6', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot size={18} style={{ color: '#7c3aed' }} />
                                <span className="text-xs font-bold" style={{ color: '#7c3aed' }}>xClaw AI — Kiểm tra đơn thuốc</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>AI</span>
                            </div>
                            <button
                                onClick={handleAiCheck}
                                disabled={aiChecking}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white cursor-pointer disabled:opacity-60 transition-all hover:shadow-md"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
                            >
                                {aiChecking ? (
                                    <><Loader2 size={12} className="animate-spin" /> Đang hỏi AI...</>
                                ) : (
                                    <><Sparkles size={12} /> Hỏi xClaw AI</>
                                )}
                            </button>
                        </div>
                        <p className="text-[10px]" style={{ color: '#6b7280' }}>
                            Gửi thông tin đơn thuốc đến xClaw AI (domain Healthcare) để kiểm tra tương tác thuốc, liều dùng, và đưa ra khuyến nghị lâm sàng.
                        </p>

                        {/* AI Result Panel */}
                        {showAiPanel && (
                            <div className="rounded-lg border p-3" style={{ background: '#fff', borderColor: '#ddd6fe' }}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-semibold" style={{ color: '#7c3aed' }}>Kết quả phân tích AI</span>
                                    <button onClick={() => { setShowAiPanel(false); setAiResult(null); }} className="cursor-pointer">
                                        <X size={12} style={{ color: '#a78bfa' }} />
                                    </button>
                                </div>
                                {aiChecking ? (
                                    <div className="flex items-center gap-2 py-4 justify-center">
                                        <Loader2 size={16} className="animate-spin" style={{ color: '#7c3aed' }} />
                                        <span className="text-xs" style={{ color: '#7c3aed' }}>xClaw AI đang phân tích đơn thuốc...</span>
                                    </div>
                                ) : aiResult ? (
                                    <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--his-fg)' }}>
                                        {aiResult}
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                )}

                {/* Dosage Fields */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--his-fg-muted)' }}>Liều dùng</label>
                        <input
                            className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                            style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)', color: 'var(--his-fg)' }}
                            value={dosage} onChange={(e) => setDosage(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--his-fg-muted)' }}>Tần suất</label>
                        <select
                            className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                            style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)', color: 'var(--his-fg)' }}
                            value={frequency} onChange={(e) => setFrequency(e.target.value)}
                        >
                            <option>1 lần/ngày</option>
                            <option>2 lần/ngày</option>
                            <option>3 lần/ngày</option>
                            <option>4 lần/ngày</option>
                            <option>Khi cần (PRN)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--his-fg-muted)' }}>Đường dùng</label>
                        <select
                            className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                            style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)', color: 'var(--his-fg)' }}
                            value={route} onChange={(e) => setRoute(e.target.value)}
                        >
                            <option>Đường uống</option>
                            <option>Tiêm tĩnh mạch (IV)</option>
                            <option>Tiêm bắp (IM)</option>
                            <option>Dưới lưỡi</option>
                            <option>Bôi ngoài da</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--his-fg-muted)' }}>Ghi chú</label>
                    <textarea
                        className="w-full px-3 py-2 rounded-lg border text-xs outline-none resize-none"
                        rows={2}
                        style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)', color: 'var(--his-fg)' }}
                        placeholder="Ghi chú cho đơn thuốc..."
                        value={note} onChange={(e) => setNote(e.target.value)}
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                    {alerts.length > 0 ? (
                        <>
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={submitting}
                                className="flex-1 py-2.5 rounded-lg text-xs font-medium text-white cursor-pointer disabled:opacity-50"
                                style={{ background: 'var(--his-warning)' }}
                            >
                                {submitting ? 'Đang xử lý...' : '⚠️ Xác nhận kê đơn (bỏ qua cảnh báo)'}
                            </button>
                            <button
                                onClick={resetForm}
                                className="px-4 py-2.5 rounded-lg text-xs font-medium cursor-pointer"
                                style={{ background: 'var(--his-danger-soft)', color: 'var(--his-danger)' }}
                            >
                                Hủy đơn
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting || !selectedPatient || !selectedMed || checking}
                            className="flex-1 py-2.5 rounded-lg text-xs font-medium text-white cursor-pointer disabled:opacity-50"
                            style={{ background: 'var(--his-primary)' }}
                        >
                            {submitting ? 'Đang lưu...' : '💊 Kê đơn thuốc'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
