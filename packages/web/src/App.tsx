import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { I18nProvider } from './i18n';
import { Layout } from './components/Layout';
import { SettingsLayout } from './components/SettingsLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { SearchPage } from './pages/SearchPage';
import {
    SettingsOverviewPage, SettingsUsersPage, SettingsModelsPage,
    SettingsLanguagePage, SettingsRagPage, SettingsDomainsPage, SettingsSecurityPage,
} from './pages/settings';
import { ModelsPage } from './pages/ModelsPage';
import { MedicalPage } from './pages/MedicalPage';
import { DomainsPage } from './pages/DomainsPage';
import { DomainDetailPage } from './pages/DomainDetailPage';
import { DomainWorkspacePage } from './pages/DomainWorkspacePage';
import { MLPage } from './pages/MLPage';
import { MCPPage } from './pages/MCPPage';
import { PluginPage } from './pages/PluginPage';
import { EmbedChatPage } from './pages/EmbedChatPage';
import { AgentsPage } from './pages/AgentsPage';
import { WorkflowsPage } from './pages/WorkflowsPage';

function ProtectedRoutes() {
    const { user, loading } = useAuth();
    if (loading) return <div className="flex items-center justify-center h-screen" style={{ background: 'var(--color-bg)' }}><div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} /></div>;
    if (!user) return <LoginPage />;

    return (
        <Routes>
            <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="knowledge" element={<KnowledgePage />} />
                <Route path="knowledge/:id" element={<DocumentDetailPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="models" element={<ModelsPage />} />
                <Route path="medical" element={<MedicalPage />} />
                <Route path="domains" element={<DomainsPage />} />
                <Route path="domains/:id" element={<DomainDetailPage />} />
                <Route path="domains/:id/workspace" element={<DomainWorkspacePage />} />
                <Route path="ml" element={<MLPage />} />
                <Route path="mcp" element={<MCPPage />} />
                <Route path="agents" element={<AgentsPage />} />
                <Route path="workflows" element={<WorkflowsPage />} />
                <Route path="plugins/:pluginId/*" element={<PluginPage />} />
                <Route path="settings" element={<SettingsLayout />}>
                    <Route index element={<SettingsOverviewPage />} />
                    <Route path="users" element={<SettingsUsersPage />} />
                    <Route path="models" element={<SettingsModelsPage />} />
                    <Route path="language" element={<SettingsLanguagePage />} />
                    <Route path="rag" element={<SettingsRagPage />} />
                    <Route path="domains" element={<SettingsDomainsPage />} />
                    <Route path="security" element={<SettingsSecurityPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

export function App() {
    return (
        <BrowserRouter>
            <I18nProvider>
                <AuthProvider>
                    <Routes>
                        {/* Embed route — no sidebar, auto-login via token */}
                        <Route path="/embed/chat" element={<EmbedChatPage />} />
                        {/* All other routes — with auth + sidebar layout */}
                        <Route path="/*" element={<ProtectedRoutes />} />
                    </Routes>
                </AuthProvider>
            </I18nProvider>
        </BrowserRouter>
    );
}
