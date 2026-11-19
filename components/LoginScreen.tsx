import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Moon, Sun, ArrowRight, ShieldCheck, GraduationCap, Users, BookOpen } from 'lucide-react';
import { UserRole, type PublicPortalBootstrap } from '../types';
import { MEDIA_ASSETS } from '../utils/mediaAssets';
import SchoolCrest from './ui/SchoolCrest';

interface LoginScreenProps {
  bootstrap: PublicPortalBootstrap;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogin: (params: { role: UserRole; passcode?: string; actorId?: string }) => Promise<void>;
}

const ROLE_META: Record<UserRole, { label: string; subtitle: string; icon: React.ReactNode }> = {
  [UserRole.Admin]: {
    label: 'Admin',
    subtitle: 'Executive controls, white-label branding, billing & security',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  [UserRole.Teacher]: {
    label: 'Teacher',
    subtitle: 'Course authoring, grading, quizzes & daily attendance',
    icon: <BookOpen className="w-4 h-4" />,
  },
  [UserRole.Student]: {
    label: 'Student',
    subtitle: 'Interactive lessons, assignments, timed quizzes & timetable',
    icon: <GraduationCap className="w-4 h-4" />,
  },
  [UserRole.Parent]: {
    label: 'Parent',
    subtitle: 'Ward attendance, academic progress, notices & fee receipts',
    icon: <Users className="w-4 h-4" />,
  },
};

const LoginScreen: React.FC<LoginScreenProps> = ({
  bootstrap,
  isDark,
  onToggleTheme,
  onLogin,
}) => {
  const { branding, teachers, students } = bootstrap;
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.Admin);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [desktopLogoFailed, setDesktopLogoFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const actorId =
        selectedRole === UserRole.Teacher
          ? selectedTeacherId
          : selectedRole === UserRole.Student || selectedRole === UserRole.Parent
          ? selectedStudentId
          : undefined;

      await onLogin({
        role: selectedRole,
        passcode: selectedRole === UserRole.Admin ? passcode : undefined,
        actorId,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row lg:items-stretch">
      {/* Left Architectural Showcase Panel */}
      <div className="relative lg:w-[56%] min-h-[320px] lg:min-h-screen bg-slate-900 overflow-hidden flex flex-col justify-between p-8 lg:p-12">
        {!heroImgFailed && (
          <img
            src={MEDIA_ASSETS.campus}
            alt={`${branding.schoolName} campus`}
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-slate-950/40"
          aria-hidden="true"
        />

        {/* Top Institution Lockup */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <SchoolCrest
              logoDataUrl={branding.logoDataUrl}
              crestStyle={branding.crestStyle}
              schoolName={branding.schoolName}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-white truncate">{branding.schoolName}</p>
              <p className="text-xs text-slate-300 font-mono">
                {branding.affiliationCode} · {branding.academicYear}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Editorial Statement & Proof Strip */}
        <div className="relative z-10 max-w-2xl mt-12">
          <p className="text-xs font-medium text-slate-300 tracking-wide mb-3">
            Unified School Management &amp; Learning Platform
          </p>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            {branding.tagline}
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-200/90 leading-relaxed max-w-xl">
            Manage curriculum delivery, live assessments, attendance, fee invoicing, and executive
            analytics from a single white-label academic operating system.
          </p>

          <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-3 gap-6">
            <div>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">
                {students.length}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">Active Students</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">
                {teachers.length}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">Faculty Members</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">4 Roles</p>
              <p className="text-xs text-slate-300 mt-0.5">RBAC Portals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-white dark:bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          {!desktopLogoFailed ? (
            <div className="bg-white rounded-lg px-2.5 py-1 border border-slate-200 inline-flex items-center">
              <img
                src="/assets/branding/ang-desktop-logo.png"
                alt="School Management by ANG"
                referrerPolicy="no-referrer"
                onError={() => setDesktopLogoFailed(true)}
                className="h-9 w-auto object-contain"
              />
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Campus Portal Sign-In
            </span>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors whitespace-nowrap shrink-0"
            aria-label="Toggle color theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        <div className="w-full max-w-md mx-auto my-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Sign in to {branding.schoolName}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Select your institutional role to access your workspace.
          </p>

          {/* Segmented Role Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 mt-6 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {[UserRole.Admin, UserRole.Teacher, UserRole.Student, UserRole.Parent].map(role => {
              const active = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role);
                    setErrorMsg(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {ROLE_META[role].icon}
                  <span>{ROLE_META[role].label}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {ROLE_META[selectedRole].subtitle}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {selectedRole === UserRole.Admin && (
              <div>
                <label
                  htmlFor="admin-passcode"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Administrator Passcode
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-passcode"
                    type={showPasscode ? 'text' : 'password'}
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                    placeholder="Enter passcode (default: 1234)"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Protected with scrypt verification &amp; brute-force rate limiting. Default passcode:{' '}
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">1234</span>
                </p>
              </div>
            )}

            {selectedRole === UserRole.Teacher && (
              <div>
                <label
                  htmlFor="teacher-select"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Faculty Profile
                </label>
                <select
                  id="teacher-select"
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.subjectSpecialty} (Classes {t.assignedClasses.join(', ')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedRole === UserRole.Student && (
              <div>
                <label
                  htmlFor="student-select"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Student Account
                </label>
                <select
                  id="student-select"
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} · Class {s.class} ({s.rollNo})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedRole === UserRole.Parent && (
              <div>
                <label
                  htmlFor="parent-select"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Parent / Guardian Account
                </label>
                <select
                  id="parent-select"
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.guardianName} (Parent of {s.name} · Class {s.class})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs font-medium text-red-700 dark:text-red-300"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg text-sm font-semibold text-white brand-bg transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <span>{submitting ? 'Verifying session...' : `Continue as ${selectedRole}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <footer className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-900">
          <span>{branding.address}</span>
          <span>{branding.contactEmail}</span>
        </footer>
      </div>
    </div>
  );
};

export default LoginScreen;