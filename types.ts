export enum UserRole {
  Admin = 'Admin',
  Teacher = 'Teacher',
  Student = 'Student',
  Parent = 'Parent',
}

export type View =
  | 'dashboard'
  | 'courses'
  | 'assessments'
  | 'directory'
  | 'attendance'
  | 'fees'
  | 'schedule'
  | 'ai-assistant'
  | 'settings';

export enum AttendanceStatus {
  Present = 'Present',
  Absent = 'Absent',
  Late = 'Late',
  Excused = 'Excused',
  Unmarked = 'Unmarked',
}

export enum FeeStatus {
  Paid = 'Paid',
  Due = 'Due',
  Overdue = 'Overdue',
}

export type CrestStyle = 'shield' | 'book' | 'pillars' | 'compass';
export type FontPairing = 'jakarta' | 'outfit' | 'bricolage';

export interface EnabledModules {
  courses: boolean;
  assessments: boolean;
  attendance: boolean;
  fees: boolean;
  schedule: boolean;
  aiAssistant: boolean;
}

export interface SchoolBranding {
  schoolName: string;
  tagline: string;
  affiliationCode: string;
  academicYear: string;
  currencySymbol: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  primaryColor: string;
  accentColor: string;
  logoDataUrl: string;
  crestStyle: CrestStyle;
  fontPairing: FontPairing;
  enabledModules: EnabledModules;
}

export interface Student {
  id: string;
  rollNo: string;
  name: string;
  grade: number;
  class: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  enrolledDate: string;
  status: 'Active' | 'On Leave' | 'Graduated';
}

export interface Teacher {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  subjectSpecialty: string;
  assignedClasses: string[];
  qualification: string;
}

export interface Lesson {
  id: string;
  title: string;
  durationMinutes: number;
  type: 'Reading' | 'Video' | 'Lab';
  summary: string;
  content: string;
  resourceLabel: string;
  completedByStudentIds: string[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  grade: number;
  className: string;
  teacherId: string;
  teacherName: string;
  category: string;
  description: string;
  coverKey: 'science' | 'cs' | 'math' | 'campus';
  lessons: Lesson[];
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  className: string;
  dueDate: string;
  maxMarks: number;
  instructions: string;
  createdBy: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  content: string;
  attachmentName: string;
  score?: number;
  feedback?: string;
  status: 'Submitted' | 'Graded';
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  points: number;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  className: string;
  durationMinutes: number;
  dueDate: string;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  submittedAt: string;
  answers: number[];
  score: number;
  maxScore: number;
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedBy?: string;
}

export interface FeeRecord {
  id: string;
  invoiceNo: string;
  studentId: string;
  category: 'Tuition' | 'Lab' | 'Exam' | 'Transport' | 'Library';
  amount: number;
  dueDate: string;
  status: FeeStatus;
  description: string;
  paidAt?: string;
  paymentRef?: string;
}

export interface TimetableSlot {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  startTime: string;
  endTime: string;
  subject: string;
  className: string;
  teacherName: string;
  room: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: 'All' | 'Parents' | 'Students' | 'Teachers';
  author: string;
  createdAt: string;
  priority: 'Normal' | 'Urgent';
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorRole: string;
  actorName: string;
  action: string;
  target: string;
}

export interface AuthSession {
  token: string;
  role: UserRole;
  actorId: string;
  actorName: string;
  assignedClass?: string;
  studentId?: string;
  expiresAt: number;
}

export interface PublicPortalBootstrap {
  branding: SchoolBranding;
  teachers: Array<{ id: string; name: string; assignedClasses: string[]; subjectSpecialty: string }>;
  students: Array<{ id: string; rollNo: string; name: string; class: string; guardianName: string }>;
}

export interface SchoolDatabase {
  branding: SchoolBranding;
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  attendance: AttendanceRecord[];
  fees: FeeRecord[];
  timetable: TimetableSlot[];
  announcements: Announcement[];
  auditLog: AuditEntry[];
}
