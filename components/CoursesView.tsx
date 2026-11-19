import React, { useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Clock, FileText, PlayCircle, Plus, FlaskConical, Search } from 'lucide-react';
import { UserRole, type AuthSession, type Course, type Lesson, type SchoolDatabase } from '../types';
import { MEDIA_ASSETS } from '../utils/mediaAssets';
import Card from './ui/Card';

interface CoursesViewProps {
  session: AuthSession;
  db: SchoolDatabase;
  onCreateCourse: (payload: {
    code: string;
    title: string;
    className: string;
    category: string;
    description: string;
    coverKey: 'science' | 'cs' | 'math' | 'campus';
  }) => Promise<void>;
  onAddLesson: (
    courseId: string,
    payload: {
      title: string;
      durationMinutes: number;
      type: 'Reading' | 'Video' | 'Lab';
      summary: string;
      content: string;
      resourceLabel: string;
    }
  ) => Promise<void>;
  onToggleLessonComplete: (courseId: string, lessonId: string) => Promise<void>;
}

const CoursesView: React.FC<CoursesViewProps> = ({
  session,
  db,
  onCreateCourse,
  onAddLesson,
  onToggleLessonComplete,
}) => {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [failedCovers, setFailedCovers] = useState<Record<string, boolean>>({});
  const [lmsLogoFailed, setLmsLogoFailed] = useState(false);

  // Modals
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({
    code: '',
    title: '',
    className: '5A',
    category: 'Natural Sciences',
    description: '',
    coverKey: 'science' as 'science' | 'cs' | 'math' | 'campus',
  });
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    durationMinutes: 25,
    type: 'Reading' as 'Reading' | 'Video' | 'Lab',
    summary: '',
    content: '',
    resourceLabel: '',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canAuthor = session.role === UserRole.Admin || session.role === UserRole.Teacher;
  const studentId = session.studentId || 's1';
  const classes = ['All', ...Array.from(new Set(db.courses.map(c => c.className)))];

  const filteredCourses = db.courses.filter(c => {
    if (classFilter !== 'All' && c.className !== classFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.teacherName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCourse: Course | undefined = db.courses.find(c => c.id === activeCourseId);
  const activeLesson: Lesson | undefined =
    activeCourse?.lessons.find(l => l.id === activeLessonId) || activeCourse?.lessons[0];

  const handleOpenCourse = (course: Course) => {
    setActiveCourseId(course.id);
    setActiveLessonId(course.lessons[0]?.id || null);
    setFeedback(null);
  };

  const handleCreateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await onCreateCourse(courseForm);
      setShowCreateCourse(false);
      setCourseForm({
        code: '',
        title: '',
        className: '5A',
        category: 'Natural Sciences',
        description: '',
        coverKey: 'science',
      });
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to create course.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse) return;
    setSaving(true);
    setFeedback(null);
    try {
      await onAddLesson(activeCourse.id, lessonForm);
      setShowAddLesson(false);
      setLessonForm({
        title: '',
        durationMinutes: 25,
        type: 'Reading',
        summary: '',
        content: '',
        resourceLabel: '',
      });
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to add lesson.');
    } finally {
      setSaving(false);
    }
  };

  // Interactive Course Player View
  if (activeCourse) {
    const completedCount = activeCourse.lessons.filter(l =>
      l.completedByStudentIds.includes(studentId)
    ).length;
    const progressPct =
      activeCourse.lessons.length > 0
        ? Math.round((completedCount / activeCourse.lessons.length) * 100)
        : 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setActiveCourseId(null)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Course Catalog</span>
          </button>

          {canAuthor && (
            <button
              type="button"
              onClick={() => setShowAddLesson(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Lesson Module</span>
            </button>
          )}
        </div>

        {/* Course Header */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {activeCourse.code} · Class {activeCourse.className} · {activeCourse.teacherName}
              </p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {activeCourse.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                {activeCourse.description}
              </p>
            </div>
            <div className="w-full sm:w-60">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  Course Completion
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {progressPct}%
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full brand-bg rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </Card>

        {/* Two-Zone Classroom Stage + Syllabus */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activeLesson ? (
              <Card
                title={activeLesson.title}
                subtitle={`${activeLesson.type} · ${activeLesson.durationMinutes} min · Resource: ${activeLesson.resourceLabel}`}
                action={
                  <button
                    type="button"
                    onClick={() => onToggleLessonComplete(activeCourse.id, activeLesson.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activeLesson.completedByStudentIds.includes(studentId)
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {activeLesson.completedByStudentIds.includes(studentId)
                        ? 'Completed'
                        : 'Mark Complete'}
                    </span>
                  </button>
                }
              >
                <div className="space-y-5">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Lesson Objective
                    </p>
                    <p className="text-sm text-slate-800 dark:text-slate-200">{activeLesson.summary}</p>
                  </div>

                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                      {activeLesson.content}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <FileText className="w-4 h-4" />
                      <span>Attached Study Material: {activeLesson.resourceLabel}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Module {activeCourse.lessons.findIndex(l => l.id === activeLesson.id) + 1} of{' '}
                      {activeCourse.lessons.length}
                    </span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-sm text-slate-500 py-8 text-center">
                  No lessons added to this course yet.
                </p>
              </Card>
            )}
          </div>

          {/* Syllabus List */}
          <Card title="Course Syllabus" subtitle={`${activeCourse.lessons.length} lessons`}>
            <div className="space-y-2">
              {activeCourse.lessons.map((lesson, idx) => {
                const isSelected = activeLesson?.id === lesson.id;
                const done = lesson.completedByStudentIds.includes(studentId);
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setActiveLessonId(lesson.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'brand-soft-bg border-[var(--brand-primary)]'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-xs font-mono text-slate-400 mt-0.5">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {lesson.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                            {lesson.type === 'Video' ? (
                              <PlayCircle className="w-3.5 h-3.5" />
                            ) : lesson.type === 'Lab' ? (
                              <FlaskConical className="w-3.5 h-3.5" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5" />
                            )}
                            <span>{lesson.type}</span>
                            <span aria-hidden="true">·</span>
                            <Clock className="w-3 h-3" />
                            <span>{lesson.durationMinutes}m</span>
                          </p>
                        </div>
                      </div>
                      {done && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Add Lesson Modal */}
        {showAddLesson && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Add Lesson to {activeCourse.code}
              </h3>
              <form onSubmit={handleAddLessonSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Lesson Title
                  </label>
                  <input
                    required
                    value={lessonForm.title}
                    onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Format
                    </label>
                    <select
                      value={lessonForm.type}
                      onChange={e => setLessonForm({ ...lessonForm, type: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="Reading">Reading</option>
                      <option value="Video">Video</option>
                      <option value="Lab">Lab</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={lessonForm.durationMinutes}
                      onChange={e =>
                        setLessonForm({ ...lessonForm, durationMinutes: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Summary Objective
                  </label>
                  <input
                    required
                    value={lessonForm.summary}
                    onChange={e => setLessonForm({ ...lessonForm, summary: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Lesson Notes &amp; Material Content
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={lessonForm.content}
                    onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Resource File Label
                  </label>
                  <input
                    placeholder="e.g. Chapter_3_Notes.pdf"
                    value={lessonForm.resourceLabel}
                    onChange={e => setLessonForm({ ...lessonForm, resourceLabel: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                {feedback && <p className="text-xs text-red-600">{feedback}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLesson(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Save Lesson'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Catalog Grid View
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 min-w-0">
          {!lmsLogoFailed && (
            <div className="bg-white rounded-lg px-3 py-1.5 border border-slate-200 shrink-0">
              <img
                src="/assets/branding/ang-lms-logo.png"
                alt="School LMS by ANG"
                referrerPolicy="no-referrer"
                onError={() => setLmsLogoFailed(true)}
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Course Catalog &amp; Curriculum
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Interactive lessons, guided lab modules, and self-paced reading materials
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {db.courses.length} Active Courses
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search courses, codes, instructors..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            {classes.map(cls => (
              <button
                key={cls}
                type="button"
                onClick={() => setClassFilter(cls)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  classFilter === cls
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {cls === 'All' ? 'All Classes' : `Class ${cls}`}
              </button>
            ))}
          </div>
        </div>

        {canAuthor && (
          <button
            type="button"
            onClick={() => setShowCreateCourse(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        )}
      </div>

      {filteredCourses.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 text-center py-8">
            No courses match your filter criteria.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => {
            const done = course.lessons.filter(l => l.completedByStudentIds.includes(studentId)).length;
            const total = course.lessons.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <article
                key={course.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                  {!failedCovers[course.id] ? (
                    <img
                      src={MEDIA_ASSETS[course.coverKey]}
                      alt={course.title}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedCovers(prev => ({ ...prev, [course.id]: true }))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-500">
                      <BookOpen className="w-8 h-8 mb-2" />
                      <span className="text-xs font-mono">{course.code}</span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {course.code} · Class {course.className} · {course.category}
                    </p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{course.teacherName}</span>
                      <span className="font-mono tabular-nums">
                        {done}/{total} lessons
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full brand-bg rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenCourse(course)}
                      className="w-full py-2 px-4 text-xs font-semibold rounded-lg text-white brand-bg transition-colors cursor-pointer"
                    >
                      Open Classroom
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateCourse && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create LMS Course</h3>
            <form onSubmit={handleCreateCourseSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Course Code
                  </label>
                  <input
                    required
                    placeholder="e.g. ENG-502"
                    value={courseForm.code}
                    onChange={e => setCourseForm({ ...courseForm, code: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Class
                  </label>
                  <input
                    required
                    value={courseForm.className}
                    onChange={e => setCourseForm({ ...courseForm, className: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Course Title
                </label>
                <input
                  required
                  value={courseForm.title}
                  onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Department / Category
                  </label>
                  <input
                    value={courseForm.category}
                    onChange={e => setCourseForm({ ...courseForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Cover Art Theme
                  </label>
                  <select
                    value={courseForm.coverKey}
                    onChange={e => setCourseForm({ ...courseForm, coverKey: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="science">Science &amp; Optics</option>
                    <option value="cs">Computer Science</option>
                    <option value="math">Mathematics &amp; Geometry</option>
                    <option value="campus">General Studies</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={courseForm.description}
                  onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              {feedback && <p className="text-xs text-red-600">{feedback}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCourse(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesView;
