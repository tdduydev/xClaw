import { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Clock } from 'lucide-react';
import { getAlerts } from '../api';

interface Alert {
    id: string; type: string; severity: string; title: string; detail: string;
    allergySubstance: string; ingredient: string; medicationName: string;
    patientId: string; timestamp: string;
}

export function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getAlerts().then((d) => { setAlerts(d.alerts || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const severityColor = (s: string) => {
        if (s === 'critical') return { bg: '#dc2626', text: '#fff' };
        if (s === 'high') return { bg: '#ea580c', text: '#fff' };
        if (s === 'moderate') return { bg: '#d97706', text: '#fff' };
        return { bg: '#64748b', text: '#fff' };
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--his-danger-soft)' }}>
                    <ShieldAlert size={20} style={{ color: 'var(--his-danger)' }} />
                </div>
                <div>
                    <h1 className="text-lg font-bold" style={{ color: 'var(--his-fg)' }}>Cảnh báo Lâm sàng</h1>
                    <p className="text-xs" style={{ color: 'var(--his-fg-muted)' }}>Lịch sử các cảnh báo dị ứng thuốc — Allergy ↔ Drug Substance Conflict</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-xs" style={{ color: 'var(--his-fg-muted)' }}>Đang tải...</div>
            ) : alerts.length === 0 ? (
                <div className="rounded-xl border p-8 text-center" style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}>
                    <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: 'var(--his-fg-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--his-fg-muted)' }}>Chưa có cảnh báo nào</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--his-fg-muted)' }}>Cảnh báo sẽ xuất hiện khi bác sĩ kê thuốc xung đột với tiền sử dị ứng bệnh nhân</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {alerts.map((alert) => {
                        const sc = severityColor(alert.severity);
                        return (
                            <div
                                key={alert.id}
                                className="rounded-xl border p-4"
                                style={{ background: 'var(--his-surface)', borderColor: 'var(--his-border)' }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span
                                        className="text-[10px] px-2 py-0.5 rounded font-bold"
                                        style={{ background: sc.bg, color: sc.text }}
                                    >
                                        {alert.severity.toUpperCase()}
                                    </span>
                                    <span className="text-xs font-bold flex-1" style={{ color: 'var(--his-fg)' }}>{alert.title}</span>
                                    <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--his-fg-muted)' }}>
                                        <Clock size={10} />
                                        {new Date(alert.timestamp).toLocaleString('vi-VN')}
                                    </div>
                                </div>
                                <p className="text-xs mb-2" style={{ color: 'var(--his-fg-muted)' }}>{alert.detail}</p>
                                <div className="flex gap-4 text-[10px]" style={{ color: 'var(--his-fg-muted)' }}>
                                    <span>Dị ứng: <strong>{alert.allergySubstance}</strong></span>
                                    <span>Thuốc: <strong>{alert.medicationName}</strong></span>
                                    <span>Hoạt chất: <strong>{alert.ingredient}</strong></span>
                                    <span>BN: <strong>{alert.patientId}</strong></span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
