import React from 'react';
import { ArrowUpRight, BookOpen, CalendarCheck, ClipboardCheck, CreditCard, Megaphone, Palette } from 'lucide-react';
import {
  AttendanceStatus,
  FeeStatus,
  UserRole,
  type AuthSession,
  type SchoolDatabase,
  type View,
} from '../types';
import Card from './ui/Card';

interface DashboardViewProps {
  session: AuthSession;
  db: SchoolDatabase;
  onNavigate: (view: View) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ session, db, onNavigate }) => {
  const { students, attendance, fees, courses, assignments, submissions, quizzes, quizAttempts, announcements, branding } = db;
  const today = new Date().toISOString().split('T')[0];

  // Compute 5-day attendance trend from live records
  const uniqueDates: string[] = Array.from(new Set<string>(attendance.map(a => a.date))).sort().slice(-5);
  const attendanceTrend = uniqueDates.map((date: string) => {
    const records = attendance.filter(a => a.date === date && a.status !== AttendanceStatus.Unmarked);
    const present = records.filter(a => a.status === AttendanceStatus.Present || a.status === AttendanceStatus.Late).length;
    const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
    return { date: date.slice(5), rate, count: records.length };
  });

  // Financial numbers
  const feesPaid = fees.filter(f => f.status === FeeStatus.Paid).reduce((sum, f) => sum + f.amount, 0);
  const feesPending = fees.filter(f => f.status !== FeeStatus.Paid).reduce((sum, f) => sum + f.amount, 0);
  const totalFeeVolume = feesPaid + feesPending;
  const collectionPct = totalFeeVolume > 0 ? Math.round((feesPaid / totalFeeVolume) * 100) : 100;

  // Today attendance
  const todayRecords = attendance.filter(a => a.date === today && a.status !== AttendanceStatus.Unmarked);
  const todayPresent = todayRecords.filter(a => a.status === AttendanceStatus.Present || a.status === AttendanceStatus.Late).length;
  const todayPct = todayRecords.length > 0 ? Math.round((todayPresent / todayRecords.length) * 100) : 0;

  // Student / Parent specific stats
  const targetStudent = students.find(s => s.id === session.studentId) || students[0];
  const studentLessonsTotal = courses
    .filter(c => !targetStudent || c.className === targetStudent.class || session.role === UserRole.Admin)
    .reduce((acc, c) => acc + c.lessons.length, 0);
  const studentLessonsDone = targetStudent
    ? courses.reduce(
        (acc, c) => acc + c.lessons.filter(l => l.completedByStudentIds.includes(targetStudent.id)).length,
        0
      )
    : 0;
  const studentAvgQuiz =
    quizAttempts.length > 0
      ? Math.round(
          (quizAttempts.reduce((sum, q) => sum + (q.maxScore > 0 ? q.score / q.maxScore : 0), 0) /
            quizAttempts.length) *
            100
        )
      : 0;

  // KPI strip by role
  const kpis = (() => {
    if (session.role === UserRole.Admin) {
      return [
        { label: 'Total Enrollment', value: String(students.length), note: `${db.teachers.length} faculty members` },
        { label: "Today's Attendance", value: `${todayPct}%`, note: `${todayPresent} of ${todayRecords.length || students.length} checked in` },
        { label: 'Fees Collected', value: `${branding.currencySymbol}${feesPaid.toLocaleString()}`, note: `${collectionPct}% of billed volume` },
        { label: 'LMS Curriculum', value: `${courses.length} Courses`, note: `${courses.reduce((s, c) => s + c.lessons.length, 0)} interactive lessons` },
      ];
    }
    if (session.role === UserRole.Teacher) {
      const assigned = session.assignedClass || '5A';
      const classStudents = students.filter(s => s.class === assigned);
      const pendingGrading = submissions.filter(s => s.status === 'Submitted').length;
      return [
        { label: `Class ${assigned} Roster`, value: String(classStudents.length), note: 'Assigned homeroom' },
        { label: 'Active Courses', value: String(courses.length), note: `${assignments.length} assignments posted` },
        { label: 'Pending Grading', value: String(pendingGrading), note: 'Awaiting rubric review' },
        { label: "Today's Attendance", value: `${todayPct}%`, note: `${todayPresent} present across campus` },
      ];
    }
    if (session.role === UserRole.Student) {
      return [
        { label: 'Enrolled Class', value: targetStudent?.class || '5A', note: targetStudent?.rollNo || '' },
        { label: 'Lessons Completed', value: `${studentLessonsDone}/${studentLessonsTotal || 1}`, note: 'Curriculum progress' },
        { label: 'Quiz Average', value: `${studentAvgQuiz}%`, note: `${quizAttempts.length} quizzes completed` },
        { label: 'Attendance Rate', value: `${todayPct}%`, note: 'Current term standing' },
      ];
    }
    return [
      { label: 'Ward Profile', value: targetStudent?.name || 'Student', note: `Class ${targetStudent?.class || '5A'}` },
      { label: 'Attendance Standing', value: `${todayPct}%`, note: `${todayRecords.length} recorded days` },
      { label: 'Outstanding Fees', value: `${branding.currencySymbol}${feesPending.toLocaleString()}`, note: feesPending > 0 ? 'Payment due' : 'All invoices settled' },
      { label: 'Quiz Average', value: `${studentAvgQuiz}%`, note: `${quizAttempts.length} graded assessments` },
    ];
  })();

  const visibleAnnouncements = announcements.filter(
    a => a.audience === 'All' || a.audience === `${session.role}s` || session.role === UserRole.Admin
  );

  return (
    <div className="space-y-6">
      {/* Executive Welcome Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {branding.schoolName} · Academic Term {branding.academicYear}
          </p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Welcome back, {session.actorName}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {branding.enabledModules.courses && (
            <button
              type="button"
              onClick={() => onNavigate('courses')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open LMS</span>
            </button>
          )}
          {(session.role === UserRole.Admin || session.role === UserRole.Teacher) && branding.enabledModules.attendance && (
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-white brand-bg transition-colors cursor-pointer whitespace-nowrap"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Mark Attendance</span>
            </button>
          )}
          {session.role === UserRole.Admin && (
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>White-Label Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 font-mono tabular-nums truncate">
              {kpi.value}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{kpi.note}</p>
          </div>
        ))}
      </div>

      {/* Analytics + Quick Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Attendance Trend (Last 5 Sessions)"
          subtitle="Percentage of students marked Present or Late"
          className="lg:col-span-2"
          action={
            branding.enabledModules.attendance ? (
              <button
                type="button"
                onClick={() => onNavigate('attendance')}
                className="inline-flex items-center gap-1 text-xs font-semibold brand-text hover:underline cursor-pointer whitespace-nowrap"
              >
                <span>Open Register</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            ) : null
          }
        >
          {attendanceTrend.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No attendance sessions recorded yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3 items-end h-44 pt-4">
                {attendanceTrend.map(point => (
                  <div key={point.date} className="flex flex-col items-center h-full justify-end gap-2">
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {point.rate}%
                    </span>
                    <div className="w-full max-w-[44px] bg-slate-100 dark:bg-slate-800 rounded-md h-28 flex items-end overflow-hidden">
                      <div
                        className="w-full brand-bg rounded-md transition-all duration-300"
                        style={{ height: `${Math.max(8, point.rate)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {point.date}
                    </span>
                  </div>
                ))}
              </div>
              {session.role !== UserRole.Student && branding.enabledModules.fees && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Fee Collection Progress
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">
                      {branding.currencySymbol}
                      {feesPaid.toLocaleString()} collected · {branding.currencySymbol}
                      {feesPending.toLocaleString()} outstanding
                    </p>
                  </div>
                  <div className="w-full sm:w-56">
                    <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full brand-bg rounded-full" style={{ width: `${collectionPct}%` }} />
                    </div>
                    <p className="text-right text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                      {collectionPct}% settled
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Announcements */}
        <Card
          title="Campus Notice Board"
          subtitle="Latest academic and administrative circulars"
          action={
            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="inline-flex items-center gap-1 text-xs font-semibold brand-text hover:underline cursor-pointer whitespace-nowrap"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleAnnouncements.slice(0, 3).map(item => (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                    <Megaphone className="w-3.5 h-3.5" />
                    {item.audience}
                  </span>
                  <span className="font-mono">{item.createdAt}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {item.priority === 'Urgent' ? 'Important: ' : ''}
                  {item.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Upcoming LMS Work & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Active LMS Assignments & Quizzes"
          subtitle="Upcoming curriculum deliverables"
          action={
            branding.enabledModules.assessments ? (
              <button
                type="button"
                onClick={() => onNavigate('assessments')}
                className="inline-flex items-center gap-1 text-xs font-semibold brand-text hover:underline cursor-pointer whitespace-nowrap"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Assessments</span>
              </button>
            ) : null
          }
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {assignments.slice(0, 3).map(a => (
              <div key={a.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {a.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Class {a.className} · {a.createdBy} · {a.maxMarks} marks
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-300 shrink-0">
                  Due {a.dueDate}
                </span>
              </div>
            ))}
            {quizzes.slice(0, 2).map(q => (
              <div key={q.id} className="py-3 last:pb-0 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    Quiz: {q.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Class {q.className} · {q.questions.length} questions · {q.durationMinutes} min
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-300 shrink-0">
                  Due {q.dueDate}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {session.role === UserRole.Admin ? (
          <Card
            title="Security & Operations Audit Log"
            subtitle="Verified system activity recorded on the server"
            action={
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="text-xs font-semibold brand-text hover:underline cursor-pointer whitespace-nowrap"
              >
                Security Settings
              </button>
            }
          >
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {db.auditLog.slice(0, 5).map(entry => (
                <div key={entry.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {entry.action.replace(/_/g, ' ')} — {entry.target}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {entry.actorName} · {entry.actorRole}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card
            title="Fee Ledger Summary"
            subtitle="Recent billing invoices"
            action={
              session.role !== UserRole.Student && branding.enabledModules.fees ? (
                <button
                  type="button"
                  onClick={() => onNavigate('fees')}
                  className="inline-flex items-center gap-1 text-xs font-semibold brand-text hover:underline cursor-pointer whitespace-nowrap"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Open Billing</span>
                </button>
              ) : null
            }
          >
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {fees.slice(0, 4).map(fee => (
                <div key={fee.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {fee.description}
                    </p>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {fee.invoiceNo} · Due {fee.dueDate}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {branding.currencySymbol}
                      {fee.amount.toFixed(2)}
                    </p>
                    <p
                      className={`text-xs font-semibold ${
                        fee.status === FeeStatus.Paid
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : fee.status === FeeStatus.Overdue
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {fee.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardView;