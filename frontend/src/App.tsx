import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { DashboardPage } from './pages/DashboardPage';
import { MedicationLogPage } from './pages/MedicationLogPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingWizardPage } from './pages/OnboardingWizardPage';
import { ClinicianPortalPage } from './pages/ClinicianPortalPage';
import { PartnerSupportPage } from './pages/PartnerSupportPage';
import { SettingsPage } from './pages/SettingsPage';
import { Home, BookOpen, Settings } from 'lucide-react';
import { Button } from './components/ui/Button';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const AppContent: React.FC = () => {
  const { activeTab, user, loading, toastMessage, logout, changeTab, medications } = useApp();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  // Get user initials
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Render Premium Loading Screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-ivory">
        <div className="w-10 h-10 rounded-full border-4 border-lavender border-t-transparent animate-spin mb-4" />
        <p className="font-heading text-xs font-semibold text-navy tracking-wider uppercase">Loading Ovify...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Clinician route */}
      <Route path="/clinician" element={<ClinicianPortalPage />} />

      {/* Partner route */}
      <Route path="/partner" element={<PartnerSupportPage />} />

      {/* Patient Login route */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <div className="mobile-pwa-frame">
              <LoginPage />
            </div>
          )
        }
      />

      {/* Patient / Main App route */}
      <Route
        path="/"
        element={
          !user ? (
            <div className="mobile-pwa-frame">
              <LoginPage />
            </div>
          ) : !user.onboarded ? (
            <div className="mobile-pwa-frame">
              <OnboardingWizardPage />
            </div>
          ) : (
            <div className="mobile-pwa-frame overflow-hidden bg-bg-ivory/30">
              {/* Dynamic Slide-in Success Toast */}
              {toastMessage && (
                <div role="status" aria-live="polite" className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-2xl bg-sage text-white font-heading text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce transition-all duration-300">
                  <span className="text-sm">✓</span>
                  <span>{toastMessage}</span>
                </div>
              )}

              {/* Top Navigation Bar */}
              <nav className="flex items-center justify-between px-5 py-4 z-20 backdrop-blur-md bg-bg-ivory/45 border-b border-navy-10/40">
                <div className="flex items-center gap-2.5">
                  <img 
                    src="/static/logo.png" 
                    alt="Ovify Logo" 
                    className="w-8 h-8 object-contain rounded-lg shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <h1 className="font-heading text-lg font-bold tracking-tight text-navy">
                    Ovify
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    aria-label="Open sign out dialog"
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-lavender to-blush flex items-center justify-center font-data text-sm font-bold text-white shadow-md hover:scale-105 active:scale-95 focus:ring-2 focus:ring-lavender focus:outline-none transition-transform duration-300 cursor-pointer"
                  >
                    {getInitials(user.name)}
                  </button>
                </div>
              </nav>

              {/* Main Page Views Dispatcher */}
              <main className="flex-1 flex flex-col relative overflow-hidden">
                {activeTab === 'dashboard' ? (
                  <DashboardPage />
                ) : activeTab === 'medications' ? (
                  <MedicationLogPage />
                ) : activeTab === 'calendar' ? (
                  <div className="flex-1 flex items-center justify-center font-body text-xs text-navy-55">Calendar View (Phase 2)</div>
                ) : (
                  <SettingsPage />
                )}
              </main>

              {/* App Shell Footer Tab Bar indicator or spacing */}
              <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-bg-ivory to-transparent pointer-events-none z-10" />

              {/* Bottom Navigation Tab Bar */}
              <nav className="z-20 backdrop-blur-md bg-white/85 border-t border-navy-10/40 flex justify-around py-3 px-4 shadow-lg" role="navigation" aria-label="Bottom Navigation">
                <button
                  onClick={() => changeTab('dashboard')}
                  aria-label="Navigate to Home Dashboard"
                  aria-current={activeTab === 'dashboard' ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 font-heading text-[10px] font-bold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-lavender p-1 rounded-lg ${
                    activeTab === 'dashboard' ? 'text-lavender-dark' : 'text-navy-55 hover:text-navy'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => medications.length > 0 && changeTab('calendar')}
                  disabled={medications.length === 0}
                  aria-label="Navigate to Calendar"
                  aria-current={activeTab === 'calendar' ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 font-heading text-[10px] font-bold transition-colors p-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeTab === 'calendar' ? 'text-lavender-dark' : 'text-navy-55 hover:text-navy'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Calendar</span>
                </button>

                <button
                  onClick={() => medications.length > 0 && changeTab('medications')}
                  disabled={medications.length === 0}
                  aria-label="Navigate to Medications Checklist"
                  aria-current={activeTab === 'medications' ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 font-heading text-[10px] font-bold transition-colors p-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeTab === 'medications' ? 'text-lavender-dark' : 'text-navy-55 hover:text-navy'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>Medications</span>
                </button>

                <button
                  onClick={() => changeTab('settings')}
                  aria-label="Navigate to Settings Console"
                  aria-current={activeTab === 'settings' ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 font-heading text-[10px] font-bold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-lavender p-1 rounded-lg ${
                    activeTab === 'settings' ? 'text-lavender-dark' : 'text-navy-55 hover:text-navy'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
              </nav>

              {/* Slide-over Profile Settings Drawer */}
              {showLogoutConfirm && (
                <div 
                  className="fixed inset-0 z-50 flex justify-end bg-navy/30 backdrop-blur-sm transition-opacity duration-300"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  <div 
                    className="w-72 max-w-full h-full bg-white shadow-2xl p-6 flex flex-col justify-between animate-slide-in relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-heading text-lg font-bold text-navy">Profile Details</h3>
                        <button 
                          onClick={() => setShowLogoutConfirm(false)}
                          className="text-navy-55 hover:text-navy font-bold text-lg p-1"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-bg-ivory border border-navy-10/40">
                          <span className="block text-[10px] font-bold text-navy-55 uppercase tracking-wider">Full Name</span>
                          <span className="font-heading text-sm font-semibold text-navy">{user.name}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-bg-ivory border border-navy-10/40">
                          <span className="block text-[10px] font-bold text-navy-55 uppercase tracking-wider">Phone Number</span>
                          <span className="font-data text-xs text-navy">{user.phone || 'N/A'}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-bg-ivory border border-navy-10/40">
                          <span className="block text-[10px] font-bold text-navy-55 uppercase tracking-wider">Email Address</span>
                          <span className="font-body text-xs text-navy break-all">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-navy-10/40">
                      <Button
                        variant="due"
                        fullWidth
                        onClick={() => {
                          logout();
                          setShowLogoutConfirm(false);
                        }}
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        }
      />

      {/* fallback 404 Route */}
      <Route
        path="*"
        element={
          <div className="flex flex-col items-center justify-center min-h-screen bg-bg-ivory p-6 text-center">
            <h2 className="font-heading text-4xl font-bold text-navy mb-2">404</h2>
            <p className="font-heading text-lg font-bold text-navy-80 mb-1">Page Not Found</p>
            <p className="font-body text-xs text-navy-55 mb-6 max-w-sm">The screen or persona portal you are trying to access does not exist or has been moved.</p>
            <a
              href="/"
              className="py-3 px-6 bg-navy text-white font-heading text-xs font-bold rounded-xl hover:bg-navy-80 shadow-md transition-all duration-300"
            >
              Go to Home Page
            </a>
          </div>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
