import {
  AttendanceStatus,
  FeeStatus,
  type SchoolDatabase,
  type Student,
} from '../types';

export type ReportKind = 'attendance' | 'fees';

export interface AttendanceStudentSummary {
  studentId: string;
  rollNo: string;
  name: string;
  className: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  unmarked: number;
  recordedSessions: number;
  ratePct: number;
}

export interface AttendanceLogRow {
  date: string;
  studentId: string;
  rollNo: string;
  studentName: string;
  className: string;
  status: AttendanceStatus;
  markedBy: string;
}

export interface AttendanceReportPayload {
  reportId: string;
  generatedAt: string;
  scopeLabel: string;
  dateRangeLabel: string;
  totals: {
    studentsCount: number;
    recordedSessions: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    overallRatePct: number;
  };
  studentSummaries: AttendanceStudentSummary[];
  logs: AttendanceLogRow[];
}

export interface FeeStudentSummary {
  studentId: string;
  rollNo: string;
  name: string;
  className: string;
  guardianName: string;
  invoiceCount: number;
  billed: number;
  paid: number;
  outstanding: number;
}

export interface FeeHistoryRow {
  id: string;
  invoiceNo: string;
  studentName: string;
  rollNo: string;
  className: string;
  category: string;
  description: string;
  dueDate: string;
  status: FeeStatus;
  paidAt: string;
  paymentRef: string;
  amount: number;
}

export interface FeeReportPayload {
  reportId: string;
  generatedAt: string;
  scopeLabel: string;
  statusLabel: string;
  totals: {
    invoiceCount: number;
    totalBilled: number;
    totalPaid: number;
    totalDue: number;
    totalOverdue: number;
    collectionRatePct: number;
  };
  studentSummaries: FeeStudentSummary[];
  records: FeeHistoryRow[];
}

function generateReportId(prefix: string): string {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ymd}-${rand}`;
}

function filterTargetStudents(
  students: Student[],
  options: { studentId?: string; className?: string }
): Student[] {
  return students.filter(s => {
    if (options.studentId && options.studentId !== 'All' && s.id !== options.studentId) {
      return false;
    }
    if (options.className && options.className !== 'All' && s.class !== options.className) {
      return false;
    }
    return true;
  });
}

export function buildAttendanceReport(
  db: SchoolDatabase,
  options: {
    studentId?: string;
    className?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): AttendanceReportPayload {
  const targetStudents = filterTargetStudents(db.students, options);
  const studentMap = new Map<string, Student>(targetStudents.map(s => [s.id, s]));

  const filteredRecords = db.attendance.filter(rec => {
    if (!studentMap.has(rec.studentId)) return false;
    if (options.startDate && rec.date < options.startDate) return false;
    if (options.endDate && rec.date > options.endDate) return false;
    return true;
  });

  const studentSummaries: AttendanceStudentSummary[] = targetStudents.map(student => {
    const recs = filteredRecords.filter(r => r.studentId === student.id);
    const present = recs.filter(r => r.status === AttendanceStatus.Present).length;
    const absent = recs.filter(r => r.status === AttendanceStatus.Absent).length;
    const late = recs.filter(r => r.status === AttendanceStatus.Late).length;
    const excused = recs.filter(r => r.status === AttendanceStatus.Excused).length;
    const unmarked = recs.filter(r => r.status === AttendanceStatus.Unmarked).length;
    const recordedSessions = present + absent + late + excused;
    const attended = present + late;
    const ratePct = recordedSessions > 0 ? Math.round((attended / recordedSessions) * 100) : 0;

    return {
      studentId: student.id,
      rollNo: student.rollNo,
      name: student.name,
      className: student.class,
      present,
      absent,
      late,
      excused,
      unmarked,
      recordedSessions,
      ratePct,
    };
  });

  const logs: AttendanceLogRow[] = filteredRecords
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || a.studentId.localeCompare(b.studentId))
    .map(rec => {
      const st = studentMap.get(rec.studentId)!;
      return {
        date: rec.date,
        studentId: st.id,
        rollNo: st.rollNo,
        studentName: st.name,
        className: st.class,
        status: rec.status,
        markedBy: rec.markedBy || 'Faculty Register',
      };
    });

  const presentCount = studentSummaries.reduce((s, r) => s + r.present, 0);
  const absentCount = studentSummaries.reduce((s, r) => s + r.absent, 0);
  const lateCount = studentSummaries.reduce((s, r) => s + r.late, 0);
  const excusedCount = studentSummaries.reduce((s, r) => s + r.excused, 0);
  const recordedSessions = presentCount + absentCount + lateCount + excusedCount;
  const overallRatePct =
    recordedSessions > 0 ? Math.round(((presentCount + lateCount) / recordedSessions) * 100) : 0;

  const singleStudent =
    options.studentId && options.studentId !== 'All'
      ? targetStudents[0]
      : undefined;

  const scopeLabel = singleStudent
    ? `${singleStudent.name} (${singleStudent.rollNo} · Class ${singleStudent.class})`
    : options.className && options.className !== 'All'
    ? `Class ${options.className} Roster`
    : 'All Enrolled Students';

  const dateRangeLabel =
    options.startDate || options.endDate
      ? `${options.startDate || 'Beginning'} to ${options.endDate || 'Present'}`
      : 'All Recorded Dates';

  return {
    reportId: generateReportId('ATT'),
    generatedAt: new Date().toLocaleString(),
    scopeLabel,
    dateRangeLabel,
    totals: {
      studentsCount: targetStudents.length,
      recordedSessions,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      overallRatePct,
    },
    studentSummaries,
    logs,
  };
}

export function buildFeeHistoryReport(
  db: SchoolDatabase,
  options: {
    studentId?: string;
    className?: string;
    statusFilter?: 'All' | FeeStatus;
  } = {}
): FeeReportPayload {
  const targetStudents = filterTargetStudents(db.students, options);
  const studentMap = new Map<string, Student>(targetStudents.map(s => [s.id, s]));

  const filteredFees = db.fees.filter(fee => {
    if (!studentMap.has(fee.studentId)) return false;
    if (options.statusFilter && options.statusFilter !== 'All' && fee.status !== options.statusFilter) {
      return false;
    }
    return true;
  });

  const studentSummaries: FeeStudentSummary[] = targetStudents
    .map(student => {
      const stFees = filteredFees.filter(f => f.studentId === student.id);
      const billed = stFees.reduce((sum, f) => sum + f.amount, 0);
      const paid = stFees
        .filter(f => f.status === FeeStatus.Paid)
        .reduce((sum, f) => sum + f.amount, 0);
      return {
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.name,
        className: student.class,
        guardianName: student.guardianName,
        invoiceCount: stFees.length,
        billed,
        paid,
        outstanding: billed - paid,
      };
    })
    .filter(row => row.invoiceCount > 0 || (options.studentId && options.studentId !== 'All'));

  const records: FeeHistoryRow[] = filteredFees
    .slice()
    .sort((a, b) => (b.paidAt || b.dueDate).localeCompare(a.paidAt || a.dueDate))
    .map(fee => {
      const st = studentMap.get(fee.studentId)!;
      return {
        id: fee.id,
        invoiceNo: fee.invoiceNo,
        studentName: st.name,
        rollNo: st.rollNo,
        className: st.class,
        category: fee.category,
        description: fee.description,
        dueDate: fee.dueDate,
        status: fee.status,
        paidAt: fee.paidAt || '—',
        paymentRef: fee.paymentRef || '—',
        amount: fee.amount,
      };
    });

  const totalBilled = records.reduce((s, r) => s + r.amount, 0);
  const totalPaid = records
    .filter(r => r.status === FeeStatus.Paid)
    .reduce((s, r) => s + r.amount, 0);
  const totalDue = records
    .filter(r => r.status === FeeStatus.Due)
    .reduce((s, r) => s + r.amount, 0);
  const totalOverdue = records
    .filter(r => r.status === FeeStatus.Overdue)
    .reduce((s, r) => s + r.amount, 0);
  const collectionRatePct = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100;

  const singleStudent =
    options.studentId && options.studentId !== 'All'
      ? targetStudents[0]
      : undefined;

  const scopeLabel = singleStudent
    ? `${singleStudent.name} (${singleStudent.rollNo} · Guardian: ${singleStudent.guardianName})`
    : options.className && options.className !== 'All'
    ? `Class ${options.className} Billing Accounts`
    : 'All Student Fee Accounts';

  return {
    reportId: generateReportId('FEE'),
    generatedAt: new Date().toLocaleString(),
    scopeLabel,
    statusLabel: options.statusFilter && options.statusFilter !== 'All' ? options.statusFilter : 'All Invoice Statuses',
    totals: {
      invoiceCount: records.length,
      totalBilled,
      totalPaid,
      totalDue,
      totalOverdue,
      collectionRatePct,
    },
    studentSummaries,
    records,
  };
}

export function triggerPdfPrint(): void {
  window.print();
}
