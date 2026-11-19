import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, FileCheck, Plus, Award, Send } from 'lucide-react';
import {
  UserRole,
  type Assignment,
  type AuthSession,
  type Quiz,
  type QuizAttempt,
  type SchoolDatabase,
} from '../types';
import Card from './ui/Card';

interface AssessmentsViewProps {
  session: AuthSession;
  db: SchoolDatabase;
  onCreateAssignment: (payload: {
    courseId: string;
    title: string;
    className: string;
    dueDate: string;
    maxMarks: number;
    instructions: string;
  }) => Promise<void>;
  onSubmitAssignment: (assignmentId: string, content: string, attachmentName: string) => Promise<void>;
  onGradeSubmission: (submissionId: string, score: number, feedback: string) => Promise<void>;
  onCreateQuiz: (payload: {
    courseId: string;
    title: string;
    className: string;
    durationMinutes: number;
    dueDate: string;
    questions: Array<{ prompt: string; options: string[]; correctIndex: number; points: number }>;
  }) => Promise<void>;
  onSubmitQuizAttempt: (quizId: string, answers: number[]) => Promise<QuizAttempt>;
}

const AssessmentsView: React.FC<AssessmentsViewProps> = ({
  session,
  db,
  onCreateAssignment,
  onSubmitAssignment,
  onGradeSubmission,
  onCreateQuiz,
  onSubmitQuizAttempt,
}) => {
  const [tab, setTab] = useState<'assignments' | 'quizzes'>('assignments');
  const canAuthor = session.role === UserRole.Admin || session.role === UserRole.Teacher;
  const isStudent = session.role === UserRole.Student;
  const studentId = session.studentId || 's1';

  // Assignment modals
  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    courseId: db.courses[0]?.id || '',
    title: '',
    className: '5A',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    maxMarks: 25,
    instructions: '',
  });

  const [submitModalAssignment, setSubmitModalAssignment] = useState<Assignment | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [submitFile, setSubmitFile] = useState('');

  const [gradeModalSubId, setGradeModalSubId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState(20);
  const [gradeFeedback, setGradeFeedback] = useState('');

  // Quiz runner & creator
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [quizResult, setQuizResult] = useState<QuizAttempt | null>(null);

  const [showNewQuiz, setShowNewQuiz] = useState(false);
  const [quizForm, setQuizForm] = useState({
    courseId: db.courses[0]?.id || '',
    title: '',
    className: '5A',
    durationMinutes: 10,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    prompt: '',
    optA: '',
    optB: '',
    optC: '',
    optD: '',
    correctIndex: 0,
    points: 5,
  });
  const [saving, setSaving] = useState(false);

  // Live Quiz Countdown
  useEffect(() => {
    if (!activeQuiz || quizResult) return;
    const timer = window.setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeQuiz, quizResult]);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setQuizAnswers(new Array(quiz.questions.length).fill(-1));
    setSecondsLeft(quiz.durationMinutes * 60);
    setQuizResult(null);
  };

  const handleFinishQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;
    setSaving(true);
    try {
      const attempt = await onSubmitQuizAttempt(activeQuiz.id, quizAnswers);
      setQuizResult(attempt);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreateAssignment(assignmentForm);
      setShowNewAssignment(false);
      setAssignmentForm({ ...assignmentForm, title: '', instructions: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModalAssignment) return;
    setSaving(true);
    try {
      await onSubmitAssignment(
        submitModalAssignment.id,
        submitText,
        submitFile || 'homework_submission.pdf'
      );
      setSubmitModalAssignment(null);
      setSubmitText('');
      setSubmitFile('');
    } finally {
      setSaving(false);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeModalSubId) return;
    setSaving(true);
    try {
      await onGradeSubmission(gradeModalSubId, gradeScore, gradeFeedback);
      setGradeModalSubId(null);
      setGradeFeedback('');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreateQuiz({
        courseId: quizForm.courseId,
        title: quizForm.title,
        className: quizForm.className,
        durationMinutes: quizForm.durationMinutes,
        dueDate: quizForm.dueDate,
        questions: [
          {
            prompt: quizForm.prompt,
            options: [quizForm.optA, quizForm.optB, quizForm.optC, quizForm.optD].filter(Boolean),
            correctIndex: quizForm.correctIndex,
            points: quizForm.points,
          },
        ],
      });
      setShowNewQuiz(false);
      setQuizForm({
        ...quizForm,
        title: '',
        prompt: '',
        optA: '',
        optB: '',
        optC: '',
        optD: '',
      });
    } finally {
      setSaving(false);
    }
  };

  // Interactive Timed Quiz View
  if (activeQuiz) {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card
          title={activeQuiz.title}
          subtitle={`Class ${activeQuiz.className} · ${activeQuiz.questions.length} questions`}
          action={
            <div className="flex items-center gap-3">
              {!quizResult && (
                <span className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                  <Clock className="w-4 h-4" />
                  {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </span>
              )}
              <button
                type="button"
                onClick={() => setActiveQuiz(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Exit Quiz
              </button>
            </div>
          }
        >
          {quizResult ? (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                      Assessment Graded Automatically
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Submitted on {quizResult.submittedAt}
                    </p>
                  </div>
                </div>
                <p className="text-3xl font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {quizResult.score} / {quizResult.maxScore}
                </p>
              </div>

              <div className="space-y-4">
                {activeQuiz.questions.map((q, idx) => {
                  const chosen = quizResult.answers[idx];
                  const isCorrect = chosen === q.correctIndex;
                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {idx + 1}. {q.prompt}
                        </p>
                        <span
                          className={`text-xs font-semibold shrink-0 ${
                            isCorrect ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {isCorrect ? `+${q.points} pts` : '0 pts'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        Your answer: {chosen >= 0 ? q.options[chosen] : 'Unanswered'} · Correct answer:{' '}
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {q.options[q.correctIndex]}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleFinishQuiz} className="space-y-6">
              {activeQuiz.questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {qIdx + 1}. {q.prompt}
                    </p>
                    <span className="text-xs font-mono text-slate-500 shrink-0">{q.points} pts</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const selected = quizAnswers[qIdx] === optIdx;
                      return (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-2.5 p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                            selected
                              ? 'brand-soft-bg border-[var(--brand-primary)] font-medium'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`quiz-q-${q.id}`}
                            checked={selected}
                            onChange={() => {
                              const next = [...quizAnswers];
                              next[qIdx] = optIdx;
                              setQuizAnswers(next);
                            }}
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Submitting...' : 'Submit & Grade Quiz'}
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTab('assignments')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'assignments'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Assignments ({db.assignments.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('quizzes')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'quizzes'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Quizzes &amp; Exams ({db.quizzes.length})
          </button>
        </div>

        {canAuthor && (
          <button
            type="button"
            onClick={() => (tab === 'assignments' ? setShowNewAssignment(true) : setShowNewQuiz(true))}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{tab === 'assignments' ? 'Create Assignment' : 'Create Quiz'}</span>
          </button>
        )}
      </div>

      {/* Assignments Tab */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          {db.assignments.map(assignment => {
            const course = db.courses.find(c => c.id === assignment.courseId);
            const subs = db.submissions.filter(s => s.assignmentId === assignment.id);
            const mySub = subs.find(s => s.studentId === studentId);

            return (
              <Card
                key={assignment.id}
                title={assignment.title}
                subtitle={`${course?.code || 'COURSE'} · Class ${assignment.className} · Max ${assignment.maxMarks} marks · Due ${assignment.dueDate}`}
                action={
                  isStudent ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitModalAssignment(assignment);
                        setSubmitText(mySub?.content || '');
                        setSubmitFile(mySub?.attachmentName || '');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{mySub ? 'Update Submission' : 'Submit Work'}</span>
                    </button>
                  ) : null
                }
              >
                <p className="text-sm text-slate-700 dark:text-slate-300">{assignment.instructions}</p>

                {/* Student / Parent view of own submission */}
                {!canAuthor && mySub && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Submission Status: {mySub.status} · File: {mySub.attachmentName}
                      </p>
                      {mySub.feedback && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Instructor Feedback: {mySub.feedback}
                        </p>
                      )}
                    </div>
                    {mySub.status === 'Graded' && (
                      <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Score: {mySub.score}/{assignment.maxMarks}
                      </span>
                    )}
                  </div>
                )}

                {/* Teacher / Admin grading queue */}
                {canAuthor && (
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                      Student Submissions ({subs.length})
                    </p>
                    {subs.length === 0 ? (
                      <p className="text-xs text-slate-400">No student submissions yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {subs.map(sub => {
                          const st = db.students.find(s => s.id === sub.studentId);
                          return (
                            <div
                              key={sub.id}
                              className="py-3 flex flex-wrap items-center justify-between gap-4"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {st?.name || sub.studentId} ·{' '}
                                  <span className="font-mono text-xs text-slate-500">
                                    {sub.attachmentName}
                                  </span>
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                                  {sub.content}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {sub.status === 'Graded' ? (
                                  <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                    {sub.score}/{assignment.maxMarks}
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-amber-600">Pending</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGradeModalSubId(sub.id);
                                    setGradeScore(sub.score ?? assignment.maxMarks);
                                    setGradeFeedback(sub.feedback || '');
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  {sub.status === 'Graded' ? 'Edit Grade' : 'Grade'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Quizzes Tab */}
      {tab === 'quizzes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {db.quizzes.map(quiz => {
            const course = db.courses.find(c => c.id === quiz.courseId);
            const attempts = db.quizAttempts.filter(a => a.quizId === quiz.id);
            const myAttempt = attempts.find(a => a.studentId === studentId);

            return (
              <Card
                key={quiz.id}
                title={quiz.title}
                subtitle={`${course?.code || 'LMS'} · Class ${quiz.className} · ${quiz.durationMinutes} min · ${quiz.questions.length} questions`}
                action={
                  isStudent ? (
                    <button
                      type="button"
                      onClick={() => startQuiz(quiz)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer whitespace-nowrap"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>{myAttempt ? 'Retake Quiz' : 'Start Quiz'}</span>
                    </button>
                  ) : null
                }
              >
                {myAttempt && !canAuthor && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Completed {myAttempt.submittedAt}
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                      {myAttempt.score} / {myAttempt.maxScore}
                    </span>
                  </div>
                )}

                {canAuthor && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Recent Attempts ({attempts.length})
                    </p>
                    {attempts.length === 0 ? (
                      <p className="text-xs text-slate-400">No attempts recorded yet.</p>
                    ) : (
                      attempts.map(att => {
                        const st = db.students.find(s => s.id === att.studentId);
                        return (
                          <div
                            key={att.id}
                            className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {st?.name || att.studentId}
                            </span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {att.score}/{att.maxScore}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Submit Work Modal */}
      {submitModalAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Submit: {submitModalAssignment.title}
            </h3>
            <form onSubmit={handleStudentSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Written Response
                </label>
                <textarea
                  required
                  rows={5}
                  value={submitText}
                  onChange={e => setSubmitText(e.target.value)}
                  placeholder="Write your solution or analysis..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Attachment Filename
                </label>
                <input
                  value={submitFile}
                  onChange={e => setSubmitFile(e.target.value)}
                  placeholder="e.g. lab_report.pdf"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitModalAssignment(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Submitting...' : 'Submit Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade Submission Modal */}
      {gradeModalSubId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Grade Submission</h3>
            <form onSubmit={handleGradeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Numeric Score
                </label>
                <input
                  type="number"
                  min={0}
                  value={gradeScore}
                  onChange={e => setGradeScore(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Instructor Feedback
                </label>
                <textarea
                  rows={3}
                  value={gradeFeedback}
                  onChange={e => setGradeFeedback(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGradeModalSubId(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Publish Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Assignment Modal */}
      {showNewAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">New Assignment</h3>
            <form onSubmit={handleCreateAssignmentSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Course
                </label>
                <select
                  value={assignmentForm.courseId}
                  onChange={e => setAssignmentForm({ ...assignmentForm, courseId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {db.courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Title
                </label>
                <input
                  required
                  value={assignmentForm.title}
                  onChange={e => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Class
                  </label>
                  <input
                    required
                    value={assignmentForm.className}
                    onChange={e => setAssignmentForm({ ...assignmentForm, className: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={assignmentForm.dueDate}
                    onChange={e => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={assignmentForm.maxMarks}
                    onChange={e =>
                      setAssignmentForm({ ...assignmentForm, maxMarks: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Instructions
                </label>
                <textarea
                  required
                  rows={3}
                  value={assignmentForm.instructions}
                  onChange={e =>
                    setAssignmentForm({ ...assignmentForm, instructions: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewAssignment(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Posting...' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Quiz Modal */}
      {showNewQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 my-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Create Auto-Graded Quiz
            </h3>
            <form onSubmit={handleCreateQuizSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Course
                  </label>
                  <select
                    value={quizForm.courseId}
                    onChange={e => setQuizForm({ ...quizForm, courseId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {db.courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Class
                  </label>
                  <input
                    required
                    value={quizForm.className}
                    onChange={e => setQuizForm({ ...quizForm, className: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Quiz Title
                  </label>
                  <input
                    required
                    value={quizForm.title}
                    onChange={e => setQuizForm({ ...quizForm, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min={3}
                    value={quizForm.durationMinutes}
                    onChange={e => setQuizForm({ ...quizForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Question Prompt
                </label>
                <input
                  required
                  value={quizForm.prompt}
                  onChange={e => setQuizForm({ ...quizForm, prompt: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="Option A"
                  value={quizForm.optA}
                  onChange={e => setQuizForm({ ...quizForm, optA: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  required
                  placeholder="Option B"
                  value={quizForm.optB}
                  onChange={e => setQuizForm({ ...quizForm, optB: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  placeholder="Option C"
                  value={quizForm.optC}
                  onChange={e => setQuizForm({ ...quizForm, optC: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  placeholder="Option D"
                  value={quizForm.optD}
                  onChange={e => setQuizForm({ ...quizForm, optD: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Correct Option
                  </label>
                  <select
                    value={quizForm.correctIndex}
                    onChange={e => setQuizForm({ ...quizForm, correctIndex: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value={0}>Option A</option>
                    <option value={1}>Option B</option>
                    <option value={2}>Option C</option>
                    <option value={3}>Option D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quizForm.points}
                    onChange={e => setQuizForm({ ...quizForm, points: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewQuiz(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Publishing...' : 'Publish Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentsView;
