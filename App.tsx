import React, { useState, useEffect } from 'react';
import type { View } from './types';
import { useSchoolPlatform } from './hooks/useSchoolPlatform';
import LoginScreen from './components/LoginScreen';
import Layout from './components/Layout';
import DashboardView from './components/DashboardView';
import CoursesView from './components/CoursesView';
import AssessmentsView from './components/AssessmentsView';
import DirectoryView from './components/DirectoryView';
import AttendanceView from './components/AttendanceView';
import FeesView from './components/FeesView';
import ScheduleView from './components/ScheduleView';
import AiAssistantView from './components/AiAssistantView';
import WhiteLabelSettingsView from './components/WhiteLabelSettingsView';
import Spinner from './components/ui/Spinner';

const THEME_STORAGE_KEY = 'mss_theme_mode';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage failures
    }
  }, [isDark]);

  const platform = useSchoolPlatform();

  const handleToggleTheme = () => setIsDark(prev => !prev);

  if (platform.loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-3">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Initializing School Management &amp; LMS Platform...
        </p>
      </div>
    );
  }

  if (platform.error || !platform.bootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center space-y-3">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Unable to Load School Portal
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {platform.error || 'Server connection unavailable.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!platform.session || !platform.db) {
    return (
      <LoginScreen
        bootstrap={platform.bootstrap}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onLogin={async params => {
          await platform.login(params);
          setCurrentView('dashboard');
        }}
      />
    );
  }

  const renderView = () => {
    const { session, db } = platform;
    if (!session || !db) return null;

    switch (currentView) {
      case 'dashboard':
        return <DashboardView session={session} db={db} onNavigate={setCurrentView} />;
      case 'courses':
        return (
          <CoursesView
            session={session}
            db={db}
            onCreateCourse={platform.createCourse}
            onAddLesson={platform.addLesson}
            onToggleLessonComplete={platform.toggleLessonComplete}
          />
        );
      case 'assessments':
        return (
          <AssessmentsView
            session={session}
            db={db}
            onCreateAssignment={platform.createAssignment}
            onSubmitAssignment={platform.submitAssignment}
            onGradeSubmission={platform.gradeSubmission}
            onCreateQuiz={platform.createQuiz}
            onSubmitQuizAttempt={platform.submitQuizAttempt}
          />
        );
      case 'directory':
        return (
          <DirectoryView
            session={session}
            db={db}
            onEnrollStudent={platform.enrollStudent}
            onAddTeacher={platform.addTeacher}
          />
        );
      case 'attendance':
        return (
          <AttendanceView
            session={session}
            db={db}
            onMarkAttendance={platform.markAttendance}
          />
        );
      case 'fees':
        return (
          <FeesView
            session={session}
            db={db}
            onCreateInvoice={platform.createFeeInvoice}
            onPayFee={platform.payFee}
          />
        );
      case 'schedule':
        return (
          <ScheduleView
            session={session}
            db={db}
            onAddTimetableSlot={platform.addTimetableSlot}
            onDeleteTimetableSlot={platform.deleteTimetableSlot}
            onPostAnnouncement={platform.postAnnouncement}
          />
        );
      case 'ai-assistant':
        return <AiAssistantView db={db} />;
      case 'settings':
        return (
          <WhiteLabelSettingsView
            db={db}
            onUpdateBranding={platform.updateBranding}
            onChangePasscode={platform.changeAdminPasscode}
            onImportConfig={platform.importConfig}
            onResetDemo={platform.resetDemoDatabase}
          />
        );
      default:
        return <DashboardView session={session} db={db} onNavigate={setCurrentView} />;
    }
  };

  return (
    <Layout
      session={platform.session}
      branding={platform.db.branding}
      currentView={currentView}
      setCurrentView={setCurrentView}
      isDark={isDark}
      onToggleTheme={handleToggleTheme}
      onLogout={platform.logout}
    >
      {renderView()}
    </Layout>
  );
};

export default App;
