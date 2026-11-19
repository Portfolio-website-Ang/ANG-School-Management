import React, { useState } from 'react';
import { IdCard, Plus, Printer, Search, FileText } from 'lucide-react';
import { UserRole, type AuthSession, type SchoolDatabase, type Student } from '../types';
import Card from './ui/Card';
import SchoolCrest from './ui/SchoolCrest';
import ReportModal from './ui/ReportModal';
import type { ReportKind } from '../utils/reportGenerator';

interface DirectoryViewProps {
  session: AuthSession;
  db: SchoolDatabase;
  onEnrollStudent: (payload: {
    name: string;
    grade: number;
    className: string;
    guardianName: string;
    guardianPhone: string;
    guardianEmail: string;
  }) => Promise<void>;
  onAddTeacher: (payload: {
    name: string;
    email: string;
    subjectSpecialty: string;
    assignedClasses: string[];
    qualification: string;
  }) => Promise<void>;
}

const DirectoryView: React.FC<DirectoryViewProps> = ({
  session,
  db,
  onEnrollStudent,
  onAddTeacher,
}) => {
  const [tab, setTab] = useState<'students' | 'faculty'>('students');
  const [search, setSearch] = useState('');
  const [idCardStudent, setIdCardStudent] = useState<Student | null>(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ kind: ReportKind; studentId: string } | null>(null);

  const [studentForm, setStudentForm] = useState({
    name: '',
    grade: 5,
    className: '5A',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
  });

  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    subjectSpecialty: '',
    assignedClasses: '5A, 6B',
    qualification: '',
  });

  const isAdmin = session.role === UserRole.Admin;

  const filteredStudents = db.students.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.rollNo.toLowerCase().includes(q) ||
      s.class.toLowerCase().includes(q) ||
      s.guardianName.toLowerCase().includes(q)
    );
  });

  const filteredTeachers = db.teachers.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.subjectSpecialty.toLowerCase().includes(q) ||
      t.employeeId.toLowerCase().includes(q)
    );
  });

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onEnrollStudent(studentForm);
      setShowEnroll(false);
      setStudentForm({
        name: '',
        grade: 5,
        className: '5A',
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onAddTeacher({
        ...teacherForm,
        assignedClasses: teacherForm.assignedClasses
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      });
      setShowAddTeacher(false);
      setTeacherForm({
        name: '',
        email: '',
        subjectSpecialty: '',
        assignedClasses: '5A, 6B',
        qualification: '',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTab('students')}
              className={`px-4 py-2 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
                tab === 'students'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Students ({db.students.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('faculty')}
              className={`px-4 py-2 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
                tab === 'faculty'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Faculty ({db.teachers.length})
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search directory..."
              className="pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => (tab === 'students' ? setShowEnroll(true) : setShowAddTeacher(true))}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{tab === 'students' ? 'Enroll Student' : 'Add Faculty Member'}</span>
          </button>
        )}
      </div>

      {tab === 'students' ? (
        <Card title="Student Information System (SIS)" subtitle={`${filteredStudents.length} student record(s)`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <th className="text-left py-3 px-3 font-semibold">Roll No</th>
                  <th className="text-left py-3 px-3 font-semibold">Student Name</th>
                  <th className="text-left py-3 px-3 font-semibold">Class</th>
                  <th className="text-left py-3 px-3 font-semibold">Guardian</th>
                  <th className="text-left py-3 px-3 font-semibold">Contact</th>
                  <th className="text-right py-3 px-3 font-semibold">Documents &amp; Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {student.rollNo}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {student.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      Class {student.class}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {student.guardianName}
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                      {student.guardianPhone}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setReportTarget({ kind: 'attendance', studentId: student.id })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Att. PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportTarget({ kind: 'fees', studentId: student.id })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Fee PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIdCardStudent(student)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          <IdCard className="w-3.5 h-3.5" />
                          <span>ID Card</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title="Academic Faculty Roster" subtitle={`${filteredTeachers.length} educator(s)`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <th className="text-left py-3 px-3 font-semibold">Employee ID</th>
                  <th className="text-left py-3 px-3 font-semibold">Faculty Name</th>
                  <th className="text-left py-3 px-3 font-semibold">Specialty</th>
                  <th className="text-left py-3 px-3 font-semibold">Assigned Classes</th>
                  <th className="text-left py-3 px-3 font-semibold">Qualification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTeachers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {t.employeeId}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {t.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {t.subjectSpecialty}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {t.assignedClasses.join(', ')}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400">
                      {t.qualification}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* White-Label Branded Printable Student ID Card */}
      {idCardStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 print-only-card">
            <div className="brand-bg text-white rounded-xl p-5">
              <div className="flex items-center gap-3">
                <SchoolCrest
                  logoDataUrl={db.branding.logoDataUrl}
                  crestStyle={db.branding.crestStyle}
                  schoolName={db.branding.schoolName}
                  size="md"
                  className="bg-white/15 border-white/30"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{db.branding.schoolName}</p>
                  <p className="text-[11px] opacity-85 font-mono">
                    Student Identity Card · {db.branding.academicYear}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-white/20">
                <p className="text-lg font-bold">{idCardStudent.name}</p>
                <p className="text-xs font-mono opacity-90 mt-0.5">
                  Roll No: {idCardStudent.rollNo} · Class {idCardStudent.class}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Guardian</span>
                <span className="font-medium">{idCardStudent.guardianName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Emergency Contact</span>
                <span className="font-mono">{idCardStudent.guardianPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Campus</span>
                <span className="truncate max-w-[200px]">{db.branding.address}</span>
              </div>
            </div>
            <div className="no-print flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIdCardStudent(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print ID Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {showEnroll && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Enroll New Student
            </h3>
            <form onSubmit={handleEnrollSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  required
                  value={studentForm.name}
                  onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Grade
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={studentForm.grade}
                    onChange={e => setStudentForm({ ...studentForm, grade: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Class Section
                  </label>
                  <input
                    required
                    value={studentForm.className}
                    onChange={e => setStudentForm({ ...studentForm, className: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Parent / Guardian Name
                </label>
                <input
                  required
                  value={studentForm.guardianName}
                  onChange={e => setStudentForm({ ...studentForm, guardianName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Guardian Phone
                  </label>
                  <input
                    value={studentForm.guardianPhone}
                    onChange={e => setStudentForm({ ...studentForm, guardianPhone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Guardian Email
                  </label>
                  <input
                    type="email"
                    value={studentForm.guardianEmail}
                    onChange={e => setStudentForm({ ...studentForm, guardianEmail: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnroll(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Faculty Modal */}
      {showAddTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Add Faculty Member
            </h3>
            <form onSubmit={handleTeacherSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  required
                  value={teacherForm.name}
                  onChange={e => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Subject Specialty
                </label>
                <input
                  required
                  value={teacherForm.subjectSpecialty}
                  onChange={e => setTeacherForm({ ...teacherForm, subjectSpecialty: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Assigned Classes
                  </label>
                  <input
                    value={teacherForm.assignedClasses}
                    onChange={e =>
                      setTeacherForm({ ...teacherForm, assignedClasses: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Qualification
                  </label>
                  <input
                    value={teacherForm.qualification}
                    onChange={e => setTeacherForm({ ...teacherForm, qualification: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={teacherForm.email}
                  onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeacher(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Adding...' : 'Save Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        session={session}
        db={db}
        initialKind={reportTarget?.kind || 'attendance'}
        initialStudentId={reportTarget?.studentId || 'All'}
      />
    </div>
  );
};

export default DirectoryView;
