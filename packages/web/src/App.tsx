import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';
import { ModelsPage } from './pages/ModelsPage';
import { MedicalPage } from './pages/MedicalPage';
import { DomainsPage } from './pages/DomainsPage';
import { DomainDetailPage } from './pages/DomainDetailPage';
import { DomainWorkspacePage } from './pages/DomainWorkspacePage';
import { MLPage } from './pages/MLPage';
import { MCPPage } from './pages/MCPPage';
import { EmbedChatPage } from './pages/EmbedChatPage';

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
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

export function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Embed route — no sidebar, auto-login via token */}
                    <Route path="/embed/chat" element={<EmbedChatPage />} />
                    {/* All other routes — with auth + sidebar layout */}
                    <Route path="/*" element={<ProtectedRoutes />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
