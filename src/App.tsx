import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AppShell } from './components/layout/AppShell';

import { Landing } from './pages/landing/Landing';
import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { SelectRole } from './pages/auth/SelectRole';

import { Dashboard } from './pages/dashboard/Dashboard';
import { ProjectsList } from './pages/projects/ProjectsList';
import { ProjectDetail } from './pages/projects/ProjectDetail';
import { ContractorsList } from './pages/contractors/ContractorsList';
import { ContractorProfile } from './pages/contractors/ContractorProfile';
import { TendersList } from './pages/tenders/TendersList';
import { WorkersList } from './pages/workers/WorkersList';
import { StaffList } from './pages/staff/StaffList';
import { FinanceDashboard } from './pages/finance/FinanceDashboard';
import { QualityList } from './pages/quality/QualityList';
import { DefectsList } from './pages/defects/DefectsList';
import { ApprovalsInbox } from './pages/approvals/ApprovalsInbox';
import { DocumentsRepo } from './pages/documents/DocumentsRepo';
import { ReportsCenter } from './pages/reports/ReportsCenter';
import { NotificationsCenter } from './pages/notifications/NotificationsCenter';
import { AuditLogPage } from './pages/audit/AuditLogPage';
import { GlobalSearch } from './pages/search/GlobalSearch';
import { ObserverDashboard } from './pages/observer/ObserverDashboard';
import { FieldHome } from './pages/field/FieldHome';
import { AccessManagement } from './pages/admin/AccessManagement';
import { PortfolioTimeline } from './pages/portfolio/PortfolioTimeline';

/** In the native Android WebView shell, the hardware/gesture back button otherwise exits the app
 * outright instead of navigating within it — a jarring, easy-to-miss gap for a real app. Mirror
 * normal Android behaviour: step back through in-app history, only exit once there's nowhere
 * left to go. No-ops on the website (Capacitor.isNativePlatform() is false there). */
function useAndroidBackButton() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else CapacitorApp.exitApp();
    });
    return () => { listener.then((l) => l.remove()); };
  }, []);
}

export default function App() {
  useAndroidBackButton();
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/select-role" element={<SelectRole />} />

        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectsList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/contractors" element={<ContractorsList />} />
          <Route path="/contractors/:id" element={<ContractorProfile />} />
          <Route path="/tenders" element={<TendersList />} />
          <Route path="/workers" element={<WorkersList />} />
          <Route path="/staff" element={<StaffList />} />
          <Route path="/finance" element={<FinanceDashboard />} />
          <Route path="/quality" element={<QualityList />} />
          <Route path="/defects" element={<DefectsList />} />
          <Route path="/approvals" element={<ApprovalsInbox />} />
          <Route path="/documents" element={<DocumentsRepo />} />
          <Route path="/reports" element={<ReportsCenter />} />
          <Route path="/notifications" element={<NotificationsCenter />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/search" element={<GlobalSearch />} />
          <Route path="/observer" element={<ObserverDashboard />} />
          <Route path="/field" element={<FieldHome />} />
          <Route path="/access" element={<AccessManagement />} />
          <Route path="/portfolio-timeline" element={<PortfolioTimeline />} />
        </Route>

        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
