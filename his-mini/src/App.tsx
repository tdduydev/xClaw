import { useState } from 'react';
import { Users, Pill, AlertTriangle, LayoutDashboard, MessageSquare, Activity, Stethoscope } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { PrescribePage } from './pages/PrescribePage';
import { AlertsPage } from './pages/AlertsPage';
import { ChatbotPage } from './pages/ChatbotPage';
import { EncounterPage } from './pages/EncounterPage';
import { XClawWidget } from './components/XClawWidget';

export interface PatientContext {
    id: string;
    name: string;
    gender: string;
    birthDate: string;
    allergies: string[];
    prescriptions: string[];
}

type Page = 'dashboard' | 'patients' | 'encounter' | 'prescribe' | 'alerts' | 'chatbot';

const NAV: { id: Page; label: string; icon: typeof Users }[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'patients', label: 'Bệnh nhân', icon: Users },
    { id: 'encounter', label: 'Khám bệnh (SOAP)', icon: Stethoscope },
    { id: 'prescribe', label: 'Kê đơn thuốc', icon: Pill },
    { id: 'alerts', label: 'Cảnh báo lâm sàng', icon: AlertTriangle },
    { id: 'chatbot', label: 'AI Trợ lý', icon: MessageSquare },
];

export function App() {
    const [page, setPage] = useState<Page>('dashboard');
    const [currentPatient, setCurrentPatient] = useState<PatientContext | null>(null);

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Dark Sidebar */}
            <aside
                className="flex flex-col w-[240px] shrink-0"
                style={{ background: 'var(--his-sidebar)' }}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 h-16" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--his-primary)' }}>
                        <Activity size={18} color="#fff" />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-white">HIS Mini</span>
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: 'rgba(14,165,233,0.15)', color: 'var(--his-primary-light)' }}>FHIR R5</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 px-3 space-y-1">
                    {NAV.map((item) => {
                        const active = page === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setPage(item.id)}
                                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer"
                                style={{
                                    background: active ? 'rgba(14,165,233,0.12)' : 'transparent',
                                    color: active ? 'var(--his-sidebar-text-active)' : 'var(--his-sidebar-text)',
                                }}
                            >
                                <item.icon size={18} style={{ color: active ? 'var(--his-primary-light)' : 'var(--his-sidebar-text)' }} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-5 py-4 text-[10px]" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.6)' }}>
                    HL7 FHIR R5 Compliant<br />
                    HIS Mini v1.0 — xClaw
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-y-auto" style={{ background: 'var(--his-bg)' }}>
                {page === 'dashboard' && <DashboardPage onNavigate={(p) => setPage(p as Page)} />}
                {page === 'patients' && <PatientsPage onPatientSelect={setCurrentPatient} />}
                {page === 'encounter' && <EncounterPage />}
                {page === 'prescribe' && <PrescribePage />}
                {page === 'alerts' && <AlertsPage />}
                {page === 'chatbot' && <ChatbotPage />}
            </main>

            {/* xClaw Floating Widget */}
            <XClawWidget patientContext={currentPatient} />
        </div>
    );
}
