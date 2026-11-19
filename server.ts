import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import type {
  AttendanceStatus,
  FeeStatus,
  SchoolBranding,
  SchoolDatabase,
  UserRole,
} from './types.ts';
import {
  checkLoginRateLimit,
  hashPasscode,
  recordFailedLogin,
  resetLoginRateLimit,
  sanitizeText,
  signSessionToken,
  verifyPasscode,
  verifySessionToken,
  type SessionPayload,
} from './server/auth.ts';
import { appendAudit, loadEnvelope, resetSchoolDatabase, saveEnvelope } from './server/store.ts';

interface AuthedRequest extends Request {
  session?: SessionPayload;
}

const VALID_HEX = /^#[0-9a-fA-F]{6}$/;
const VALID_ATTENDANCE: ReadonlySet<string> = new Set(['Present', 'Absent', 'Late', 'Excused', 'Unmarked']);

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map(part => part.trim())
      .find(part => part.startsWith('mss_session='));
    if (match) {
      return decodeURIComponent(match.slice('mss_session='.length));
    }
  }
  return null;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Authentication required. Please sign in again.' });
    return;
  }
  req.session = payload;
  next();
}

function requireRoles(roles: Array<SessionPayload['role']>) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.session) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.session.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this action.' });
      return;
    }
    next();
  };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function sanitizeBranding(incoming: Partial<SchoolBranding>, current: SchoolBranding): SchoolBranding {
  const logo = typeof incoming.logoDataUrl === 'string' ? incoming.logoDataUrl.trim() : current.logoDataUrl;
  const safeLogo =
    logo === '' ||
    /^\/assets\/branding\/[a-z0-9-]+\.png$/.test(logo) ||
    /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(logo)
      ? logo.slice(0, 900_000)
      : current.logoDataUrl;

  const allowedCrests = new Set(['shield', 'book', 'pillars', 'compass']);
  const allowedFonts = new Set(['jakarta', 'outfit', 'bricolage']);

  return {
    schoolName: sanitizeText(incoming.schoolName ?? current.schoolName, 90) || current.schoolName,
    tagline: sanitizeText(incoming.tagline ?? current.tagline, 140) || current.tagline,
    affiliationCode: sanitizeText(incoming.affiliationCode ?? current.affiliationCode, 40) || current.affiliationCode,
    academicYear: sanitizeText(incoming.academicYear ?? current.academicYear, 24) || current.academicYear,
    currencySymbol: sanitizeText(incoming.currencySymbol ?? current.currencySymbol, 6) || current.currencySymbol,
    contactEmail: sanitizeText(incoming.contactEmail ?? current.contactEmail, 80) || current.contactEmail,
    contactPhone: sanitizeText(incoming.contactPhone ?? current.contactPhone, 40) || current.contactPhone,
    address: sanitizeText(incoming.address ?? current.address, 140) || current.address,
    primaryColor: VALID_HEX.test(incoming.primaryColor || '') ? (incoming.primaryColor as string) : current.primaryColor,
    accentColor: VALID_HEX.test(incoming.accentColor || '') ? (incoming.accentColor as string) : current.accentColor,
    logoDataUrl: safeLogo,
    crestStyle: allowedCrests.has(incoming.crestStyle || '') ? (incoming.crestStyle as SchoolBranding['crestStyle']) : current.crestStyle,
    fontPairing: allowedFonts.has(incoming.fontPairing || '') ? (incoming.fontPairing as SchoolBranding['fontPairing']) : current.fontPairing,
    enabledModules: {
      courses: incoming.enabledModules?.courses ?? current.enabledModules.courses,
      assessments: incoming.enabledModules?.assessments ?? current.enabledModules.assessments,
      attendance: incoming.enabledModules?.attendance ?? current.enabledModules.attendance,
      fees: incoming.enabledModules?.fees ?? current.enabledModules.fees,
      schedule: incoming.enabledModules?.schedule ?? current.enabledModules.schedule,
      aiAssistant: incoming.enabledModules?.aiAssistant ?? current.enabledModules.aiAssistant,
    },
  };
}

async function startServer(): Promise<void> {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    const env = loadEnvelope();
    res.json({ status: 'ok', schoolName: env.db.branding.schoolName });
  });

  // Public white-label bootstrap for Login Screen (no sensitive records exposed)
  app.get('/api/public/bootstrap', (_req, res) => {
    const { db } = loadEnvelope();
    res.json({
      branding: db.branding,
      teachers: db.teachers.map(t => ({
        id: t.id,
        name: t.name,
        assignedClasses: t.assignedClasses,
        subjectSpecialty: t.subjectSpecialty,
      })),
      students: db.students.map(s => ({
        id: s.id,
        rollNo: s.rollNo,
        name: s.name,
        class: s.class,
        guardianName: s.guardianName,
      })),
    });
  });

  // Authentication
  app.post('/api/auth/login', (req, res) => {
    const envelope = loadEnvelope();
    const role = sanitizeText(req.body?.role, 20) as UserRole;
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
    const actorId = sanitizeText(req.body?.actorId, 40);
    const rateKey = `${getClientIp(req)}:admin`;

    if (role === 'Admin') {
      const rate = checkLoginRateLimit(rateKey);
      if (!rate.allowed) {
        res.setHeader('Retry-After', String(rate.retryAfterSec));
        res.status(429).json({
          error: `Too many failed passcode attempts. Try again in ${rate.retryAfterSec}s.`,
        });
        return;
      }
      if (!verifyPasscode(passcode, envelope.adminPasscode)) {
        recordFailedLogin(rateKey);
        res.status(401).json({ error: 'Invalid Admin passcode. Please verify and try again.' });
        return;
      }
      resetLoginRateLimit(rateKey);
      const { token, fullPayload } = signSessionToken({
        role: 'Admin',
        actorId: 'admin-root',
        actorName: 'Principal / Administrator',
      });
      appendAudit(envelope.db, 'Admin', 'Principal / Administrator', 'LOGIN_SUCCESS', 'Admin Executive Portal');
      saveEnvelope(envelope);
      res.cookie('mss_session', token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 12 * 60 * 60 * 1000,
      });
      res.json({
        session: {
          token,
          role: fullPayload.role,
          actorId: fullPayload.actorId,
          actorName: fullPayload.actorName,
          expiresAt: fullPayload.exp,
        },
      });
      return;
    }

    if (role === 'Teacher') {
      const teacher = envelope.db.teachers.find(t => t.id === actorId) || envelope.db.teachers[0];
      if (!teacher) {
        res.status(404).json({ error: 'No faculty profile found.' });
        return;
      }
      const { token, fullPayload } = signSessionToken({
        role: 'Teacher',
        actorId: teacher.id,
        actorName: teacher.name,
        assignedClass: teacher.assignedClasses[0] || '5A',
      });
      appendAudit(envelope.db, 'Teacher', teacher.name, 'LOGIN_SUCCESS', `Class ${teacher.assignedClasses.join(', ')}`);
      saveEnvelope(envelope);
      res.json({
        session: {
          token,
          role: fullPayload.role,
          actorId: fullPayload.actorId,
          actorName: fullPayload.actorName,
          assignedClass: fullPayload.assignedClass,
          expiresAt: fullPayload.exp,
        },
      });
      return;
    }

    if (role === 'Student') {
      const student = envelope.db.students.find(s => s.id === actorId) || envelope.db.students[0];
      if (!student) {
        res.status(404).json({ error: 'No student profile found.' });
        return;
      }
      const { token, fullPayload } = signSessionToken({
        role: 'Student',
        actorId: student.id,
        actorName: student.name,
        assignedClass: student.class,
        studentId: student.id,
      });
      res.json({
        session: {
          token,
          role: fullPayload.role,
          actorId: fullPayload.actorId,
          actorName: fullPayload.actorName,
          assignedClass: fullPayload.assignedClass,
          studentId: fullPayload.studentId,
          expiresAt: fullPayload.exp,
        },
      });
      return;
    }

    if (role === 'Parent') {
      const student = envelope.db.students.find(s => s.id === actorId) || envelope.db.students[0];
      if (!student) {
        res.status(404).json({ error: 'No guardian profile found.' });
        return;
      }
      const { token, fullPayload } = signSessionToken({
        role: 'Parent',
        actorId: `parent-${student.id}`,
        actorName: student.guardianName,
        assignedClass: student.class,
        studentId: student.id,
      });
      res.json({
        session: {
          token,
          role: fullPayload.role,
          actorId: fullPayload.actorId,
          actorName: fullPayload.actorName,
          assignedClass: fullPayload.assignedClass,
          studentId: fullPayload.studentId,
          expiresAt: fullPayload.exp,
        },
      });
      return;
    }

    res.status(400).json({ error: 'Unsupported role selected.' });
  });

  app.get('/api/auth/session', requireAuth, (req: AuthedRequest, res) => {
    const s = req.session!;
    res.json({
      session: {
        role: s.role,
        actorId: s.actorId,
        actorName: s.actorName,
        assignedClass: s.assignedClass,
        studentId: s.studentId,
        expiresAt: s.exp,
      },
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('mss_session');
    res.json({ ok: true });
  });

  // Main School + LMS Data Endpoint (role-scoped least privilege)
  app.get('/api/school/data', requireAuth, (req: AuthedRequest, res) => {
    const { db } = loadEnvelope();
    const role = req.session!.role;
    const studentId = req.session!.studentId;

    if (role === 'Admin') {
      res.json(db);
      return;
    }

    if (role === 'Teacher') {
      const sanitized: SchoolDatabase = {
        ...db,
        auditLog: [],
      };
      res.json(sanitized);
      return;
    }

    // Student & Parent receive full LMS content + their own student records, while keeping other families' private fee details minimal
    const scoped: SchoolDatabase = {
      ...db,
      students: db.students.filter(s => s.id === studentId),
      fees: db.fees.filter(f => f.studentId === studentId),
      submissions: db.submissions.filter(sub => sub.studentId === studentId),
      quizAttempts: db.quizAttempts.filter(qa => qa.studentId === studentId),
      attendance: db.attendance.filter(a => a.studentId === studentId),
      auditLog: [],
    };
    res.json(scoped);
  });

  // White-Label Branding Studio (Admin only)
  app.put('/api/branding', requireAuth, requireRoles(['Admin']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const updated = sanitizeBranding(req.body || {}, envelope.db.branding);
    envelope.db.branding = updated;
    appendAudit(envelope.db, 'Admin', req.session!.actorName, 'UPDATED_BRANDING', updated.schoolName);
    saveEnvelope(envelope);
    res.json({ branding: updated });
  });

  // Security: Change Admin Passcode (Admin only)
  app.post('/api/security/change-passcode', requireAuth, requireRoles(['Admin']), (req: AuthedRequest, res) => {
    const currentPasscode = typeof req.body?.currentPasscode === 'string' ? req.body.currentPasscode : '';
    const newPasscode = typeof req.body?.newPasscode === 'string' ? req.body.newPasscode.trim() : '';

    if (newPasscode.length < 4 || newPasscode.length > 32) {
      res.status(400).json({ error: 'New passcode must be between 4 and 32 characters.' });
      return;
    }

    const envelope = loadEnvelope();
    if (!verifyPasscode(currentPasscode, envelope.adminPasscode)) {
      res.status(401).json({ error: 'Current Admin passcode is incorrect.' });
      return;
    }

    envelope.adminPasscode = hashPasscode(newPasscode);
    appendAudit(envelope.db, 'Admin', req.session!.actorName, 'CHANGED_ADMIN_PASSCODE', 'Security Credentials');
    saveEnvelope(envelope);
    res.json({ ok: true });
  });

  // Students CRUD (Admin only)
  app.post('/api/students', requireAuth, requireRoles(['Admin']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const name = sanitizeText(req.body?.name, 80);
    const className = sanitizeText(req.body?.className, 16);
    const grade = Number(req.body?.grade) || 5;
    const guardianName = sanitizeText(req.body?.guardianName, 80);
    const guardianPhone = sanitizeText(req.body?.guardianPhone, 30);
    const guardianEmail = sanitizeText(req.body?.guardianEmail, 80);

    if (!name || !className || !guardianName) {
      res.status(400).json({ error: 'Student name, class, and guardian name are required.' });
      return;
    }

    const id = `s${Date.now().toString(36)}`;
    const prefix = envelope.db.branding.schoolName
      .split(/\s+/)
      .map(w => w[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 3) || 'SCH';
    const rollNo = `${prefix}-${className}-${String(envelope.db.students.length + 1).padStart(2, '0')}`;

    const newStudent = {
      id,
      rollNo,
      name,
      grade,
      class: className,
      guardianName,
      guardianPhone: guardianPhone || 'Not provided',
      guardianEmail: guardianEmail || 'Not provided',
      enrolledDate: new Date().toISOString().split('T')[0],
      status: 'Active' as const,
    };

    envelope.db.students.push(newStudent);
    appendAudit(envelope.db, 'Admin', req.session!.actorName, 'ENROLLED_STUDENT', `${newStudent.name} (${newStudent.rollNo})`);
    saveEnvelope(envelope);
    res.status(201).json({ student: newStudent });
  });

  // Teachers CRUD (Admin only)
  app.post('/api/teachers', requireAuth, requireRoles(['Admin']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const name = sanitizeText(req.body?.name, 80);
    const email = sanitizeText(req.body?.email, 80);
    const subjectSpecialty = sanitizeText(req.body?.subjectSpecialty, 80);
    const qualification = sanitizeText(req.body?.qualification, 80);
    const assignedClasses = Array.isArray(req.body?.assignedClasses)
      ? req.body.assignedClasses.map((c: unknown) => sanitizeText(c, 16)).filter(Boolean)
      : ['5A'];

    if (!name || !subjectSpecialty) {
      res.status(400).json({ error: 'Faculty name and subject specialty are required.' });
      return;
    }

    const newTeacher = {
      id: `t${Date.now().toString(36)}`,
      employeeId: `FAC-${100 + envelope.db.teachers.length + 1}`,
      name,
      email: email || 'faculty@school.edu',
      subjectSpecialty,
      assignedClasses: assignedClasses.length ? assignedClasses : ['5A'],
      qualification: qualification || 'B.Ed.',
    };
    envelope.db.teachers.push(newTeacher);
    appendAudit(envelope.db, 'Admin', req.session!.actorName, 'ADDED_FACULTY', newTeacher.name);
    saveEnvelope(envelope);
    res.status(201).json({ teacher: newTeacher });
  });

  // Attendance Marking (Admin & Teacher)
  app.post('/api/attendance/mark', requireAuth, requireRoles(['Admin', 'Teacher']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const entries = Array.isArray(req.body?.entries)
      ? req.body.entries
      : [{ studentId: req.body?.studentId, date: req.body?.date, status: req.body?.status }];

    const todayStr = new Date().toISOString().split('T')[0];
    let updatedCount = 0;

    for (const item of entries) {
      const studentId = sanitizeText(item?.studentId, 40);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(item?.date || '') ? String(item.date) : todayStr;
      const status = String(item?.status || '');
      if (!studentId || !VALID_ATTENDANCE.has(status)) continue;
      if (!envelope.db.students.some(s => s.id === studentId)) continue;

      const idx = envelope.db.attendance.findIndex(r => r.studentId === studentId && r.date === date);
      if (idx !== -1) {
        envelope.db.attendance[idx].status = status as AttendanceStatus;
        envelope.db.attendance[idx].markedBy = req.session!.actorName;
      } else {
        envelope.db.attendance.push({
          studentId,
          date,
          status: status as AttendanceStatus,
          markedBy: req.session!.actorName,
        });
      }
      updatedCount += 1;
    }

    if (updatedCount === 0) {
      res.status(400).json({ error: 'No valid attendance entries supplied.' });
      return;
    }

    appendAudit(envelope.db, req.session!.role, req.session!.actorName, 'MARKED_ATTENDANCE', `${updatedCount} student record(s)`);
    saveEnvelope(envelope);
    res.json({ attendance: envelope.db.attendance });
  });

  // LMS Courses & Lessons
  app.post('/api/courses', requireAuth, requireRoles(['Admin', 'Teacher']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const code = sanitizeText(req.body?.code, 20);
    const title = sanitizeText(req.body?.title, 100);
    const className = sanitizeText(req.body?.className, 16);
    const category = sanitizeText(req.body?.category, 40);
    const description = sanitizeText(req.body?.description, 320);
    const coverKey = ['science', 'cs', 'math', 'campus'].includes(req.body?.coverKey) ? req.body.coverKey : 'campus';

    if (!code || !title || !className) {
      res.status(400).json({ error: 'Course code, title, and class are required.' });
      return;
    }

    const newCourse = {
      id: `c${Date.now().toString(36)}`,
      code: code.toUpperCase(),
      title,
      grade: parseInt(className, 10) || 5,
      className,
      teacherId: req.session!.actorId,
      teacherName: req.session!.actorName,
      category: category || 'General Studies',
      description: description || 'Structured curriculum module.',
      coverKey,
      lessons: [],
    };
    envelope.db.courses.push(newCourse);
    appendAudit(envelope.db, req.session!.role, req.session!.actorName, 'CREATED_COURSE', `${newCourse.code} ${newCourse.title}`);
    saveEnvelope(envelope);
    res.status(201).json({ course: newCourse });
  });

  app.post('/api/courses/:id/lessons', requireAuth, requireRoles(['Admin', 'Teacher']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const course = envelope.db.courses.find(c => c.id === req.params.id);
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }
    const title = sanitizeText(req.body?.title, 100);
    const summary = sanitizeText(req.body?.summary, 220);
    const content = sanitizeText(req.body?.content, 4000);
    const durationMinutes = Math.max(5, Math.min(180, Number(req.body?.durationMinutes) || 25));
    const type = ['Reading', 'Video', 'Lab'].includes(req.body?.type) ? req.body.type : 'Reading';
    const resourceLabel = sanitizeText(req.body?.resourceLabel, 80) || 'Lesson Handout.pdf';

    if (!title || !content) {
      res.status(400).json({ error: 'Lesson title and content are required.' });
      return;
    }

    const lesson = {
      id: `l${Date.now().toString(36)}`,
      title,
      durationMinutes,
      type,
      summary: summary || title,
      content,
      resourceLabel,
      completedByStudentIds: [],
    };
    course.lessons.push(lesson);
    appendAudit(envelope.db, req.session!.role, req.session!.actorName, 'ADDED_LESSON', `${course.code}: ${lesson.title}`);
    saveEnvelope(envelope);
    res.status(201).json({ lesson });
  });

  app.post('/api/courses/:courseId/lessons/:lessonId/toggle-complete', requireAuth, (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const course = envelope.db.courses.find(c => c.id === req.params.courseId);
    const lesson = course?.lessons.find(l => l.id === req.params.lessonId);
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }
    const targetStudentId = req.session!.studentId || sanitizeText(req.body?.studentId, 40);
    if (!targetStudentId) {
      res.status(400).json({ error: 'Student ID required.' });
      return;
    }

    const exists = lesson.completedByStudentIds.includes(targetStudentId);
    if (exists) {
      lesson.completedByStudentIds = lesson.completedByStudentIds.filter(id => id !== targetStudentId);
    } else {
      lesson.completedByStudentIds.push(targetStudentId);
    }
    saveEnvelope(envelope);
    res.json({ completedByStudentIds: lesson.completedByStudentIds });
  });

  // LMS Assignments & Submissions
  app.post('/api/assignments', requireAuth, requireRoles(['Admin', 'Teacher']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const courseId = sanitizeText(req.body?.courseId, 40);
    const title = sanitizeText(req.body?.title, 120);
    const className = sanitizeText(req.body?.className, 16);
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.dueDate || '')
      ? String(req.body.dueDate)
      : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const maxMarks = Math.max(5, Math.min(200, Number(req.body?.maxMarks) || 25));
    const instructions = sanitizeText(req.body?.instructions, 1200);

    if (!courseId || !title || !className) {
      res.status(400).json({ error: 'Course, title, and class are required.' });
      return;
    }

    const assignment = {
      id: `a${Date.now().toString(36)}`,
      courseId,
      title,
      className,
      dueDate,
      maxMarks,
      instructions: instructions || 'Complete and submit before the due date.',
      createdBy: req.session!.actorName,
    };
    envelope.db.assignments.unshift(assignment);
    appendAudit(envelope.db, req.session!.role, req.session!.actorName, 'CREATED_ASSIGNMENT', assignment.title);
    saveEnvelope(envelope);
    res.status(201).json({ assignment });
  });

  app.post('/api/assignments/:id/submit', requireAuth, requireRoles(['Student']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const assignment = envelope.db.assignments.find(a => a.id === req.params.id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
    const content = sanitizeText(req.body?.content, 3000);
    const attachmentName = sanitizeText(req.body?.attachmentName, 100) || 'student_response.pdf';
    if (!content) {
      res.status(400).json({ error: 'Submission answer text cannot be empty.' });
      return;
    }

    const studentId = req.session!.studentId!;
    const existingIdx = envelope.db.submissions.findIndex(
      s => s.assignmentId === assignment.id && s.studentId === studentId
    );
    const submission = {
      id: existingIdx !== -1 ? envelope.db.submissions[existingIdx].id : `sub${Date.now().toString(36)}`,
      assignmentId: assignment.id,
      studentId,
      submittedAt: new Date().toISOString().split('T')[0],
      content,
      attachmentName,
      status: 'Submitted' as const,
    };
    if (existingIdx !== -1) {
      envelope.db.submissions[existingIdx] = submission;
    } else {
      envelope.db.submissions.unshift(submission);
    }
    saveEnvelope(envelope);
    res.status(201).json({ submission });
  });

  app.post('/api/submissions/:id/grade', requireAuth, requireRoles(['Admin', 'Teacher']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const submission = envelope.db.submissions.find(s => s.id === req.params.id);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found.' });
      return;
    }
    const assignment = envelope.db.assignments.find(a => a.id === submission.assignmentId);
    const maxMarks = assignment?.maxMarks || 100;
    const score = Math.max(0, Math.min(maxMarks, Number(req.body?.score) || 0));
    const feedback = sanitizeText(req.body?.feedback, 600);

    submission.score = score;
    submission.feedback = feedback;
    submission.status = 'Graded';
    appendAudit(envelope.db, req.session!.role, req.session!.actorName, 'GRADED_SUBMISSION', `${submission.id} (${score}/${maxMarks})`);
    saveEnvelope(envelope);
    res.json({ submission });
  });

  // LMS Quizzes & Auto-Grading
  app.post('/api/quizzes', requireAuth, requireRoles(['Admin', 'Teacher']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const courseId = sanitizeText(req.body?.courseId, 40);
    const title = sanitizeText(req.body?.title, 120);
    const className = sanitizeText(req.body?.className, 16);
    const durationMinutes = Math.max(3, Math.min(120, Number(req.body?.durationMinutes) || 10));
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.dueDate || '')
      ? String(req.body.dueDate)
      : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const rawQuestions = Array.isArray(req.body?.questions) ? req.body.questions : [];
    const questions = rawQuestions
      .map((q: any, idx: number) => ({
        id: `qq-${Date.now().toString(36)}-${idx}`,
        prompt: sanitizeText(q?.prompt, 300),
        options: Array.isArray(q?.options) ? q.options.map((o: unknown) => sanitizeText(o, 120)).filter(Boolean) : [],
        correctIndex: Math.max(0, Number(q?.correctIndex) || 0),
        points: Math.max(1, Math.min(50, Number(q?.points) || 5)),
      }))
      .filter((q: any) => q.prompt && q.options.length >= 2);

    if (!courseId || !title || !className || questions.length === 0) {
      res.status(400).json({ error: 'Quiz title, course, class, and at least 1 valid question are required.' });
      return;
    }

    const quiz = {
      id: `q${Date.now().toString(36)}`,
      courseId,
      title,
      className,
      durationMinutes,
      dueDate,
      questions,
    };
    envelope.db.quizzes.unshift(quiz);
    appendAudit(envelope.db, req.session!.role, req.session!.actorName, 'CREATED_QUIZ', quiz.title);
    saveEnvelope(envelope);
    res.status(201).json({ quiz });
  });

  app.post('/api/quizzes/:id/attempt', requireAuth, requireRoles(['Student']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const quiz = envelope.db.quizzes.find(q => q.id === req.params.id);
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found.' });
      return;
    }
    const answers = Array.isArray(req.body?.answers) ? req.body.answers.map((a: unknown) => Number(a)) : [];
    let score = 0;
    let maxScore = 0;
    quiz.questions.forEach((q, idx) => {
      maxScore += q.points;
      if (answers[idx] === q.correctIndex) {
        score += q.points;
      }
    });

    const studentId = req.session!.studentId!;
    const attempt = {
      id: `qa${Date.now().toString(36)}`,
      quizId: quiz.id,
      studentId,
      submittedAt: new Date().toISOString().split('T')[0],
      answers,
      score,
      maxScore,
    };
    envelope.db.quizAttempts = envelope.db.quizAttempts.filter(
      a => !(a.quizId === quiz.id && a.studentId === studentId)
    );
    envelope.db.quizAttempts.unshift(attempt);
    saveEnvelope(envelope);
    res.status(201).json({ attempt });
  });

  // Fees & Billing
  app.post('/api/fees', requireAuth, requireRoles(['Admin']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const targetType = req.body?.targetType === 'class' ? 'class' : 'student';
    const targetId = sanitizeText(req.body?.targetId, 40);
    const category = ['Tuition', 'Lab', 'Exam', 'Transport', 'Library'].includes(req.body?.category)
      ? req.body.category
      : 'Tuition';
    const amount = Math.max(1, Math.min(50000, Number(req.body?.amount) || 0));
    const description = sanitizeText(req.body?.description, 120);
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.dueDate || '')
      ? String(req.body.dueDate)
      : new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    if (!targetId || amount <= 0 || !description) {
      res.status(400).json({ error: 'Valid recipient, positive amount, and description are required.' });
      return;
    }

    const recipients =
      targetType === 'class'
        ? envelope.db.students.filter(s => s.class === targetId)
        : envelope.db.students.filter(s => s.id === targetId);

    if (recipients.length === 0) {
      res.status(404).json({ error: 'No matching students found for invoice generation.' });
      return;
    }

    const created = recipients.map((student, idx) => ({
      id: `f${Date.now().toString(36)}${idx}`,
      invoiceNo: `INV-${new Date().getFullYear()}-${1000 + envelope.db.fees.length + idx + 1}`,
      studentId: student.id,
      category,
      amount,
      dueDate,
      status: 'Due' as FeeStatus,
      description,
    }));

    envelope.db.fees.unshift(...created);
    appendAudit(envelope.db, 'Admin', req.session!.actorName, 'ISSUED_FEE_INVOICE', `${created.length} invoice(s) · ${description}`);
    saveEnvelope(envelope);
    res.status(201).json({ fees: created });
  });

  app.post('/api/fees/:id/pay', requireAuth, requireRoles(['Admin', 'Parent']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const fee = envelope.db.fees.find(f => f.id === req.params.id);
    if (!fee) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }
    if (req.session!.role === 'Parent' && fee.studentId !== req.session!.studentId) {
      res.status(403).json({ error: 'You may only pay invoices linked to your ward.' });
      return;
    }
    if (fee.status === 'Paid') {
      res.json({ fee });
      return;
    }

    fee.status = 'Paid' as FeeStatus;
    fee.paidAt = new Date().toISOString().split('T')[0];
    fee.paymentRef = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    appendAudit(envelope.db, req.session!.role, req.session!.actorName, 'FEE_PAYMENT_RECORDED', `${fee.invoiceNo} (${fee.paymentRef})`);
    saveEnvelope(envelope);
    res.json({ fee });
  });

  // Timetable & Announcements
  app.post('/api/timetable', requireAuth, requireRoles(['Admin', 'Teacher']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const validDays = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    const day = validDays.has(req.body?.day) ? req.body.day : 'Monday';
    const startTime = sanitizeText(req.body?.startTime, 10);
    const endTime = sanitizeText(req.body?.endTime, 10);
    const subject = sanitizeText(req.body?.subject, 80);
    const className = sanitizeText(req.body?.className, 16);
    const teacherName = sanitizeText(req.body?.teacherName, 80) || req.session!.actorName;
    const room = sanitizeText(req.body?.room, 30) || 'Room 101';

    if (!startTime || !endTime || !subject || !className) {
      res.status(400).json({ error: 'Day, times, subject, and class are required.' });
      return;
    }

    const slot = {
      id: `tt${Date.now().toString(36)}`,
      day,
      startTime,
      endTime,
      subject,
      className,
      teacherName,
      room,
    };
    envelope.db.timetable.push(slot);
    appendAudit(envelope.db, req.session!.role, req.session!.actorName, 'ADDED_TIMETABLE_SLOT', `${className} · ${day} ${startTime}`);
    saveEnvelope(envelope);
    res.status(201).json({ slot });
  });

  app.delete('/api/timetable/:id', requireAuth, requireRoles(['Admin']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    envelope.db.timetable = envelope.db.timetable.filter(t => t.id !== req.params.id);
    saveEnvelope(envelope);
    res.json({ ok: true });
  });

  app.post('/api/announcements', requireAuth, requireRoles(['Admin', 'Teacher']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    const title = sanitizeText(req.body?.title, 120);
    const body = sanitizeText(req.body?.body, 1000);
    const audience = ['All', 'Parents', 'Students', 'Teachers'].includes(req.body?.audience) ? req.body.audience : 'All';
    const priority: 'Normal' | 'Urgent' = req.body?.priority === 'Urgent' ? 'Urgent' : 'Normal';

    if (!title || !body) {
      res.status(400).json({ error: 'Announcement title and message body are required.' });
      return;
    }

    const announcement = {
      id: `ann${Date.now().toString(36)}`,
      title,
      body,
      audience,
      author: req.session!.actorName,
      createdAt: new Date().toISOString().split('T')[0],
      priority,
    };
    envelope.db.announcements.unshift(announcement);
    appendAudit(envelope.db, req.session!.role, req.session!.actorName, 'POSTED_ANNOUNCEMENT', announcement.title);
    saveEnvelope(envelope);
    res.status(201).json({ announcement });
  });

  // White-label config import / demo reset (Admin only)
  app.post('/api/admin/import-config', requireAuth, requireRoles(['Admin']), (req: AuthedRequest, res) => {
    const envelope = loadEnvelope();
    if (!req.body?.branding) {
      res.status(400).json({ error: 'Invalid configuration JSON: missing branding object.' });
      return;
    }
    envelope.db.branding = sanitizeBranding(req.body.branding, envelope.db.branding);
    appendAudit(envelope.db, 'Admin', req.session!.actorName, 'IMPORTED_BRANDING_CONFIG', envelope.db.branding.schoolName);
    saveEnvelope(envelope);
    res.json({ branding: envelope.db.branding });
  });

  app.post('/api/admin/reset', requireAuth, requireRoles(['Admin']), (req: AuthedRequest, res) => {
    const preserveBranding = Boolean(req.body?.preserveBranding);
    const next = resetSchoolDatabase(preserveBranding);
    res.json({ db: next.db });
  });

  // Server-Side Gemini AI Analyst (Admin & Teacher only)
  app.post('/api/ai/query', requireAuth, requireRoles(['Admin', 'Teacher']), async (req: AuthedRequest, res) => {
    const query = sanitizeText(req.body?.query, 1000);
    if (!query) {
      res.status(400).json({ error: 'Please enter a question for the AI School Analyst.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add your GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const { db } = loadEnvelope();
    const today = new Date().toISOString().split('T')[0];

    const summaryContext = {
      school: {
        name: db.branding.schoolName,
        academicYear: db.branding.academicYear,
        currency: db.branding.currencySymbol,
      },
      today,
      students: db.students,
      teachers: db.teachers,
      recentAttendance: db.attendance.slice(0, 80),
      fees: db.fees,
      courses: db.courses.map(c => ({
        code: c.code,
        title: c.title,
        className: c.className,
        teacher: c.teacherName,
        lessonCount: c.lessons.length,
      })),
      assignments: db.assignments,
      submissions: db.submissions,
      quizResults: db.quizAttempts.map(a => {
        const quiz = db.quizzes.find(q => q.id === a.quizId);
        const student = db.students.find(s => s.id === a.studentId);
        return {
          quizTitle: quiz?.title,
          studentName: student?.name,
          score: a.score,
          maxScore: a.maxScore,
        };
      }),
      announcements: db.announcements,
    };

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze the live school & LMS database below and answer the administrator's question accurately.\nUse the currency symbol "${db.branding.currencySymbol}" for any monetary amounts.\nToday's date is ${today}.\n\nSCHOOL DATABASE:\n${JSON.stringify(summaryContext)}\n\nUSER QUESTION:\n"${query}"`,
        config: {
          systemInstruction:
            'You are an experienced school operations & LMS academic analyst. Provide crisp, accurate, actionable answers based strictly on the provided school data. Format lists cleanly with bullet points or numbered items and exact numbers.',
        },
      });

      const answer = response.text?.trim() || 'No response generated.';
      res.json({ answer });
    } catch (error: any) {
      console.error('Gemini API error:', error);
      const status = typeof error?.status === 'number' ? error.status : 500;
      const message =
        status === 403 || status === 400
          ? 'Gemini API rejected the request. Please verify your GEMINI_API_KEY in Settings > Secrets.'
          : status === 429
          ? 'Gemini API rate limit reached. Please try again in a moment.'
          : 'Unable to reach Gemini AI service right now. Please try again.';
      res.status(status >= 400 && status < 600 ? status : 502).json({ error: message });
    }
  });

  // Frontend Serving: Vite middleware in dev, dist/ static in production
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
