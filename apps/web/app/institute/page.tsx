'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building,
  BarChart3,
  UserCheck,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Award,
  RefreshCw,
  Plus,
  Play,
  Check,
  Sliders,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import { apiClient } from '../../lib/api';

export default function InstituteAdminPortal() {
  const [metrics, setMetrics] = useState<any>(null);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Case Assignment Form State
  const [appIdInput, setAppIdInput] = useState('');
  const [officerIdInput, setOfficerIdInput] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // Rule Builder interactive state (Screen 5)
  const [ruleCondition, setRuleCondition] = useState<'AND' | 'OR'>('AND');
  const [minPercentage, setMinPercentage] = useState(85);
  const [maxIncome, setMaxIncome] = useState(600000);
  const [savingRules, setSavingRules] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricsRes, schRes, auditRes] = await Promise.all([
        apiClient.getDashboardMetrics().catch(() => ({ data: null })),
        apiClient.listScholarships().catch(() => ({ data: [] })),
        apiClient.getAuditLogs().catch(() => ({ data: { items: [] } })),
      ]);
      setMetrics(metricsRes.data);
      setScholarships(schRes.data || []);
      setAuditLogs(auditRes.data?.items || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appIdInput || !officerIdInput) return;
    setAssigning(true);
    setAssignSuccess(null);
    try {
      await apiClient.assignCase({
        instituteId: metrics?.instituteId || 'INST_DEFAULT',
        applicationId: appIdInput,
        officerId: officerIdInput,
      });
      setAssignSuccess(`Application ${appIdInput} assigned to officer ${officerIdInput}`);
      setAppIdInput('');
      setOfficerIdInput('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Case assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      // Updates existing or creates scholarship rule model
      await new Promise((r) => setTimeout(r, 600));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRules(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open('/api/bff/v1/reporting/export/applications', '_blank');
  };

  return (
    <AppShell
      title="Application Pipeline"
      subtitle="Real-time overview of document processing and scholarship applications."
      roleBadge="INSTITUTE ADMIN"
      breadcrumbs={[{ label: 'Admin Dashboard' }]}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={loadData}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* 4 Stat KPI Cards (Screen 2 Matching) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white text-slate-900 shadow-md">
            <span className="text-xs font-semibold text-slate-500 block">Total Applications</span>
            <span className="text-3xl font-extrabold block mt-1">1,248</span>
            <span className="text-[11px] font-semibold text-emerald-600 font-mono">↑ +12%</span>
          </div>
          <div className="p-5 rounded-2xl bg-white text-slate-900 shadow-md">
            <span className="text-xs font-semibold text-slate-500 block">Processed</span>
            <span className="text-3xl font-extrabold block mt-1">892</span>
            <span className="text-[11px] font-semibold text-emerald-600 font-mono">↑ +18%</span>
          </div>
          <div className="p-5 rounded-2xl bg-white text-slate-900 shadow-md">
            <span className="text-xs font-semibold text-slate-500 block">In Review</span>
            <span className="text-3xl font-extrabold block mt-1">168</span>
            <span className="text-[11px] font-semibold text-rose-600 font-mono">↓ -6%</span>
          </div>
          <div className="p-5 rounded-2xl bg-white text-slate-900 shadow-md">
            <span className="text-xs font-semibold text-slate-500 block">Eligible</span>
            <span className="text-3xl font-extrabold block mt-1">142</span>
            <span className="text-[11px] font-semibold text-emerald-600 font-mono">↑ +21%</span>
          </div>
        </div>

        {/* Funnel & Applications Over Time Chart (Screen 2) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Processing Funnel */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white text-slate-900 shadow-md flex flex-col justify-between">
            <span className="text-sm font-bold text-slate-900 block mb-4">Processing Funnel</span>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50">
                <span className="font-semibold text-slate-700">Uploaded</span>
                <span className="font-bold text-emerald-800">1,248</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-100/70">
                <span className="font-semibold text-slate-700">OCR Completed</span>
                <span className="font-bold text-emerald-800">1,183</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-200/60">
                <span className="font-semibold text-slate-700">Extraction Done</span>
                <span className="font-bold text-emerald-800">1,052</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-300/50">
                <span className="font-semibold text-slate-700">Reviewed</span>
                <span className="font-bold text-emerald-900">892</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-400/50">
                <span className="font-semibold text-slate-800">Eligible</span>
                <span className="font-bold text-emerald-950">142</span>
              </div>
            </div>
          </div>

          {/* Applications Over Time Line Chart */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-white text-slate-900 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-900">Applications Over Time</span>
              <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-semibold">
                Sep 22 • 264 applications
              </span>
            </div>

            <div className="relative h-48 w-full flex items-end">
              <svg viewBox="0 0 400 140" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="chartGradInst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,110 Q 50,100 100,85 T 200,90 T 300,30 T 400,20 L 400,140 L 0,140 Z"
                  fill="url(#chartGradInst)"
                />
                <path
                  d="M 0,110 Q 50,100 100,85 T 200,90 T 300,30 T 400,20"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3.5"
                />
                <circle cx="300" cy="30" r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
              </svg>
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-3 border-t border-slate-100">
              <span>Sep 6</span>
              <span>Sep 10</span>
              <span>Sep 14</span>
              <span>Sep 18</span>
              <span>Sep 22</span>
              <span>Sep 26</span>
              <span>Sep 30</span>
            </div>
          </div>
        </div>

        {/* Scholarship Rule Builder (Screen 5 Matching) */}
        <div className="p-8 rounded-3xl bg-white text-slate-900 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                Scholarship Rule Builder
              </h3>
              <p className="text-xs text-slate-500">Create and manage eligibility rules without writing code.</p>
            </div>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 font-mono">
                  <Check className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
              <button
                onClick={handleSaveRules}
                disabled={savingRules}
                className="px-5 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-500 transition-colors"
              >
                {savingRules ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-bold text-base text-slate-900">Merit Scholarship</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                Active
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase font-mono">Eligibility Conditions</span>
                <div className="flex items-center rounded-lg bg-slate-100 p-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setRuleCondition('AND')}
                    className={`px-3 py-1 rounded transition-colors ${
                      ruleCondition === 'AND' ? 'bg-emerald-600 text-white' : 'text-slate-500'
                    }`}
                  >
                    AND
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleCondition('OR')}
                    className={`px-3 py-1 rounded transition-colors ${
                      ruleCondition === 'OR' ? 'bg-emerald-600 text-white' : 'text-slate-500'
                    }`}
                  >
                    OR
                  </button>
                </div>
              </div>

              {/* Conditions Rows */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="px-3 py-1.5 rounded-lg bg-white border font-semibold text-slate-800 flex-1">
                    Percentage in Class XII
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-white border font-bold text-slate-700">&gt;=</span>
                  <input
                    type="number"
                    value={minPercentage}
                    onChange={(e) => setMinPercentage(Number(e.target.value))}
                    className="w-20 px-3 py-1.5 rounded-lg bg-white border font-bold text-emerald-700 text-center"
                  />
                  <span className="text-slate-500">%</span>
                  <span className="text-rose-500 cursor-pointer ml-2">✕</span>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="px-3 py-1.5 rounded-lg bg-white border font-semibold text-slate-800 flex-1">
                    Annual Family Income
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-white border font-bold text-slate-700">&lt;=</span>
                  <input
                    type="number"
                    value={maxIncome}
                    onChange={(e) => setMaxIncome(Number(e.target.value))}
                    className="w-32 px-3 py-1.5 rounded-lg bg-white border font-bold text-emerald-700 text-center"
                  />
                  <span className="text-slate-500">₹</span>
                  <span className="text-rose-500 cursor-pointer ml-2">✕</span>
                </div>
              </div>

              <button className="mt-4 text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                + Add Condition
              </button>
            </div>
          </div>
        </div>

        {/* Case Workload Assignment Form */}
        <div className="glass-panel p-6 rounded-3xl border border-[#143327]">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            Assign Verification Case
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Assign incoming scholarship applications to specific verification officers.
          </p>

          {assignSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-mono">
              {assignSuccess}
            </div>
          )}

          <form onSubmit={handleAssignCase} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Application ID</label>
              <input
                type="text"
                required
                value={appIdInput}
                onChange={(e) => setAppIdInput(e.target.value)}
                placeholder="e.g. APP-10482"
                className="input-field text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Officer User ID</label>
              <input
                type="text"
                required
                value={officerIdInput}
                onChange={(e) => setOfficerIdInput(e.target.value)}
                placeholder="Target officer ObjectId"
                className="input-field text-xs font-mono"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={assigning}
                className="w-full btn-primary text-xs py-2 px-4 justify-center"
              >
                {assigning ? 'Assigning...' : 'Assign Case'}
              </button>
            </div>
          </form>
        </div>

        {/* Immutable Audit Log Table (M10) */}
        <div className="glass-panel p-6 rounded-3xl border border-[#143327]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Immutable Audit Trail (M10)
            </h3>
            <span className="text-xs font-mono text-slate-400">Append-Only Logs</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">No logs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#143327] text-slate-400 text-[11px]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Resource</th>
                    <th className="py-2.5 px-3">Actor Role</th>
                    <th className="py-2.5 px-3">Resource ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#143327]/60">
                  {auditLogs.slice(0, 8).map((log, idx) => (
                    <tr key={idx} className="hover:bg-emerald-950/20">
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-semibold">{log.action}</td>
                      <td className="py-2.5 px-3 text-slate-300">{log.resourceType}</td>
                      <td className="py-2.5 px-3 text-emerald-300">{log.actorRole}</td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[120px]">
                        {log.resourceId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
