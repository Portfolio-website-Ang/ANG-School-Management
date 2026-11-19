import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Users,
  CalendarCheck,
  CreditCard,
  CalendarDays,
  Sparkles,
  Palette,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react';
import { UserRole, type AuthSession, type SchoolBranding, type View } from '../types';
import SchoolCrest from './ui/SchoolCrest';

interface LayoutProps {
  session: AuthSession;
  branding: SchoolBranding;
  currentView: View;
  setCurrentView: (view: View) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

interface NavDef {
  view: View;
  label: string;
  section: 'Academic' | 'Operations' | 'Administration';
  icon: React.ReactNode;
  roles: UserRole[];
  moduleKey?: keyof SchoolBranding['enabledModules'];
}

const NAV_ITEMS: NavDef[] = [
  {
    view: 'dashboard',
    label: 'Overview',
    section: 'Academic',
    icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    roles: [UserRole.Admin, UserRole.Teacher, UserRole.Student, UserRole.Parent],
  },
  {
    view: 'courses',
    label: 'LMS Courses',
    section: 'Academic',
    icon: <BookOpen className="w-4 h-4 shrink-0" />,
    roles: [UserRole.Admin, UserRole.Teacher, UserRole.Student, UserRole.Parent],
    moduleKey: 'courses',
  },
  {
    view: 'assessments',
    label: 'Assignments & Quizzes',
    section: 'Academic',
    icon: <ClipboardCheck className="w-4 h-4 shrink-0" />,
    roles: [UserRole.Admin, UserRole.Teacher, UserRole.Student, UserRole.Parent],
    moduleKey: 'assessments',
  },
  {
    view: 'schedule',
    label: 'Timetable & Notices',
    section: 'Academic',
    icon: <CalendarDays className="w-4 h-4 shrink-0" />,
    roles: [UserRole.Admin, UserRole.Teacher, UserRole.Student, UserRole.Parent],
    moduleKey: 'schedule',
  },
  {
    view: 'attendance',
    label: 'Attendance',
    section: 'Operations',
    icon: <CalendarCheck className="w-4 h-4 shrink-0" />,
    roles: [UserRole.Admin, UserRole.Teacher, UserRole.Student, UserRole.Parent],
    moduleKey: 'attendance',
  },
  {
    view: 'fees',
    label: 'Fees & Receipts',
    section: 'Operations',
    icon: <CreditCard className="w-4 h-4 shrink-0" />,
    roles: [UserRole.Admin, UserRole.Teacher, UserRole.Parent],
    moduleKey: 'fees',
  },
  {
    view: 'directory',
    label: 'Students & Faculty',
    section: 'Operations',
    icon: <Users className="w-4 h-4 shrink-0" />,
    roles: [UserRole.Admin, UserRole.Teacher],
  },
  {
    view: 'ai-assistant',
    label: 'AI School Analyst',
    section: 'Administration',
    icon: <Sparkles className="w-4 h-4 shrink-0" />,
    roles: [UserRole.Admin, UserRole.Teacher],
    moduleKey: 'aiAssistant',
  },
  {
    view: 'settings',
    label: 'Branding & Security',
    section: 'Administration',
    icon: <Palette className="w-4 h-4 shrink-0" />,
    roles: [UserRole.Admin],
  },
];

const VIEW_TITLES: Record<View, string> = {
  dashboard: 'Academic & Operations Overview',
  courses: 'LMS Courses & Curriculum',
  assessments: 'Assignments & Auto-Graded Quizzes',
  directory: 'Students & Faculty Directory',
  attendance: 'Attendance Register',
  fees: 'Fees & Billing Ledger',
  schedule: 'Class Timetable & Notice Board',
  'ai-assistant': 'AI School Analyst',
  settings: 'White-Label Branding & Security',
};

const Layout: React.FC<LayoutProps> = ({
  session,
  branding,
  currentView,
  setCurrentView,
  isDark,
  onToggleTheme,
  onLogout,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopLogoFailed, setDesktopLogoFailed] = useState(false);

  const visibleNav = NAV_ITEMS.filter(item => {
    if (!item.roles.includes(session.role)) return false;
    if (item.moduleKey && !branding.enabledModules[item.moduleKey]) return false;
    return true;
  });

  const sections: Array<NavDef['section']> = ['Academic', 'Operations', 'Administration'];

  const renderSidebarBody = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <SchoolCrest
          logoDataUrl={branding.logoDataUrl}
          crestStyle={branding.crestStyle}
          schoolName={branding.schoolName}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {branding.schoolName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
            {branding.academicYear}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map(section => {
          const items = visibleNav.filter(i => i.section === section);
          if (items.length === 0) return null;
          return (
            <div key={section}>
              <p className="px-3 mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                {section}
              </p>
              <div className="space-y-1">
                {items.map(item => {
                  const active = currentView === item.view;
                  return (
                    <button
                      key={item.view}
                      type="button"
                      onClick={() => {
                        setCurrentView(item.view);
                        setMobileOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'brand-bg text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Account & Platform Brand Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        {!desktopLogoFailed && (
          <div className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 flex items-center justify-center">
            <img
              src="/assets/branding/ang-desktop-logo.png"
              alt="School Management by ANG"
              referrerPolicy="no-referrer"
              onError={() => setDesktopLogoFailed(true)}
              className="h-8 w-auto object-contain"
            />
          </div>
        )}
        <div className="px-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {session.actorName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {session.role}
            {session.assignedClass ? ` · Class ${session.assignedClass}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0">{renderSidebarBody()}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[82vw] h-full z-10">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarBody()}
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate">{branding.schoolName}</span>
                <span aria-hidden="true">/</span>
                <span className="truncate">{VIEW_TITLES[currentView]}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {VIEW_TITLES[currentView]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
              {branding.affiliationCode}
            </span>
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
            </button>
            {session.role === UserRole.Admin && currentView !== 'settings' && (
              <button
                type="button"
                onClick={() => setCurrentView('settings')}
                className="px-3.5 py-2 text-xs font-semibold text-white brand-bg rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Customize School
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;