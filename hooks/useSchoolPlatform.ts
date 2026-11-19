import { useState, useEffect, useCallback } from 'react';
import type {
  AttendanceStatus,
  AuthSession,
  PublicPortalBootstrap,
  SchoolBranding,
  SchoolDatabase,
  UserRole,
} from '../types';
import { apiRequest, getStoredToken, setStoredToken } from '../services/apiClient';
import { applyBrandingToDocument } from '../utils/brandingEngine';

export function useSchoolPlatform() {
  const [bootstrap, setBootstrap] = useState<PublicPortalBootstrap | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [db, setDb] = useState<SchoolDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBootstrap = useCallback(async () => {
    const data = await apiRequest<PublicPortalBootstrap>('/api/public/bootstrap');
    setBootstrap(data);
    applyBrandingToDocument(data.branding);
    return data;
  }, []);

  const refreshSchoolData = useCallback(async () => {
    const data = await apiRequest<SchoolDatabase>('/api/school/data');
    setDb(data);
    applyBrandingToDocument(data.branding);
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadBootstrap();
        const token = getStoredToken();
        if (token) {
          try {
            const res = await apiRequest<{ session: Omit<AuthSession, 'token'> }>('/api/auth/session');
            if (active) {
              setSession({ ...res.session, token });
              await refreshSchoolData();
            }
          } catch {
            setStoredToken(null);
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Unable to connect to school server.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadBootstrap, refreshSchoolData]);

  const login = useCallback(
    async (params: { role: UserRole; passcode?: string; actorId?: string }) => {
      const res = await apiRequest<{ session: AuthSession }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      setStoredToken(res.session.token);
      setSession(res.session);
      await refreshSchoolData();
      return res.session;
    },
    [refreshSchoolData]
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear local session regardless
    }
    setStoredToken(null);
    setSession(null);
    setDb(null);
    await loadBootstrap();
  }, [loadBootstrap]);

  const updateBranding = useCallback(
    async (branding: Partial<SchoolBranding>) => {
      const res = await apiRequest<{ branding: SchoolBranding }>('/api/branding', {
        method: 'PUT',
        body: JSON.stringify(branding),
      });
      applyBrandingToDocument(res.branding);
      await refreshSchoolData();
      await loadBootstrap();
      return res.branding;
    },
    [refreshSchoolData, loadBootstrap]
  );

  const changeAdminPasscode = useCallback(async (currentPasscode: string, newPasscode: string) => {
    await apiRequest('/api/security/change-passcode', {
      method: 'POST',
      body: JSON.stringify({ currentPasscode, newPasscode }),
    });
    await refreshSchoolData();
  }, [refreshSchoolData]);

  const enrollStudent = useCallback(
    async (payload: {
      name: string;
      grade: number;
      className: string;
      guardianName: string;
      guardianPhone: string;
      guardianEmail: string;
    }) => {
      await apiRequest('/api/students', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const addTeacher = useCallback(
    async (payload: {
      name: string;
      email: string;
      subjectSpecialty: string;
      assignedClasses: string[];
      qualification: string;
    }) => {
      await apiRequest('/api/teachers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const markAttendance = useCallback(
    async (entries: Array<{ studentId: string; date: string; status: AttendanceStatus }>) => {
      await apiRequest('/api/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ entries }),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const createCourse = useCallback(
    async (payload: {
      code: string;
      title: string;
      className: string;
      category: string;
      description: string;
      coverKey: 'science' | 'cs' | 'math' | 'campus';
    }) => {
      await apiRequest('/api/courses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const addLesson = useCallback(
    async (
      courseId: string,
      payload: {
        title: string;
        durationMinutes: number;
        type: 'Reading' | 'Video' | 'Lab';
        summary: string;
        content: string;
        resourceLabel: string;
      }
    ) => {
      await apiRequest(`/api/courses/${courseId}/lessons`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const toggleLessonComplete = useCallback(
    async (courseId: string, lessonId: string) => {
      await apiRequest(`/api/courses/${courseId}/lessons/${lessonId}/toggle-complete`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const createAssignment = useCallback(
    async (payload: {
      courseId: string;
      title: string;
      className: string;
      dueDate: string;
      maxMarks: number;
      instructions: string;
    }) => {
      await apiRequest('/api/assignments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const submitAssignment = useCallback(
    async (assignmentId: string, content: string, attachmentName: string) => {
      await apiRequest(`/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ content, attachmentName }),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const gradeSubmission = useCallback(
    async (submissionId: string, score: number, feedback: string) => {
      await apiRequest(`/api/submissions/${submissionId}/grade`, {
        method: 'POST',
        body: JSON.stringify({ score, feedback }),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const createQuiz = useCallback(
    async (payload: {
      courseId: string;
      title: string;
      className: string;
      durationMinutes: number;
      dueDate: string;
      questions: Array<{ prompt: string; options: string[]; correctIndex: number; points: number }>;
    }) => {
      await apiRequest('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const submitQuizAttempt = useCallback(
    async (quizId: string, answers: number[]) => {
      const res = await apiRequest<{ attempt: any }>(`/api/quizzes/${quizId}/attempt`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      await refreshSchoolData();
      return res.attempt;
    },
    [refreshSchoolData]
  );

  const createFeeInvoice = useCallback(
    async (payload: {
      targetType: 'student' | 'class';
      targetId: string;
      category: 'Tuition' | 'Lab' | 'Exam' | 'Transport' | 'Library';
      amount: number;
      dueDate: string;
      description: string;
    }) => {
      await apiRequest('/api/fees', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const payFee = useCallback(
    async (feeId: string) => {
      await apiRequest(`/api/fees/${feeId}/pay`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const addTimetableSlot = useCallback(
    async (payload: {
      day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
      startTime: string;
      endTime: string;
      subject: string;
      className: string;
      teacherName: string;
      room: string;
    }) => {
      await apiRequest('/api/timetable', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const deleteTimetableSlot = useCallback(
    async (slotId: string) => {
      await apiRequest(`/api/timetable/${slotId}`, {
        method: 'DELETE',
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const postAnnouncement = useCallback(
    async (payload: {
      title: string;
      body: string;
      audience: 'All' | 'Parents' | 'Students' | 'Teachers';
      priority: 'Normal' | 'Urgent';
    }) => {
      await apiRequest('/api/announcements', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshSchoolData();
    },
    [refreshSchoolData]
  );

  const importConfig = useCallback(
    async (branding: SchoolBranding) => {
      await apiRequest('/api/admin/import-config', {
        method: 'POST',
        body: JSON.stringify({ branding }),
      });
      await refreshSchoolData();
      await loadBootstrap();
    },
    [refreshSchoolData, loadBootstrap]
  );

  const resetDemoDatabase = useCallback(
    async (preserveBranding: boolean) => {
      await apiRequest('/api/admin/reset', {
        method: 'POST',
        body: JSON.stringify({ preserveBranding }),
      });
      await refreshSchoolData();
      await loadBootstrap();
    },
    [refreshSchoolData, loadBootstrap]
  );

  return {
    bootstrap,
    session,
    db,
    loading,
    error,
    login,
    logout,
    refreshSchoolData,
    updateBranding,
    changeAdminPasscode,
    enrollStudent,
    addTeacher,
    markAttendance,
    createCourse,
    addLesson,
    toggleLessonComplete,
    createAssignment,
    submitAssignment,
    gradeSubmission,
    createQuiz,
    submitQuizAttempt,
    createFeeInvoice,
    payFee,
    addTimetableSlot,
    deleteTimetableSlot,
    postAnnouncement,
    importConfig,
    resetDemoDatabase,
  };
}
