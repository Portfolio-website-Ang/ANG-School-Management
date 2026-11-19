import React, { useState } from 'react';
import { Check, Clock, X, ShieldAlert, Search, CheckCheck, FileText } from 'lucide-react';
import { AttendanceStatus, UserRole, type AuthSession, type SchoolDatabase } from '../types';
import Card from './ui/Card';
import ReportModal from './ui/ReportModal';

interface AttendanceViewProps {
  session: AuthSession;
  db: SchoolDatabase;
  onMarkAttendance: (entries: Array<{ studentId: string; date: string; status: AttendanceStatus }>) => Promise<void>;
}

const AttendanceView: React.FC<AttendanceViewProps> = ({ session, db, onMarkAttendance }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [classFilter, setClassFilter] = useState(
    session.role === UserRole.Teacher ? session.assignedClass || '5A' : 'All'
  );
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const canMark = session.role === UserRole.Admin || session.role === UserRole.Teacher;
  const classes = ['All', ...Array.from(new Set(db.students.map(s => s.class))).sort()];

  const visibleStudents = db.students.filter(s => {
    if (classFilter !== 'All' && s.class !== classFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusForDate = (studentId: string, date: string): AttendanceStatus => {
    const rec = db.attendance.find(r => r.studentId === studentId && r.date === date);
    return rec?.status || AttendanceStatus.Unmarked;
  };

  const counts = visibleStudents.reduce(
    (acc, s) => {
      const st = getStatusForDate(s.id, selectedDate);
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    {} as Record<AttendanceStatus, number>
  );

  const handleMarkSingle = async (studentId: string, status: AttendanceStatus) => {
    setSaving(true);
    try {
      await onMarkAttendance([{ studentId, date: selectedDate, status }]);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = async () => {
    if (visibleStudents.length === 0) return;
    setSaving(true);
    try {
      await onMarkAttendance(
        visibleStudents.map(s => ({
          studentId: s.id,
          date: selectedDate,
          status: AttendanceStatus.Present,
        }))
      );
    } finally {
      setSaving(false);
    }
  };

  const renderStatusText = (status: AttendanceStatus) => {
    if (status === AttendanceStatus.Present) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Check className="w-3.5 h-3.5" />
          Present
        </span>
      );
    }
    if (status === AttendanceStatus.Absent) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
          <X className="w-3.5 h-3.5" />
          Absent
        </span>
      );
    }
    if (status === AttendanceStatus.Late) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Clock className="w-3.5 h-3.5" />
          Late
        </span>
      );
    }
    if (status === AttendanceStatus.Excused) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
          <ShieldAlert className="w-3.5 h-3.5" />
          Excused
        </span>
      );
    }
    return <span className="text-xs font-medium text-slate-400">Unmarked</span>;
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          />
          {canMark && (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search student or roll no..."
                  className="pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                />
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                {classes.map(cls => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setClassFilter(cls)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
                      classFilter === cls
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cls === 'All' ? 'All' : cls}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>Attendance PDF</span>
          </button>

          {canMark && (
            <button
              type="button"
              disabled={saving || visibleStudents.length === 0}
              onClick={handleMarkAllPresent}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark Visible Present</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Present', count: counts[AttendanceStatus.Present] || 0 },
          { label: 'Absent', count: counts[AttendanceStatus.Absent] || 0 },
          { label: 'Late', count: counts[AttendanceStatus.Late] || 0 },
          { label: 'Unmarked', count: counts[AttendanceStatus.Unmarked] || 0 },
        ].map(m => (
          <div
            key={m.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{m.label}</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {m.count}
            </p>
          </div>
        ))}
      </div>

      {/* Register Table */}
      <Card title={`Attendance Register · ${selectedDate}`} subtitle={`${visibleStudents.length} student(s) shown`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th className="text-left py-3 px-3 font-semibold">Roll No</th>
                <th className="text-left py-3 px-3 font-semibold">Student</th>
                <th className="text-left py-3 px-3 font-semibold">Class</th>
                <th className="text-left py-3 px-3 font-semibold">Status</th>
                {canMark && <th className="text-right py-3 px-3 font-semibold">Mark Attendance</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleStudents.map(student => {
                const status = getStatusForDate(student.id, selectedDate);
                return (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {student.rollNo}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {student.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{student.class}</td>
                    <td className="py-3 px-3">{renderStatusText(status)}</td>
                    {canMark && (
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {[
                            AttendanceStatus.Present,
                            AttendanceStatus.Absent,
                            AttendanceStatus.Late,
                            AttendanceStatus.Excused,
                          ].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              disabled={saving || status === opt}
                              onClick={() => handleMarkSingle(student.id, opt)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                                status === opt
                                  ? 'brand-bg text-white border-transparent'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Historical Log for Students & Parents */}
      {(session.role === UserRole.Student || session.role === UserRole.Parent) && (
        <Card title="Recent Attendance History" subtitle="Chronological session log">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {db.attendance
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 12)
              .map(rec => (
                <div key={`${rec.studentId}-${rec.date}`} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">
                      {rec.date}
                    </p>
                    {rec.markedBy && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Verified by {rec.markedBy}
                      </p>
                    )}
                  </div>
                  {renderStatusText(rec.status)}
                </div>
              ))}
          </div>
        </Card>
      )}

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        session={session}
        db={db}
        initialKind="attendance"
        initialClassName={canMark ? classFilter : 'All'}
      />
    </div>
  );
};

export default AttendanceView;