import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, FileText } from 'lucide-react';
import { FeeStatus, UserRole, type AuthSession, type SchoolDatabase } from '../../types';
import {
  buildAttendanceReport,
  buildFeeHistoryReport,
  triggerPdfPrint,
  type ReportKind,
} from '../../utils/reportGenerator';
import SchoolCrest from './SchoolCrest';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AuthSession;
  db: SchoolDatabase;
  initialKind: ReportKind;
  initialStudentId?: string;
  initialClassName?: string;
}

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  session,
  db,
  initialKind,
  initialStudentId = 'All',
  initialClassName = 'All',
}) => {
  const [kind, setKind] = useState<ReportKind>(initialKind);
  const [studentId, setStudentId] = useState<string>(initialStudentId);
  const [className, setClassName] = useState<string>(initialClassName);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [feeStatus, setFeeStatus] = useState<'All' | FeeStatus>('All');
  const [monoLogoFailed, setMonoLogoFailed] = useState(false);

  const isMultiStudentRole = session.role === UserRole.Admin || session.role === UserRole.Teacher;
  const classes = useMemo(
    () => ['All', ...Array.from(new Set(db.students.map(s => s.class))).sort()],
    [db.students]
  );

  // Sync defaults whenever modal opens with new props
  useEffect(() => {
    if (!isOpen) return;
    setKind(initialKind);
    setStudentId(initialStudentId);
    setClassName(initialClassName);
  }, [isOpen, initialKind, initialStudentId, initialClassName]);

  // Isolate printable DOM sheet on document.body while modal is open
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('printing-report');
    return () => {
      document.body.classList.remove('printing-report');
    };
  }, [isOpen]);

  const attendanceReport = useMemo(() => {
    if (kind !== 'attendance') return null;
    return buildAttendanceReport(db, {
      studentId: isMultiStudentRole ? studentId : db.students[0]?.id,
      className: isMultiStudentRole ? className : 'All',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [kind, db, isMultiStudentRole, studentId, className, startDate, endDate]);

  const feeReport = useMemo(() => {
    if (kind !== 'fees') return null;
    return buildFeeHistoryReport(db, {
      studentId: isMultiStudentRole ? studentId : db.students[0]?.id,
      className: isMultiStudentRole ? className : 'All',
      statusFilter: feeStatus,
    });
  }, [kind, db, isMultiStudentRole, studentId, className, feeStatus]);

  if (!isOpen) return null;

  const { branding } = db;
  const sym = branding.currencySymbol;
  const activeReportId =
    kind === 'attendance' ? attendanceReport?.reportId : feeReport?.reportId;
  const generatedAt =
    kind === 'attendance' ? attendanceReport?.generatedAt : feeReport?.generatedAt;

  return createPortal(
    <div
      className="report-print-portal fixed inset-0 z-50 bg-slate-950/70 overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Printable PDF Report Preview"
    >
      {/* Interactive Screen-Only Control Bar */}
      <div className="no-print max-w-4xl mx-auto mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setKind('attendance')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
                kind === 'attendance'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Attendance Report
            </button>
            <button
              type="button"
              onClick={() => setKind('fees')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
                kind === 'fees'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Fee Payment History
            </button>
          </div>

          {isMultiStudentRole && (
            <>
              <select
                aria-label="Filter by Class"
                value={className}
                onChange={e => {
                  setClassName(e.target.value);
                  setStudentId('All');
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              >
                {classes.map(c => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Classes' : `Class ${c}`}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by Student"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 max-w-[200px]"
              >
                <option value="All">All Students</option>
                {db.students
                  .filter(s => className === 'All' || s.class === className)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNo})
                    </option>
                  ))}
              </select>
            </>
          )}

          {kind === 'attendance' ? (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label="Start date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-2 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">–</span>
              <input
                type="date"
                aria-label="End date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-2 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              />
            </div>
          ) : (
            <select
              aria-label="Filter by Fee Status"
              value={feeStatus}
              onChange={e => setFeeStatus(e.target.value as 'All' | FeeStatus)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Statuses</option>
              <option value={FeeStatus.Paid}>Paid Only</option>
              <option value={FeeStatus.Due}>Due Only</option>
              <option value={FeeStatus.Overdue}>Overdue Only</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={triggerPdfPrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Printable A4 White-Paper Sheet (forced high-contrast light surface for print fidelity) */}
      <article className="print-sheet max-w-4xl mx-auto bg-white text-slate-900 border border-slate-200 rounded-xl p-8 sm:p-10 shadow-xl space-y-6">
        {/* Official School Letterhead */}
        <header className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b-2 border-slate-900">
          <div className="flex items-center gap-4">
            <SchoolCrest
              logoDataUrl={branding.logoDataUrl}
              crestStyle={branding.crestStyle}
              schoolName={branding.schoolName}
              size="lg"
            />
            <div>
              <h1 className="text-xl font-bold text-slate-900">{branding.schoolName}</h1>
              <p className="text-xs text-slate-600 mt-0.5">{branding.address}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {branding.affiliationCode} · {branding.contactEmail} · {branding.contactPhone}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <FileText className="w-4 h-4" />
              <span>
                {kind === 'attendance'
                  ? 'Official Attendance Report'
                  : 'Official Fee Payment History'}
              </span>
            </p>
            <p className="text-xs font-mono text-slate-600 mt-1">Ref: {activeReportId}</p>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Academic Year: {branding.academicYear}
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
              Generated: {generatedAt}
            </p>
          </div>
        </header>

        {/* ATTENDANCE REPORT BODY */}
        {kind === 'attendance' && attendanceReport && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
              <span>
                <strong>Scope:</strong> {attendanceReport.scopeLabel}
              </span>
              <span>
                <strong>Period:</strong> {attendanceReport.dateRangeLabel}
              </span>
            </div>

            {/* Summary KPIs */}
            <div className="print-avoid-break grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-slate-200 rounded-lg p-3.5">
                <p className="text-[11px] font-medium text-slate-500">Students Included</p>
                <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {attendanceReport.totals.studentsCount}
                </p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3.5">
                <p className="text-[11px] font-medium text-slate-500">Attendance Rate</p>
                <p className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                  {attendanceReport.totals.overallRatePct}%
                </p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3.5">
                <p className="text-[11px] font-medium text-slate-500">Present / Late</p>
                <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {attendanceReport.totals.presentCount} / {attendanceReport.totals.lateCount}
                </p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3.5">
                <p className="text-[11px] font-medium text-slate-500">Absent / Excused</p>
                <p className="text-xl font-bold font-mono tabular-nums text-red-700 mt-1">
                  {attendanceReport.totals.absentCount} / {attendanceReport.totals.excusedCount}
                </p>
              </div>
            </div>

            {/* Per-Student Attendance Summary */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-2">
                Student Attendance Summary
              </h2>
              <table className="w-full text-xs border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Roll No</th>
                    <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Student Name</th>
                    <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Class</th>
                    <th className="border border-slate-200 text-right py-2 px-2.5 font-semibold">Present</th>
                    <th className="border border-slate-200 text-right py-2 px-2.5 font-semibold">Absent</th>
                    <th className="border border-slate-200 text-right py-2 px-2.5 font-semibold">Late</th>
                    <th className="border border-slate-200 text-right py-2 px-2.5 font-semibold">Excused</th>
                    <th className="border border-slate-200 text-right py-2 px-2.5 font-semibold">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceReport.studentSummaries.map(row => (
                    <tr key={row.studentId} className="even:bg-slate-50/60">
                      <td className="border border-slate-200 py-1.5 px-2.5 font-mono">{row.rollNo}</td>
                      <td className="border border-slate-200 py-1.5 px-2.5 font-medium">{row.name}</td>
                      <td className="border border-slate-200 py-1.5 px-2.5">{row.className}</td>
                      <td className="border border-slate-200 py-1.5 px-2.5 text-right font-mono tabular-nums">{row.present}</td>
                      <td className="border border-slate-200 py-1.5 px-2.5 text-right font-mono tabular-nums">{row.absent}</td>
                      <td className="border border-slate-200 py-1.5 px-2.5 text-right font-mono tabular-nums">{row.late}</td>
                      <td className="border border-slate-200 py-1.5 px-2.5 text-right font-mono tabular-nums">{row.excused}</td>
                      <td className="border border-slate-200 py-1.5 px-2.5 text-right font-mono font-semibold tabular-nums">
                        {row.ratePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Chronological Attendance Log */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-2">
                Chronological Session Register ({attendanceReport.logs.length} records)
              </h2>
              {attendanceReport.logs.length === 0 ? (
                <p className="text-xs text-slate-500 border border-slate-200 rounded-lg p-4 text-center">
                  No attendance entries found for the selected filter criteria.
                </p>
              ) : (
                <table className="w-full text-xs border-collapse border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Date</th>
                      <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Roll No</th>
                      <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Student</th>
                      <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Class</th>
                      <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Status</th>
                      <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Verified By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceReport.logs.map((log, idx) => (
                      <tr key={`${log.studentId}-${log.date}-${idx}`} className="even:bg-slate-50/60">
                        <td className="border border-slate-200 py-1.5 px-2.5 font-mono">{log.date}</td>
                        <td className="border border-slate-200 py-1.5 px-2.5 font-mono">{log.rollNo}</td>
                        <td className="border border-slate-200 py-1.5 px-2.5 font-medium">{log.studentName}</td>
                        <td className="border border-slate-200 py-1.5 px-2.5">{log.className}</td>
                        <td className="border border-slate-200 py-1.5 px-2.5 font-semibold">
                          {log.status}
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2.5 text-slate-600">{log.markedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* FEE PAYMENT HISTORY REPORT BODY */}
        {kind === 'fees' && feeReport && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
              <span>
                <strong>Scope:</strong> {feeReport.scopeLabel}
              </span>
              <span>
                <strong>Filter:</strong> {feeReport.statusLabel}
              </span>
            </div>

            {/* Financial KPI Strip */}
            <div className="print-avoid-break grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-slate-200 rounded-lg p-3.5">
                <p className="text-[11px] font-medium text-slate-500">Total Billed</p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {sym}
                  {feeReport.totals.totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3.5">
                <p className="text-[11px] font-medium text-slate-500">Total Paid</p>
                <p className="text-lg font-bold font-mono tabular-nums text-emerald-700 mt-1">
                  {sym}
                  {feeReport.totals.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3.5">
                <p className="text-[11px] font-medium text-slate-500">Due / Overdue</p>
                <p className="text-lg font-bold font-mono tabular-nums text-red-700 mt-1">
                  {sym}
                  {(feeReport.totals.totalDue + feeReport.totals.totalOverdue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3.5">
                <p className="text-[11px] font-medium text-slate-500">Settlement Rate</p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {feeReport.totals.collectionRatePct}%
                </p>
              </div>
            </div>

            {/* Per-Student Billing Summary */}
            {feeReport.studentSummaries.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-2">
                  Account Balance Summary
                </h2>
                <table className="w-full text-xs border-collapse border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Roll No</th>
                      <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Student</th>
                      <th className="border border-slate-200 text-left py-2 px-2.5 font-semibold">Guardian</th>
                      <th className="border border-slate-200 text-right py-2 px-2.5 font-semibold">Invoices</th>
                      <th className="border border-slate-200 text-right py-2 px-2.5 font-semibold">Billed</th>
                      <th className="border border-slate-200 text-right py-2 px-2.5 font-semibold">Paid</th>
                      <th className="border border-slate-200 text-right py-2 px-2.5 font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeReport.studentSummaries.map(row => (
                      <tr key={row.studentId} className="even:bg-slate-50/60">
                        <td className="border border-slate-200 py-1.5 px-2.5 font-mono">{row.rollNo}</td>
                        <td className="border border-slate-200 py-1.5 px-2.5 font-medium">
                          {row.name} ({row.className})
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2.5">{row.guardianName}</td>
                        <td className="border border-slate-200 py-1.5 px-2.5 text-right font-mono tabular-nums">
                          {row.invoiceCount}
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2.5 text-right font-mono tabular-nums">
                          {sym}
                          {row.billed.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2.5 text-right font-mono tabular-nums text-emerald-700">
                          {sym}
                          {row.paid.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2.5 text-right font-mono font-semibold tabular-nums">
                          {sym}
                          {row.outstanding.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Itemized Fee & Payment Ledger */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-2">
                Itemized Fee &amp; Payment History ({feeReport.records.length} transactions)
              </h2>
              {feeReport.records.length === 0 ? (
                <p className="text-xs text-slate-500 border border-slate-200 rounded-lg p-4 text-center">
                  No fee transactions match the selected filters.
                </p>
              ) : (
                <table className="w-full text-xs border-collapse border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="border border-slate-200 text-left py-2 px-2 font-semibold">Invoice No</th>
                      <th className="border border-slate-200 text-left py-2 px-2 font-semibold">Student</th>
                      <th className="border border-slate-200 text-left py-2 px-2 font-semibold">Description</th>
                      <th className="border border-slate-200 text-left py-2 px-2 font-semibold">Due Date</th>
                      <th className="border border-slate-200 text-left py-2 px-2 font-semibold">Status</th>
                      <th className="border border-slate-200 text-left py-2 px-2 font-semibold">Paid Date / Ref</th>
                      <th className="border border-slate-200 text-right py-2 px-2 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeReport.records.map(rec => (
                      <tr key={rec.id} className="even:bg-slate-50/60">
                        <td className="border border-slate-200 py-1.5 px-2 font-mono">{rec.invoiceNo}</td>
                        <td className="border border-slate-200 py-1.5 px-2 font-medium">
                          {rec.studentName} ({rec.className})
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2">
                          {rec.description} · {rec.category}
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2 font-mono">{rec.dueDate}</td>
                        <td className="border border-slate-200 py-1.5 px-2 font-semibold">{rec.status}</td>
                        <td className="border border-slate-200 py-1.5 px-2 font-mono">
                          {rec.paidAt !== '—' ? `${rec.paidAt} · ${rec.paymentRef}` : 'Unpaid'}
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2 text-right font-mono font-semibold tabular-nums">
                          {sym}
                          {rec.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Official Registrar / Accounts Signature Footer */}
        <footer className="print-avoid-break pt-6 mt-6 border-t border-slate-200 grid grid-cols-3 items-end gap-6 text-xs text-slate-600">
          <div>
            <div className="h-10 border-b border-slate-400 w-44 mb-1.5" />
            <p className="font-semibold text-slate-800">
              {kind === 'attendance' ? 'Academic Registrar' : 'Accounts & Bursar Officer'}
            </p>
            <p className="text-[11px] text-slate-500">{branding.schoolName}</p>
          </div>
          <div className="flex flex-col items-center justify-end pb-1">
            {!monoLogoFailed && (
              <img
                src="/assets/branding/ang-print-mono-logo.png"
                alt="School LMS Monochrome Print Mark"
                referrerPolicy="no-referrer"
                onError={() => setMonoLogoFailed(true)}
                className="h-9 w-auto object-contain"
              />
            )}
          </div>
          <div className="text-right">
            <div className="h-10 border-b border-slate-400 w-44 ml-auto mb-1.5" />
            <p className="font-semibold text-slate-800">Principal / Authorized Stamp</p>
            <p className="text-[11px] text-slate-500 font-mono">
              Issued via {branding.affiliationCode}
            </p>
          </div>
        </footer>
      </article>
    </div>,
    document.body
  );
};

export default ReportModal;
