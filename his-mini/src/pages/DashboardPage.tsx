import { useState, useEffect } from 'react';
import { Users, Pill, AlertTriangle, Activity, FileText, ArrowRight } from 'lucide-react';
import { getStats } from '../api';

interface Stats {
    patients: number; allergies: number; medications: number;
    prescriptions: number; alerts: number; criticalAlerts: number;
}

export function DashboardPage({ onNavigate }: { onNavigate: (page: string) => void }) {
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        getStats().then(setStats).catch(() => { });
    }, []);

    const cards = [
        { label: 'Bệnh nhân', value: stats?.patients ?? '-', icon: Users, color: 'var(--his-primary)', bg: 'var(--his-primary-soft)', nav: 'patients' },
        { label: 'Đơn thuốc', value: stats?.prescriptions ?? '-', icon: FileText, color: 'var(--his-success)', bg: 'var(--his-success-soft)', nav: 'prescribe' },
        { label: 'Thuốc trong kho', value: stats?.medications ?? '-', icon: Pill, color: 'var(--his-info)', bg: '#ecfeff', nav: '' },
        { label: 'Cảnh báo lâm sàng', value: stats?.alerts ?? '-', icon: AlertTriangle, color: 'var(--his-danger)', bg: 'var(--his-danger-soft)', nav: 'alerts' },
    ];

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--his-primary-soft)' }}>
                    <Activity size={20} style={{ color: 'var(--his-primary)' }} />
                </div>
                <div>
                    <h1 className="text-lg font-bold" style={{ color: 'var(--his-fg)' }}>Hệ thống Thông tin Bệnh viện</h1>
                    <p className="text-xs" style={{ color: 'var(--his-fg-muted)' }}>Hospital Information System — FHIR R5</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {cards.map((card) => (
                    <button
                        key={card.label}
                        onClick={() => card.nav && onNavigate(card.nav)}
                        className="rounded-xl p-4 border transition-shadow hover:shadow-md text-left"
                        style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: card.bg }}>
                                <card.icon size={18} style={{ color: card.color }} />
                            </div>
                            {card.nav && <ArrowRight size={14} style={{ color: 'var(--his-fg-muted)' }} />}
                        </div>
                        <p className="text-2xl font-bold" style={{ color: 'var(--his-fg)' }}>{card.value}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--his-fg-muted)' }}>{card.label}</p>
                    </button>
                ))}
            </div>

            {/* Critical Alerts Banner */}
            {stats && stats.criticalAlerts > 0 && (
                <div
                    className="rounded-xl p-4 border flex items-center gap-3 mb-6"
                    style={{ background: 'var(--his-danger-soft)', borderColor: '#fecaca' }}
                >
                    <AlertTriangle size={20} style={{ color: 'var(--his-danger)' }} />
                    <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--his-danger)' }}>
                            {stats.criticalAlerts} cảnh báo nghiêm trọng
                        </p>
                        <p className="text-xs" style={{ color: 'var(--his-fg-muted)' }}>Có cảnh báo dị ứng thuốc cần xem xét</p>
                    </div>
                    <button
                        onClick={() => onNavigate('alerts')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer"
                        style={{ background: 'var(--his-danger)' }}
                    >
                        Xem ngay
                    </button>
                </div>
            )}

            {/* Info */}
            <div className="rounded-xl border p-5" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--his-fg)' }}>Về hệ thống</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <InfoRow label="Chuẩn dữ liệu" value="HL7 FHIR R5 (5.0.0)" />
                        <InfoRow label="Mã hóa thuốc" value="SNOMED CT" />
                        <InfoRow label="Cảnh báo lâm sàng" value="Allergy ↔ Drug Substance" />
                    </div>
                    <div className="space-y-2">
                        <InfoRow label="Phát hiện phản ứng chéo" value="Cross-reactivity engine" />
                        <InfoRow label="Tích hợp AI" value="xClaw Chatbot" />
                        <InfoRow label="Mục đích" value="Demo HIS + Clinical Decision Support" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start gap-2 text-xs">
            <span className="font-medium min-w-[140px]" style={{ color: 'var(--his-fg-muted)' }}>{label}:</span>
            <span style={{ color: 'var(--his-fg)' }}>{value}</span>
        </div>
    );
}
