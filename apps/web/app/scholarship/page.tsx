'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Scale,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import { apiClient } from '../../lib/api';

export default function ScholarshipOfficerPortal() {
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [selectedScholarship, setSelectedScholarship] = useState<any>(null);
  const [evalAppId, setEvalAppId] = useState('APP-001');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  const loadScholarships = async () => {
    setLoading(true);
    try {
      const res = await apiClient.listScholarships();
      setScholarships(res.data || []);
      if (res.data?.length > 0) {
        setSelectedScholarship(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load scholarships:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScholarships();
  }, []);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScholarship || !evalAppId) return;

    setEvaluating(true);
    setEvaluation(null);
    setRecommendation(null);

    try {
      const schId = selectedScholarship.id || selectedScholarship._id;
      const evalRes = await apiClient.evaluateScholarship(schId, evalAppId);
      setEvaluation(evalRes.data);

      try {
        const recRes = await apiClient.getRecommendation(evalAppId);
        setRecommendation(recRes.data);
      } catch (_) {}
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <AppShell
      title="Scholarship Decision & Evaluation Workspace"
      subtitle="Execute AST rules with 3-valued logic and review transparent eligibility dossiers."
      roleBadge="SCHOLARSHIP OFFICER"
      breadcrumbs={[{ label: 'Scholarship Evaluations' }]}
      action={
        <button
          onClick={loadScholarships}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      }
    >
      <div className="space-y-8">
        {/* Scholarship Selector & Evaluation Form */}
        <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
          <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            Evaluate Applicant Eligibility
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Evaluates academic percentages, verified family income, and required certificates.
          </p>

          <form onSubmit={handleEvaluate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Scholarship Program
              </label>
              <select
                value={selectedScholarship?.id || selectedScholarship?._id || ''}
                onChange={(e) => {
                  const s = scholarships.find((x) => (x.id || x._id) === e.target.value);
                  setSelectedScholarship(s);
                }}
                className="input-field text-xs"
              >
                {scholarships.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.name} ({s.code}) — ₹{s.awardAmount?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Application Identifier
              </label>
              <input
                type="text"
                required
                value={evalAppId}
                onChange={(e) => setEvalAppId(e.target.value)}
                placeholder="e.g. APP-001"
                className="input-field text-xs font-mono"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={evaluating || !selectedScholarship}
                className="w-full btn-primary text-xs py-2 px-4 justify-center"
              >
                {evaluating ? 'Evaluating Rules...' : 'Run 3-Valued AST Evaluation'}
              </button>
            </div>
          </form>
        </div>

        {/* Dual Text Dossiers (M9) */}
        {recommendation && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student Dossier (Public) */}
            <div className="glass-panel p-6 rounded-2xl border border-cyan-900/50 bg-cyan-950/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                  Student-Facing Transparent Dossier
                </span>
                <StatusBadge status={recommendation.status} />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">Notice of Eligibility Status</h3>
              <div className="p-4 rounded-xl bg-black/60 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                {recommendation.studentExplanation}
              </div>
              <p className="mt-3 text-[11px] text-slate-400 font-mono">
                Delivered via student dashboard with clear next steps.
              </p>
            </div>

            {/* Officer Confidential Dossier */}
            <div className="glass-panel p-6 rounded-2xl border border-indigo-900/50 bg-indigo-950/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                  Confidential Verification Officer Dossier
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                  Confidence: {(recommendation.confidenceScore * 100).toFixed(1)}%
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">Audit Rationale & Data Lineage</h3>
              <div className="p-4 rounded-xl bg-black/60 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {recommendation.officerExplanation || 'No confidential notes appended.'}
              </div>
              <p className="mt-3 text-[11px] text-slate-400 font-mono">
                Immutable record logged for institutional compliance auditing.
              </p>
            </div>
          </div>
        )}

        {/* Active Scholarships Overview */}
        <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            Active Scholarship Offerings & Award Quantities
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scholarships.map((s) => (
              <div
                key={s.id || s._id}
                className="p-4 rounded-xl bg-black/40 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{s.name}</span>
                  <span className="text-xs font-mono text-cyan-400">
                    ₹{s.awardAmount?.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{s.description}</p>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Quota: {s.maxRecipients || 100}</span>
                  <span>Category: {s.category || 'General'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

