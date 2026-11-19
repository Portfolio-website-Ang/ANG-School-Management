import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Clock, Plus, Printer, Search, CreditCard, FileText } from 'lucide-react';
import { FeeStatus, UserRole, type AuthSession, type FeeRecord, type SchoolDatabase } from '../types';
import Card from './ui/Card';
import SchoolCrest from './ui/SchoolCrest';
import ReportModal from './ui/ReportModal';

interface FeesViewProps {
  session: AuthSession;
  db: SchoolDatabase;
  onCreateInvoice: (payload: {
    targetType: 'student' | 'class';
    targetId: string;
    category: 'Tuition' | 'Lab' | 'Exam' | 'Transport' | 'Library';
    amount: number;
    dueDate: string;
    description: string;
  }) => Promise<void>;
  onPayFee: (feeId: string) => Promise<void>;
}

const FeesView: React.FC<FeesViewProps> = ({ session, db, onCreateInvoice, onPayFee }) => {
  const [statusFilter, setStatusFilter] = useState<'All' | FeeStatus>('All');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [receiptFee, setReceiptFee] = useState<FeeRecord | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    targetType: 'student' as 'student' | 'class',
    targetId: db.students[0]?.id || '',
    category: 'Tuition' as 'Tuition' | 'Lab' | 'Exam' | 'Transport' | 'Library',
    amount: 350,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    description: 'Term 2 Tuition Fee',
  });

  const isAdmin = session.role === UserRole.Admin;
  const canPay = session.role === UserRole.Admin || session.role === UserRole.Parent;
  const classes = Array.from(new Set(db.students.map(s => s.class))).sort();
  const sym = db.branding.currencySymbol;

  const totalPaid = db.fees.filter(f => f.status === FeeStatus.Paid).reduce((s, f) => s + f.amount, 0);
  const totalDue = db.fees.filter(f => f.status === FeeStatus.Due).reduce((s, f) => s + f.amount, 0);
  const totalOverdue = db.fees.filter(f => f.status === FeeStatus.Overdue).reduce((s, f) => s + f.amount, 0);

  const visibleFees = db.fees.filter(fee => {
    if (statusFilter !== 'All' && fee.status !== statusFilter) return false;
    if (search.trim()) {
      const student = db.students.find(s => s.id === fee.studentId);
      const q = search.toLowerCase();
      return (
        fee.invoiceNo.toLowerCase().includes(q) ||
        fee.description.toLowerCase().includes(q) ||
        (student?.name.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const handlePay = async (feeId: string) => {
    setPayingId(feeId);
    try {
      await onPayFee(feeId);
    } finally {
      setPayingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreateInvoice(invoiceForm);
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  };

  const renderStatus = (status: FeeStatus) => {
    if (status === FeeStatus.Paid) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Paid
        </span>
      );
    }
    if (status === FeeStatus.Overdue) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
        <Clock className="w-3.5 h-3.5" />
        Due
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Collected Revenue</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {sym}
            {totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Upcoming Due</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {sym}
            {totalDue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue Balance</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400 mt-1">
            {sym}
            {totalOverdue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search invoice, student..."
              className="pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            {(['All', FeeStatus.Paid, FeeStatus.Due, FeeStatus.Overdue] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>Fee History PDF</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Fee Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <Card title="Student Fee & Invoice Ledger" subtitle={`${visibleFees.length} invoice(s)`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th className="text-left py-3 px-3 font-semibold">Invoice</th>
                <th className="text-left py-3 px-3 font-semibold">Student</th>
                <th className="text-left py-3 px-3 font-semibold">Description</th>
                <th className="text-right py-3 px-3 font-semibold">Amount</th>
                <th className="text-left py-3 px-3 font-semibold">Due Date</th>
                <th className="text-left py-3 px-3 font-semibold">Status</th>
                <th className="text-right py-3 px-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleFees.map(fee => {
                const student = db.students.find(s => s.id === fee.studentId);
                return (
                  <tr key={fee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {fee.invoiceNo}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {student?.name || fee.studentId}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {fee.description} · <span className="text-xs text-slate-400">{fee.category}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {sym}
                      {fee.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {fee.dueDate}
                    </td>
                    <td className="py-3 px-3">{renderStatus(fee.status)}</td>
                    <td className="py-3 px-3 text-right">
                      {fee.status === FeeStatus.Paid ? (
                        <button
                          type="button"
                          onClick={() => setReceiptFee(fee)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      ) : canPay ? (
                        <button
                          type="button"
                          disabled={payingId === fee.id}
                          onClick={() => handlePay(fee.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{payingId === fee.id ? 'Processing...' : 'Pay Now'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Awaiting Payment</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Issue Invoice Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Issue Fee Invoice</h3>
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Bill To
                  </label>
                  <select
                    value={invoiceForm.targetType}
                    onChange={e => {
                      const targetType = e.target.value as 'student' | 'class';
                      setInvoiceForm({
                        ...invoiceForm,
                        targetType,
                        targetId:
                          targetType === 'class' ? classes[0] || '5A' : db.students[0]?.id || '',
                      });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="student">Single Student</option>
                    <option value="class">Entire Class (Bulk)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {invoiceForm.targetType === 'class' ? 'Select Class' : 'Select Student'}
                  </label>
                  <select
                    value={invoiceForm.targetId}
                    onChange={e => setInvoiceForm({ ...invoiceForm, targetId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {invoiceForm.targetType === 'class'
                      ? classes.map(c => (
                          <option key={c} value={c}>
                            Class {c}
                          </option>
                        ))
                      : db.students.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.class})
                          </option>
                        ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={invoiceForm.category}
                    onChange={e => setInvoiceForm({ ...invoiceForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Tuition">Tuition</option>
                    <option value="Lab">Lab</option>
                    <option value="Exam">Exam</option>
                    <option value="Transport">Transport</option>
                    <option value="Library">Library</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Amount ({sym})
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={invoiceForm.amount}
                    onChange={e => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Description
                </label>
                <input
                  required
                  value={invoiceForm.description}
                  onChange={e => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
                >
                  {saving ? 'Issuing...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branded Printable Official Fee Receipt Modal */}
      {receiptFee && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 print-only-card">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <SchoolCrest
                  logoDataUrl={db.branding.logoDataUrl}
                  crestStyle={db.branding.crestStyle}
                  schoolName={db.branding.schoolName}
                  size="md"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {db.branding.schoolName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{db.branding.address}</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {db.branding.affiliationCode} · Official Fee Receipt
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                PAID
              </span>
            </div>

            <div className="py-5 space-y-3 text-sm">
              {(() => {
                const student = db.students.find(s => s.id === receiptFee.studentId);
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Receipt / Invoice No</span>
                      <span className="font-mono font-semibold">{receiptFee.invoiceNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Student Name</span>
                      <span className="font-semibold">
                        {student?.name} ({student?.rollNo})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Class / Guardian</span>
                      <span>
                        Class {student?.class} · {student?.guardianName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fee Description</span>
                      <span>
                        {receiptFee.description} ({receiptFee.category})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Reference</span>
                      <span className="font-mono">{receiptFee.paymentRef || 'TXN-VERIFIED'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Date</span>
                      <span className="font-mono">{receiptFee.paidAt || receiptFee.dueDate}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between text-base font-bold">
                      <span>Amount Settled</span>
                      <span className="font-mono tabular-nums">
                        {sym}
                        {receiptFee.amount.toFixed(2)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Computer-verified official fee receipt
              </span>
              <div className="bg-white rounded px-2 py-1 border border-slate-200 shrink-0">
                <img
                  src="/assets/branding/ang-print-mono-logo.png"
                  alt="ANG Monochrome Verification Mark"
                  referrerPolicy="no-referrer"
                  className="h-7 w-auto object-contain"
                />
              </div>
            </div>

            <div className="no-print flex justify-end gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReceiptFee(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white brand-bg cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        session={session}
        db={db}
        initialKind="fees"
      />
    </div>
  );
};

export default FeesView;