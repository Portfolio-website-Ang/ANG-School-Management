import React, { useState, useEffect } from 'react';
import { Download, Lock, RefreshCw, Upload, Check, Building2, Shield } from 'lucide-react';
import type { CrestStyle, FontPairing, SchoolBranding, SchoolDatabase } from '../types';
import { WHITE_LABEL_PRESETS } from '../utils/brandingEngine';
import Card from './ui/Card';
import SchoolCrest from './ui/SchoolCrest';

interface WhiteLabelSettingsViewProps {
  db: SchoolDatabase;
  onUpdateBranding: (branding: Partial<SchoolBranding>) => Promise<SchoolBranding>;
  onChangePasscode: (currentPasscode: string, newPasscode: string) => Promise<void>;
  onImportConfig: (branding: SchoolBranding) => Promise<void>;
  onResetDemo: (preserveBranding: boolean) => Promise<void>;
}

const WhiteLabelSettingsView: React.FC<WhiteLabelSettingsViewProps> = ({
  db,
  onUpdateBranding,
  onChangePasscode,
  onImportConfig,
  onResetDemo,
}) => {
  const [tab, setTab] = useState<'branding' | 'modules' | 'security'>('branding');
  const [form, setForm] = useState<SchoolBranding>(db.branding);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Passcode state
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');

  useEffect(() => {
    setForm(db.branding);
  }, [db.branding]);

  const showToast = (msg: string) => {
    setErrorMsg(null);
    setStatusMsg(msg);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await onUpdateBranding(form);
      showToast('White-label school branding saved across the entire platform.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save branding.');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = async (presetBranding: Partial<SchoolBranding>) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const merged = { ...form, ...presetBranding };
      setForm(merged);
      await onUpdateBranding(merged);
      showToast(`Applied white-label preset: ${merged.schoolName}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to apply preset.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 650_000) {
      setErrorMsg('Logo file must be under 650 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm(prev => ({ ...prev, logoDataUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    if (newPasscode !== confirmPasscode) {
      setErrorMsg('New passcode and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await onChangePasscode(currentPasscode, newPasscode);
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
      showToast('Administrator passcode updated and encrypted with scrypt.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to change passcode.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ branding: form }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed?.branding?.schoolName) {
          setErrorMsg('Invalid configuration file.');
          return;
        }
        await onImportConfig(parsed.branding);
        showToast(`Imported configuration for ${parsed.branding.schoolName}`);
      } catch {
        setErrorMsg('Could not parse configuration JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTab('branding')}
            className={`px-4 py-2 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
              tab === 'branding'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Brand &amp; Visual Identity
          </button>
          <button
            type="button"
            onClick={() => setTab('modules')}
            className={`px-4 py-2 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
              tab === 'modules'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Client Presets &amp; Modules
          </button>
          <button
            type="button"
            onClick={() => setTab('security')}
            className={`px-4 py-2 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
              tab === 'security'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Security &amp; Audit Log
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export School Config</span>
          </button>
          <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs font-medium text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* TAB 1: Brand & Visual Identity */}
      {tab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card
            title="Institution White-Label Configuration"
            subtitle="Customize school identity for deployment or resale"
            className="lg:col-span-2"
          >
            <form onSubmit={handleSaveBranding} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    School / Institution Name
                  </label>
                  <input
                    required
                    value={form.schoolName}
                    onChange={e => setForm({ ...form, schoolName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Registration / Affiliation Code
                  </label>
                  <input
                    value={form.affiliationCode}
                    onChange={e => setForm({ ...form, affiliationCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  School Motto / Tagline
                </label>
                <input
                  value={form.tagline}
                  onChange={e => setForm({ ...form, tagline: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Academic Year
                  </label>
                  <input
                    value={form.academicYear}
                    onChange={e => setForm({ ...form, academicYear: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Currency Symbol
                  </label>
                  <select
                    value={form.currencySymbol}
                    onChange={e => setForm({ ...form, currencySymbol: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  >
                    <option value="$">$ (USD)</option>
                    <option value="PKR ">PKR (Rupee)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="AED ">AED (Dirham)</option>
                    <option value="SAR ">SAR (Riyal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Display Typography
                  </label>
                  <select
                    value={form.fontPairing}
                    onChange={e => setForm({ ...form, fontPairing: e.target.value as FontPairing })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="jakarta">Plus Jakarta Sans</option>
                    <option value="outfit">Outfit</option>
                    <option value="bricolage">Bricolage Grotesque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Campus Phone
                  </label>
                  <input
                    value={form.contactPhone}
                    onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Campus Address (Printed on Receipts &amp; Student ID Cards)
                </label>
                <input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                      className="w-10 h-9 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <input
                      value={form.primaryColor}
                      onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                      className="flex-1 px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.accentColor}
                      onChange={e => setForm({ ...form, accentColor: e.target.value })}
                      className="w-10 h-9 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <input
                      value={form.accentColor}
                      onChange={e => setForm({ ...form, accentColor: e.target.value })}
                      className="flex-1 px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Emblem Crest Style
                  </label>
                  <select
                    value={form.crestStyle}
                    onChange={e => setForm({ ...form, crestStyle: e.target.value as CrestStyle })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="shield">Academic Shield</option>
                    <option value="book">Open Codex</option>
                    <option value="pillars">Classical Pillars</option>
                    <option value="compass">STEM Compass</option>
                  </select>
                </div>
              </div>

              {/* Custom Logo Upload */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Custom School Logo (Optional)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload PNG, SVG, or JPG (max 650 KB) to replace the vector crest.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap">
                    Upload Logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {form.logoDataUrl !== '/assets/branding/ang-app-icon.png' && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, logoDataUrl: '/assets/branding/ang-app-icon.png' })
                      }
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                    >
                      ANG App Icon
                    </button>
                  )}
                  {form.logoDataUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logoDataUrl: '' })}
                      className="px-3 py-2 text-xs font-semibold rounded-lg text-red-600 border border-red-200 dark:border-red-900 cursor-pointer whitespace-nowrap"
                    >
                      Use Crest
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Applying Brand...' : 'Save & Apply School Branding'}
                </button>
              </div>
            </form>
          </Card>

          {/* Live Brand Preview */}
          <Card title="Live White-Label Preview" subtitle="Updates immediately on receipts, portal & IDs">
            <div className="space-y-4">
              <div
                className="rounded-xl p-5 text-white"
                style={{ backgroundColor: form.primaryColor }}
              >
                <div className="flex items-center gap-3">
                  <SchoolCrest
                    logoDataUrl={form.logoDataUrl}
                    crestStyle={form.crestStyle}
                    schoolName={form.schoolName}
                    size="md"
                    className="bg-white/15 border-white/30"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{form.schoolName}</p>
                    <p className="text-[11px] opacity-85 font-mono truncate">
                      {form.affiliationCode} · {form.academicYear}
                    </p>
                  </div>
                </div>
                <p className="text-xs opacity-90 mt-4 leading-relaxed">{form.tagline}</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Sample Fee Invoice Line
                </p>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Term 1 Tuition</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {form.currencySymbol}350.00
                  </span>
                </div>
                <button
                  type="button"
                  style={{ backgroundColor: form.primaryColor }}
                  className="w-full py-2 mt-2 rounded-lg text-white text-xs font-semibold"
                >
                  Sample Primary Action
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Client Presets & Modules */}
      {tab === 'modules' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            title="1-Click Client School Presets"
            subtitle="Instantly re-brand this software when demonstrating or deploying for a buyer school"
          >
            <div className="space-y-3">
              {WHITE_LABEL_PRESETS.map(preset => {
                const isActive = db.branding.schoolName === preset.branding.schoolName;
                return (
                  <div
                    key={preset.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: preset.branding.primaryColor }}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {preset.label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {preset.branding.affiliationCode} · Currency: {preset.branding.currencySymbol}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleApplyPreset(preset.branding)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'brand-bg text-white'
                          : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isActive ? 'Active Brand' : 'Apply Brand'}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card
            title="Enabled Feature Modules"
            subtitle="Tailor active LMS and management modules per school license tier"
          >
            <div className="space-y-3">
              {[
                { key: 'courses', label: 'LMS Courses & Lesson Player', desc: 'Curriculum catalog, reading/lab lessons, progress bars' },
                { key: 'assessments', label: 'Assignments & Auto-Graded Quizzes', desc: 'Submissions, instructor rubrics, timed MCQ quizzes' },
                { key: 'attendance', label: 'Daily Attendance Register', desc: 'Present/Absent/Late/Excused roll calls & logs' },
                { key: 'fees', label: 'Fee Invoicing & Printable Receipts', desc: 'Tuition billing, bulk invoices, and official receipts' },
                { key: 'schedule', label: 'Timetable & Notice Board', desc: 'Weekly class schedules and campus announcements' },
                { key: 'aiAssistant', label: 'AI School Data Analyst', desc: 'Natural-language queries over live school records' },
              ].map(mod => {
                const k = mod.key as keyof SchoolBranding['enabledModules'];
                const checked = form.enabledModules[k];
                return (
                  <label
                    key={mod.key}
                    className="flex items-start justify-between gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {mod.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{mod.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={async e => {
                        const updated: SchoolBranding = {
                          ...form,
                          enabledModules: {
                            ...form.enabledModules,
                            [k]: e.target.checked,
                          },
                        };
                        setForm(updated);
                        await onUpdateBranding(updated);
                        showToast(`Updated module visibility for ${mod.label}.`);
                      }}
                      className="mt-1 h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: Security & Audit Log */}
      {tab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card
              title="Administrator Passcode"
              subtitle="Secured with scrypt salt + timing-safe comparison"
            >
              <form onSubmit={handlePasscodeSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Current Passcode
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPasscode}
                    onChange={e => setCurrentPasscode(e.target.value)}
                    placeholder="Default: 1234"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    New Passcode (min 4 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPasscode}
                    onChange={e => setNewPasscode(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Confirm New Passcode
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={confirmPasscode}
                    onChange={e => setConfirmPasscode(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Update Admin Passcode</span>
                </button>
              </form>
            </Card>

            <Card title="Demo Data Controls" subtitle="Reset records when preparing a client demo">
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    await onResetDemo(true);
                    showToast('Reset academic & fee records while keeping your custom school branding.');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Records (Keep Branding)</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onResetDemo(false);
                    showToast('Restored factory Mustafai School System demo dataset.');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg text-red-600 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Factory Reset Everything</span>
                </button>
              </div>
            </Card>
          </div>

          <Card
            title="Security & Operations Audit Trail"
            subtitle="Server-recorded history of logins, branding edits, payments, and grading"
            className="lg:col-span-2"
          >
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="text-left py-2.5 px-2 font-semibold">Timestamp</th>
                    <th className="text-left py-2.5 px-2 font-semibold">Actor</th>
                    <th className="text-left py-2.5 px-2 font-semibold">Action</th>
                    <th className="text-left py-2.5 px-2 font-semibold">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {db.auditLog.map(entry => (
                    <tr key={entry.id}>
                      <td className="py-2.5 px-2 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                        {entry.actorName} ({entry.actorRole})
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-700 dark:text-slate-300">
                        {entry.action}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">
                        {entry.target}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WhiteLabelSettingsView;
