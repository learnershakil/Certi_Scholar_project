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

  // AST Test Harness State
  const [testScholarshipId, setTestScholarshipId] = useState('');
  const [testAppId, setTestAppId] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

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

  const handleTestHarness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testScholarshipId || !testAppId) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.evaluateScholarship(testScholarshipId, testAppId);
      setTestResult(res.data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'AST evaluation failed');
    } finally {
      setTesting(false);
    }
  };

  const handleDownloadCsv = () => {
    // Direct link to the API export endpoint which applies formula injection protection
    window.open('/api/bff/v1/reporting/export/applications', '_blank');
  };

  return (
    <AppShell
      title="Institute Administration & Governance"
      subtitle="Multi-tenant workload orchestration, AST rule builder, and tamper-resistant audit trail."
      roleBadge="INSTITUTE ADMIN"
      breadcrumbs={[{ label: 'Institute Admin' }]}
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
        {/* KPI Dashboard Strip (M10) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-cyan-900/40">
            <span className="text-xs font-mono text-cyan-400 block">Total Ingested</span>
            <span className="text-3xl font-extrabold text-white mt-1 block">
              {metrics?.totalDocuments || 0}
            </span>
            <span className="text-[11px] text-slate-400">10MB bounded intake</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-emerald-900/40">
            <span className="text-xs font-mono text-emerald-400 block">Antivirus Scanned Clean</span>
            <span className="text-3xl font-extrabold text-white mt-1 block">
              {metrics?.cleanDocuments || 0}
            </span>
            <span className="text-[11px] text-slate-400">ClamAV live socket scan</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-amber-900/40">
            <span className="text-xs font-mono text-amber-400 block">Pending Review</span>
            <span className="text-3xl font-extrabold text-white mt-1 block">
              {metrics?.pendingReviewDocuments || 0}
            </span>
            <span className="text-[11px] text-slate-400">Awaiting human review</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-indigo-900/40">
            <span className="text-xs font-mono text-indigo-400 block">Active Scholarships</span>
            <span className="text-3xl font-extrabold text-white mt-1 block">
              {scholarships.length}
            </span>
            <span className="text-[11px] text-slate-400">JSON AST rule models</span>
          </div>
        </div>

        {/* 2-Column: Case Assignment & Rule Evaluation Test Harness */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Case Assignment Management */}
          <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              Assign Verification Workload
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Bind application documents to specific verification officers with isolation controls.
            </p>

            {assignSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono">
                {assignSuccess}
              </div>
            )}

            <form onSubmit={handleAssignCase} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Application ID or Document ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. APP-123456"
                  value={appIdInput}
                  onChange={(e) => setAppIdInput(e.target.value)}
                  className="input-field text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Verification Officer User ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Officer MongoDB ObjectId"
                  value={officerIdInput}
                  onChange={(e) => setOfficerIdInput(e.target.value)}
                  className="input-field text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={assigning}
                className="btn-primary text-xs py-2 px-4 w-full justify-center"
              >
                {assigning ? 'Assigning...' : 'Assign Case to Officer'}
              </button>
            </form>
          </div>

          {/* AST Rule Evaluation Test Harness (M8) */}
          <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-400" />
              AST Rule Engine Test Harness (M8)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Evaluate applicant data against 3-valued logic rule models in real time.
            </p>

            <form onSubmit={handleTestHarness} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select Scholarship Rule Model
                </label>
                <select
                  value={testScholarshipId}
                  onChange={(e) => setTestScholarshipId(e.target.value)}
                  className="input-field text-xs"
                >
                  <option value="">Select Scholarship...</option>
                  {scholarships.map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Application ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. APP-001"
                  value={testAppId}
                  onChange={(e) => setTestAppId(e.target.value)}
                  className="input-field text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={testing || !testScholarshipId}
                className="btn-secondary text-xs py-2 px-4 w-full justify-center text-cyan-300"
              >
                {testing ? 'Evaluating AST Rules...' : 'Execute AST Evaluation'}
              </button>
            </form>

            {testResult && (
              <div className="mt-4 p-4 rounded-xl bg-black/60 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Eligibility Result:</span>
                  <StatusBadge status={testResult.status || (testResult.eligible ? 'ELIGIBLE' : 'INELIGIBLE')} />
                </div>
                <div className="text-slate-300">
                  Total Passing Rules: {testResult.passedRules?.length || 0}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scholarships Registry List (M8) */}
        <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            Configured Scholarships & JSON AST Rules (M8)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scholarships.map((sch) => (
              <div
                key={sch.id || sch._id}
                className="p-4 rounded-xl bg-black/40 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{sch.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                    {sch.code}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{sch.description}</p>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Award: ₹{sch.awardAmount?.toLocaleString() || 'N/A'}</span>
                  <span>Rules: {sch.ruleAst?.rules?.length || 1} criteria</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Immutable Audit Log Explorer (M10) */}
        <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Immutable Audit Trail (M10)
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Showing recent append-only logs
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No audit records logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Resource</th>
                    <th className="py-2.5 px-3">Actor Role</th>
                    <th className="py-2.5 px-3">Resource ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.slice(0, 10).map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400 font-semibold">{log.action}</td>
                      <td className="py-2.5 px-3 text-slate-300">{log.resourceType}</td>
                      <td className="py-2.5 px-3 text-indigo-300">{log.actorRole}</td>
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

