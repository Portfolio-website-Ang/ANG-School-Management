import React, { useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { UserRole, type AuthSession, type SchoolDatabase } from '../types';
import Card from './ui/Card';

interface ScheduleViewProps {
  session: AuthSession;
  db: SchoolDatabase;
  onAddTimetableSlot: (payload: {
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
    startTime: string;
    endTime: string;
    subject: string;
    className: string;
    teacherName: string;
    room: string;
  }) => Promise<void>;
  onDeleteTimetableSlot: (slotId: string) => Promise<void>;
  onPostAnnouncement: (payload: {
    title: string;
    body: string;
    audience: 'All' | 'Parents' | 'Students' | 'Teachers';
    priority: 'Normal' | 'Urgent';
  }) => Promise<void>;
}

const DAYS: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'> = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

const ScheduleView: React.FC<ScheduleViewProps> = ({
  session,
  db,
  onAddTimetableSlot,
  onDeleteTimetableSlot,
  onPostAnnouncement,
}) => {
  const [classFilter, setClassFilter] = useState('All');
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [showAddNotice, setShowAddNotice] = useState(false);
  const [saving, setSaving] = useState(false);

  const [slotForm, setSlotForm] = useState({
    day: 'Monday' as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday',
    startTime: '08:30',
    endTime: '09:15',
    subject: '',
    className: '5A',
    teacherName: db.teachers[0]?.name || '',
    room: 'Room 102',
  });

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    body: '',
    audience: 'All' as 'All' | 'Parents' | 'Students' | 'Teachers',
    priority: 'Normal' as 'Normal' | 'Urgent',
  });

  const canManage = session.role === UserRole.Admin || session.role === UserRole.Teacher;
  const isAdmin = session.role === UserRole.Admin;
  const classes = ['All', ...Array.from(new Set(db.timetable.map(t => t.className))).sort()];

  const visibleSlots = db.timetable.filter(
    t => classFilter === 'All' || t.className === classFilter
  );

  const handleAddSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onAddTimetableSlot(slotForm);
      setShowAddSlot(false);
      setSlotForm({ ...slotForm, subject: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onPostAnnouncement(noticeForm);
      setShowAddNotice(false);
      setNoticeForm({ title: '', body: '', audience: 'All', priority: 'Normal' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Timetable Section */}
      <Card
        title="Weekly Class Timetable"
        subtitle="Monday through Friday instructional schedule"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              {classes.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassFilter(c)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    classFilter === c
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {c === 'All' ? 'All Classes' : `Class ${c}`}
                </button>
              ))}
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowAddSlot(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Period</span>
              </button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {DAYS.map(day => {
            const daySlots = visibleSlots
              .filter(s => s.day === day)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div
                key={day}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-800">
                  {day}
                </p>
                {daySlots.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No scheduled periods</p>
                ) : (
                  daySlots.map(slot => (
                    <div
                      key={slot.id}
                      className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          {slot.startTime}–{slot.endTime}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => onDeleteTimetableSlot(slot.id)}
                            className="text-slate-400 hover:text-red-500 cursor-pointer"
                            aria-label="Delete slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {slot.subject}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Class {slot.className} · {slot.room}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {slot.teacherName}
                      </p>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Notice Board */}
      <Card
        title="Campus Notice Board"
        subtitle="Official announcements and circulars"
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => setShowAddNotice(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer whitespace-nowrap"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Post Notice</span>
            </button>
          ) : null
        }
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {db.announcements.map(ann => (
            <div key={ann.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Audience: <strong className="text-slate-700 dark:text-slate-200">{ann.audience}</strong> ·
                  Posted by {ann.author}
                  {ann.priority === 'Urgent' ? ' · Urgent' : ''}
                </span>
                <span className="font-mono">{ann.createdAt}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                {ann.title}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{ann.body}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Timetable Slot Modal */}
      {showAddSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Add Timetable Period
            </h3>
            <form onSubmit={handleAddSlotSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Day
                  </label>
                  <select
                    value={slotForm.day}
                    onChange={e => setSlotForm({ ...slotForm, day: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {DAYS.map(d => (
                      <option key={d} value={d}>
                        {d}
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
                    value={slotForm.className}
                    onChange={e => setSlotForm({ ...slotForm, className: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={slotForm.startTime}
                    onChange={e => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={slotForm.endTime}
                    onChange={e => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Subject
                </label>
                <input
                  required
                  value={slotForm.subject}
                  onChange={e => setSlotForm({ ...slotForm, subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Teacher
                  </label>
                  <input
                    value={slotForm.teacherName}
                    onChange={e => setSlotForm({ ...slotForm, teacherName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Room
                  </label>
                  <input
                    value={slotForm.room}
                    onChange={e => setSlotForm({ ...slotForm, room: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSlot(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Adding...' : 'Save Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Notice Modal */}
      {showAddNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Post Campus Announcement
            </h3>
            <form onSubmit={handleNoticeSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Title
                </label>
                <input
                  required
                  value={noticeForm.title}
                  onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Audience
                  </label>
                  <select
                    value={noticeForm.audience}
                    onChange={e => setNoticeForm({ ...noticeForm, audience: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="All">All Campus</option>
                    <option value="Parents">Parents</option>
                    <option value="Students">Students</option>
                    <option value="Teachers">Teachers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={noticeForm.priority}
                    onChange={e => setNoticeForm({ ...noticeForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={noticeForm.body}
                  onChange={e => setNoticeForm({ ...noticeForm, body: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNotice(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Posting...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
