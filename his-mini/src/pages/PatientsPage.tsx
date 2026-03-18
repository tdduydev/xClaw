import { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, MapPin, AlertTriangle, X, Shield, Bot, Sparkles, Loader2, FileText } from 'lucide-react';
import { getPatients, getPatient, createPatient, addAllergy, deleteAllergy, getPrescriptions, getEncounters, loginXClaw, aiReadPatientRecord } from '../api';
import type { PatientContext } from '../App';

interface Patient {
    id: string;
    name: { text: string }[];
    identifier: { value: string }[];
    gender: string;
    birthDate: string;
    telecom?: { value: string }[];
    address?: { text: string }[];
}

interface Allergy {
    id: string;
    code: { coding: { display: string }[] };
    criticality: string;
    reaction?: { manifestation: { coding: { display: string }[] }[]; severity: string }[];
    clinicalStatus: { coding: { code: string }[] };
}

export function PatientsPage({ onPatientSelect }: { onPatientSelect?: (p: PatientContext | null) => void }) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<{ patient: Patient; allergies: Allergy[]; prescriptions: unknown[] } | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showAddAllergy, setShowAddAllergy] = useState(false);

    // xClaw AI state
    const [aiLoading, setAiLoading] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [xclawToken, setXclawToken] = useState<string | null>(null);
    const [aiQuestion, setAiQuestion] = useState('');

    const load = () => getPatients(search || undefined).then((d) => setPatients(d.patients));

    useEffect(() => { load(); }, [search]);

    useEffect(() => {
        if (selectedId) {
            getPatient(selectedId).then((d) => {
                setDetail(d);
                onPatientSelect?.({
                    id: d.patient.id,
                    name: d.patient.name[0]?.text ?? '',
                    gender: d.patient.gender,
                    birthDate: d.patient.birthDate,
                    allergies: d.allergies.map((a: Allergy) => a.code.coding[0]?.display ?? ''),
                    prescriptions: (d.prescriptions as { medication?: { display?: string } }[]).map((rx) => rx.medication?.display ?? ''),
                });
            });
            // Reset AI panel when switching patients
            setShowAiPanel(false);
            setAiAnalysis(null);
        } else {
            onPatientSelect?.(null);
        }
    }, [selectedId]);

    const handleAiReadRecord = async (question?: string) => {
        if (!detail) return;
        setAiLoading(true);
        setAiAnalysis(null);
        setShowAiPanel(true);
        try {
            let token = xclawToken;
            if (!token) {
                const auth = await loginXClaw('doctor@his.local', 'doctor123');
                if ('error' in auth) throw new Error(auth.error);
                token = auth.token;
                setXclawToken(token);
            }
            // Gather full patient data
            const [rxData, encounterData] = await Promise.all([
                getPrescriptions(detail.patient.id),
                getEncounters(detail.patient.id),
            ]);
            const patientData = {
                name: detail.patient.name[0]?.text,
                gender: detail.patient.gender,
                birthDate: detail.patient.birthDate,
                allergies: detail.allergies.map((a) => ({
                    substance: a.code.coding[0]?.display,
                    criticality: a.criticality,
                    reaction: a.reaction?.[0]?.manifestation[0]?.coding[0]?.display,
                })),
                prescriptions: (rxData.prescriptions || []).map((rx: any) => ({
                    medication: rx.medication?.display,
                    dosage: rx.dosageInstruction?.[0]?.text,
                    date: rx.authoredOn,
                })),
                encounters: (encounterData.encounters || []).map((enc: any) => ({
                    type: enc.type?.[0]?.coding?.[0]?.display,
                    date: enc.period?.start,
                    reason: enc.reasonCode?.[0]?.text,
                })),
            };
            const res = await aiReadPatientRecord(token!, patientData, question || undefined);
            setAiAnalysis(res.content || 'Không nhận được phản hồi từ AI.');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi kết nối xClaw';
            setAiAnalysis(`❌ ${msg}`);
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="flex h-full">
            {/* Patient List */}
            <div className="w-[340px] shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--his-border)', background: 'var(--his-surface)' }}>
                <div className="flex items-center gap-2 px-4 h-14 border-b" style={{ borderColor: 'var(--his-border)' }}>
                    <Users size={18} style={{ color: 'var(--his-primary)' }} />
                    <span className="text-sm font-semibold flex-1" style={{ color: 'var(--his-fg)' }}>Bệnh nhân</span>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: 'var(--his-primary)', color: '#fff' }}
                    >
                        <Plus size={14} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--his-border)' }}>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--his-bg)' }}>
                        <Search size={14} style={{ color: 'var(--his-fg-muted)' }} />
                        <input
                            className="bg-transparent outline-none text-xs flex-1"
                            placeholder="Tìm bệnh nhân..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ color: 'var(--his-fg)' }}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {patients.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedId(p.id)}
                            className="w-full px-4 py-3 border-b text-left cursor-pointer transition-colors"
                            style={{
                                borderColor: 'var(--his-border)',
                                background: selectedId === p.id ? 'var(--his-primary-soft)' : 'transparent',
                            }}
                        >
                            <div className="text-xs font-semibold" style={{ color: 'var(--his-fg)' }}>{p.name[0]?.text}</div>
                            <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: 'var(--his-fg-muted)' }}>
                                <span>Mã: {p.identifier[0]?.value}</span>
                                <span>{p.gender === 'male' ? 'Nam' : p.gender === 'female' ? 'Nữ' : 'Khác'}</span>
                                <span>{p.birthDate}</span>
                            </div>
                        </button>
                    ))}
                    {patients.length === 0 && (
                        <div className="p-6 text-center text-xs" style={{ color: 'var(--his-fg-muted)' }}>Không có bệnh nhân</div>
                    )}
                </div>
            </div>

            {/* Detail */}
            <div className="flex-1 overflow-y-auto p-6">
                {detail ? (
                    <div className="max-w-2xl mx-auto space-y-4">
                        {/* Patient Info */}
                        <div className="rounded-xl border p-5" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--his-fg)' }}>{detail.patient.name[0]?.text}</h2>
                            <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs">
                                <div><span style={{ color: 'var(--his-fg-muted)' }}>Mã BN:</span> <span className="font-medium">{detail.patient.identifier[0]?.value}</span></div>
                                <div><span style={{ color: 'var(--his-fg-muted)' }}>Giới tính:</span> <span className="font-medium">{detail.patient.gender === 'male' ? 'Nam' : detail.patient.gender === 'female' ? 'Nữ' : 'Khác'}</span></div>
                                <div><span style={{ color: 'var(--his-fg-muted)' }}>Ngày sinh:</span> <span className="font-medium">{detail.patient.birthDate}</span></div>
                                {detail.patient.telecom?.[0] && (
                                    <div className="flex items-center gap-1"><Phone size={12} style={{ color: 'var(--his-fg-muted)' }} /> <span className="font-medium">{detail.patient.telecom[0].value}</span></div>
                                )}
                                {detail.patient.address?.[0] && (
                                    <div className="flex items-center gap-1 col-span-2"><MapPin size={12} style={{ color: 'var(--his-fg-muted)' }} /> <span className="font-medium">{detail.patient.address[0].text}</span></div>
                                )}
                            </div>
                        </div>

                        {/* Allergies */}
                        <div className="rounded-xl border p-5" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Shield size={16} style={{ color: 'var(--his-danger)' }} />
                                    <h3 className="text-sm font-semibold" style={{ color: 'var(--his-fg)' }}>Tiền sử dị ứng thuốc</h3>
                                </div>
                                <button
                                    onClick={() => setShowAddAllergy(true)}
                                    className="text-[10px] font-medium px-2 py-1 rounded cursor-pointer"
                                    style={{ background: 'var(--his-danger-soft)', color: 'var(--his-danger)' }}
                                >
                                    + Thêm dị ứng
                                </button>
                            </div>
                            {detail.allergies.length > 0 ? (
                                <div className="space-y-2">
                                    {detail.allergies.map((a) => (
                                        <div
                                            key={a.id}
                                            className="flex items-center gap-3 p-3 rounded-lg border"
                                            style={{
                                                background: a.criticality === 'high' ? 'var(--his-danger-soft)' : 'var(--his-warning-soft)',
                                                borderColor: a.criticality === 'high' ? '#fecaca' : '#fde68a',
                                            }}
                                        >
                                            <AlertTriangle size={16} style={{ color: a.criticality === 'high' ? 'var(--his-danger)' : 'var(--his-warning)' }} />
                                            <div className="flex-1">
                                                <div className="text-xs font-semibold" style={{ color: 'var(--his-fg)' }}>
                                                    {a.code.coding[0]?.display}
                                                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium"
                                                        style={{
                                                            background: a.criticality === 'high' ? '#fecaca' : '#fde68a',
                                                            color: a.criticality === 'high' ? 'var(--his-danger)' : 'var(--his-warning)',
                                                        }}
                                                    >
                                                        {a.criticality === 'high' ? 'Nguy cơ cao' : 'Nguy cơ thấp'}
                                                    </span>
                                                </div>
                                                {a.reaction?.[0] && (
                                                    <div className="text-[10px] mt-1" style={{ color: 'var(--his-fg-muted)' }}>
                                                        Phản ứng: {a.reaction[0].manifestation[0]?.coding[0]?.display} ({a.reaction[0].severity})
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    await deleteAllergy(detail.patient.id, a.id);
                                                    const updated = await getPatient(detail.patient.id);
                                                    setDetail(updated);
                                                }}
                                                className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
                                                style={{ color: 'var(--his-fg-muted)' }}
                                                title="Xoá"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs" style={{ color: 'var(--his-fg-muted)' }}>Không có tiền sử dị ứng</p>
                            )}
                        </div>

                        {/* Recent prescriptions */}
                        <div className="rounded-xl border p-5" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--his-fg)' }}>Đơn thuốc gần đây</h3>
                            {(detail.prescriptions as any[]).length > 0 ? (
                                <div className="space-y-2">
                                    {(detail.prescriptions as any[]).map((rx: any) => (
                                        <div key={rx.id} className="flex items-center gap-3 p-3 rounded-lg border text-xs" style={{ borderColor: 'var(--his-border)' }}>
                                            <div className="flex-1">
                                                <span className="font-semibold" style={{ color: 'var(--his-fg)' }}>{rx.medication?.display}</span>
                                                {rx.dosageInstruction?.[0]?.text && (
                                                    <span className="ml-2" style={{ color: 'var(--his-fg-muted)' }}> — {rx.dosageInstruction[0].text}</span>
                                                )}
                                            </div>
                                            <span className="text-[10px]" style={{ color: 'var(--his-fg-muted)' }}>
                                                {new Date(rx.authoredOn).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs" style={{ color: 'var(--his-fg-muted)' }}>Chưa có đơn thuốc</p>
                            )}
                        </div>

                        {/* xClaw AI — Đọc bệnh án */}
                        <div className="rounded-xl border p-5" style={{ borderColor: '#8b5cf6', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Bot size={18} style={{ color: '#7c3aed' }} />
                                    <h3 className="text-sm font-semibold" style={{ color: '#7c3aed' }}>xClaw AI — Đọc bệnh án</h3>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>AI</span>
                                </div>
                                <button
                                    onClick={() => handleAiReadRecord()}
                                    disabled={aiLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white cursor-pointer disabled:opacity-60 transition-all hover:shadow-md"
                                    style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
                                >
                                    {aiLoading ? (
                                        <><Loader2 size={12} className="animate-spin" /> Đang phân tích...</>
                                    ) : (
                                        <><FileText size={12} /> Đọc bệnh án</>
                                    )}
                                </button>
                            </div>
                            <p className="text-[10px] mb-3" style={{ color: '#6b7280' }}>
                                Gửi toàn bộ hồ sơ bệnh nhân (dị ứng, đơn thuốc, lượt khám) đến xClaw AI để tổng hợp và phân tích.
                            </p>

                            {/* Custom question input */}
                            <div className="flex gap-2 mb-3">
                                <input
                                    className="flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none"
                                    style={{ borderColor: '#ddd6fe', background: '#fff', color: 'var(--his-fg)' }}
                                    placeholder="Hỏi AI câu hỏi cụ thể (tuỳ chọn)..."
                                    value={aiQuestion}
                                    onChange={(e) => setAiQuestion(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !aiLoading) handleAiReadRecord(aiQuestion); }}
                                />
                                <button
                                    onClick={() => handleAiReadRecord(aiQuestion)}
                                    disabled={aiLoading || !aiQuestion.trim()}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white cursor-pointer disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
                                >
                                    <Sparkles size={12} />
                                </button>
                            </div>

                            {/* AI Result */}
                            {showAiPanel && (
                                <div className="rounded-lg border p-4" style={{ background: '#fff', borderColor: '#ddd6fe' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-semibold" style={{ color: '#7c3aed' }}>Kết quả phân tích AI</span>
                                        <button onClick={() => { setShowAiPanel(false); setAiAnalysis(null); }} className="cursor-pointer">
                                            <X size={12} style={{ color: '#a78bfa' }} />
                                        </button>
                                    </div>
                                    {aiLoading ? (
                                        <div className="flex items-center gap-2 py-6 justify-center">
                                            <Loader2 size={16} className="animate-spin" style={{ color: '#7c3aed' }} />
                                            <span className="text-xs" style={{ color: '#7c3aed' }}>xClaw AI đang đọc hồ sơ bệnh nhân...</span>
                                        </div>
                                    ) : aiAnalysis ? (
                                        <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--his-fg)' }}>
                                            {aiAnalysis}
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--his-fg-muted)' }}>
                        Chọn bệnh nhân để xem chi tiết
                    </div>
                )}
            </div>

            {/* Create Patient Modal */}
            {showCreate && (
                <CreatePatientModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => { setShowCreate(false); load(); }}
                />
            )}

            {/* Add Allergy Modal */}
            {showAddAllergy && selectedId && (
                <AddAllergyModal
                    patientId={selectedId}
                    onClose={() => setShowAddAllergy(false)}
                    onAdded={async () => {
                        setShowAddAllergy(false);
                        const updated = await getPatient(selectedId);
                        setDetail(updated);
                    }}
                />
            )}
        </div>
    );
}

function CreatePatientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({ name: '', gender: 'male', birthDate: '', phone: '', address: '' });
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!form.name) return;
        setLoading(true);
        await createPatient(form);
        setLoading(false);
        onCreated();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="rounded-xl border p-6 w-[420px] shadow-xl" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--his-fg)' }}>Thêm bệnh nhân mới</h3>
                    <button onClick={onClose} className="cursor-pointer"><X size={16} style={{ color: 'var(--his-fg-muted)' }} /></button>
                </div>
                <div className="space-y-3">
                    <Field label="Họ tên" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Nguyễn Văn A" />
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--his-fg-muted)' }}>Giới tính</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                                style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)', color: 'var(--his-fg)' }}
                                value={form.gender}
                                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                            >
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                                <option value="other">Khác</option>
                            </select>
                        </div>
                        <Field label="Ngày sinh" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} type="date" />
                    </div>
                    <Field label="Điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0901234567" />
                    <Field label="Địa chỉ" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="123 Nguyễn Huệ, Q.1" />
                </div>
                <div className="flex justify-end gap-2 mt-5">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs cursor-pointer" style={{ color: 'var(--his-fg-muted)' }}>Huỷ</button>
                    <button
                        onClick={submit}
                        disabled={loading || !form.name}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-white cursor-pointer disabled:opacity-50"
                        style={{ background: 'var(--his-primary)' }}
                    >
                        {loading ? 'Đang lưu...' : 'Thêm bệnh nhân'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AddAllergyModal({ patientId, onClose, onAdded }: { patientId: string; onClose: () => void; onAdded: () => void }) {
    const [form, setForm] = useState({ substance: '', criticality: 'high', reaction: '', reactionSeverity: 'moderate', verified: true });
    const [loading, setLoading] = useState(false);

    const COMMON_ALLERGENS = ['Penicillin', 'Amoxicillin', 'Aspirin', 'Ibuprofen', 'Sulfonamide', 'Cephalexin', 'Ciprofloxacin', 'Diclofenac'];

    const submit = async () => {
        if (!form.substance) return;
        setLoading(true);
        await addAllergy(patientId, form);
        setLoading(false);
        onAdded();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="rounded-xl border p-6 w-[420px] shadow-xl" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--his-fg)' }}>Thêm dị ứng thuốc</h3>
                    <button onClick={onClose} className="cursor-pointer"><X size={16} style={{ color: 'var(--his-fg-muted)' }} /></button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--his-fg-muted)' }}>Hoạt chất dị ứng</label>
                        <input
                            className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                            style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)', color: 'var(--his-fg)' }}
                            placeholder="Tên hoạt chất..."
                            value={form.substance}
                            onChange={(e) => setForm({ ...form, substance: e.target.value })}
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                            {COMMON_ALLERGENS.map((a) => (
                                <button
                                    key={a}
                                    onClick={() => setForm({ ...form, substance: a })}
                                    className="text-[10px] px-2 py-0.5 rounded cursor-pointer"
                                    style={{ background: 'var(--his-primary-soft)', color: 'var(--his-primary)' }}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--his-fg-muted)' }}>Mức độ nguy cơ</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                                style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)', color: 'var(--his-fg)' }}
                                value={form.criticality}
                                onChange={(e) => setForm({ ...form, criticality: e.target.value })}
                            >
                                <option value="high">Cao (High)</option>
                                <option value="low">Thấp (Low)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--his-fg-muted)' }}>Mức độ phản ứng</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                                style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)', color: 'var(--his-fg)' }}
                                value={form.reactionSeverity}
                                onChange={(e) => setForm({ ...form, reactionSeverity: e.target.value })}
                            >
                                <option value="severe">Nặng (Severe)</option>
                                <option value="moderate">Trung bình (Moderate)</option>
                                <option value="mild">Nhẹ (Mild)</option>
                            </select>
                        </div>
                    </div>
                    <Field label="Biểu hiện phản ứng" value={form.reaction} onChange={(v) => setForm({ ...form, reaction: v })} placeholder="VD: Phản vệ, Mề đay, Phát ban..." />
                </div>
                <div className="flex justify-end gap-2 mt-5">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs cursor-pointer" style={{ color: 'var(--his-fg-muted)' }}>Huỷ</button>
                    <button
                        onClick={submit}
                        disabled={loading || !form.substance}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-white cursor-pointer disabled:opacity-50"
                        style={{ background: 'var(--his-danger)' }}
                    >
                        {loading ? 'Đang lưu...' : 'Thêm dị ứng'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, placeholder, type }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
    return (
        <div>
            <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--his-fg-muted)' }}>{label}</label>
            <input
                type={type || 'text'}
                className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ borderColor: 'var(--his-border)', background: 'var(--his-bg)', color: 'var(--his-fg)' }}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
