import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { App as CapacitorApp } from '@capacitor/app';
import { uiText } from './i18n/ui';
import { Capacitor } from '@capacitor/core';

const AppShell = lazy(() => import('./components/layout/AppShell').then(m => ({ default: m.AppShell })));
const PendingWorkPage = lazy(() => import('./components/common/PendingWork').then(m => ({ default: m.PendingWorkPage })));
const LandingPage = lazy(() => import('./pages/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const SelectRole = lazy(() => import('./pages/auth/SelectRole').then(m => ({ default: m.SelectRole })));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const ProjectProposals = lazy(() => import('./pages/projects/ProjectProposals').then(m => ({ default: m.ProjectProposals })));
const ProjectsList = lazy(() => import('./pages/projects/ProjectsList').then(m => ({ default: m.ProjectsList })));
const ProjectDetail = lazy(() => import('./pages/projects/ProjectDetail').then(m => ({ default: m.ProjectDetail })));
const ContractorsList = lazy(() => import('./pages/contractors/ContractorsList').then(m => ({ default: m.ContractorsList })));
const ContractorProfile = lazy(() => import('./pages/contractors/ContractorProfile').then(m => ({ default: m.ContractorProfile })));
const TendersList = lazy(() => import('./pages/tenders/TendersList').then(m => ({ default: m.TendersList })));
const StaffList = lazy(() => import('./pages/staff/StaffList').then(m => ({ default: m.StaffList })));
const FinanceDashboard = lazy(() => import('./pages/finance/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
const QualityList = lazy(() => import('./pages/quality/QualityList').then(m => ({ default: m.QualityList })));
const DefectsList = lazy(() => import('./pages/defects/DefectsList').then(m => ({ default: m.DefectsList })));
const ApprovalsInbox = lazy(() => import('./pages/approvals/ApprovalsInbox').then(m => ({ default: m.ApprovalsInbox })));
const DocumentsRepo = lazy(() => import('./pages/documents/DocumentsRepo').then(m => ({ default: m.DocumentsRepo })));
const ReportsCenter = lazy(() => import('./pages/reports/ReportsCenter').then(m => ({ default: m.ReportsCenter })));
const NotificationsCenter = lazy(() => import('./pages/notifications/NotificationsCenter').then(m => ({ default: m.NotificationsCenter })));
const AuditLogPage = lazy(() => import('./pages/audit/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const GlobalSearch = lazy(() => import('./pages/search/GlobalSearch').then(m => ({ default: m.GlobalSearch })));
const ObserverDashboard = lazy(() => import('./pages/observer/ObserverDashboard').then(m => ({ default: m.ObserverDashboard })));
const FieldHome = lazy(() => import('./pages/field/FieldHome').then(m => ({ default: m.FieldHome })));
const AccessManagement = lazy(() => import('./pages/admin/AccessManagement').then(m => ({ default: m.AccessManagement })));
const PortfolioTimeline = lazy(() => import('./pages/portfolio/PortfolioTimeline').then(m => ({ default: m.PortfolioTimeline })));

function PageLoading() {
  return <div role="status" className="mx-auto max-w-5xl animate-pulse space-y-4 p-6" aria-label="Loading page"><div className="h-7 w-48 rounded-lg bg-blue-100"/><div className="h-32 rounded-2xl bg-slate-100"/><div className="h-32 rounded-2xl bg-slate-100"/></div>;
}

class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="mx-auto mt-20 max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm"><h1 className="text-lg font-semibold text-slate-900">{uiText('This page could not be opened')}</h1><p className="mt-2 text-sm text-slate-600">{uiText('Check your connection and try again. Your local drafts remain on this device.')}</p><button type="button" className="mt-5 min-h-11 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white" onClick={() => window.location.reload()}>{uiText('Reload page')}</button></div>;
  }
}

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
      <PageErrorBoundary><Suspense fallback={<PageLoading />}><Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/landingpage" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/select-role" element={<SelectRole />} />

        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/pending-work" element={<PendingWorkPage />} />
          <Route path="/project-proposals" element={<ProjectProposals />} />
          <Route path="/projects" element={<ProjectsList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/contractors" element={<ContractorsList />} />
          <Route path="/contractors/:id" element={<ContractorProfile />} />
          <Route path="/tenders" element={<TendersList />} />
          <Route path="/workers" element={<Navigate to="/dashboard" replace />} />
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
      </Routes></Suspense></PageErrorBoundary>
    </BrowserRouter>
  );
}
