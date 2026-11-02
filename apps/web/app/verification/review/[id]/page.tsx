'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  FileText,
  History,
  Lock,
  ArrowLeft,
  Check,
  Edit3,
  ExternalLink,
  Info,
} from 'lucide-react';
import { AppShell } from '../../../../components/AppShell';
import { StatusBadge } from '../../../../components/StatusBadge';
import { apiClient } from '../../../../lib/api';

export default function DocumentSideBySideReviewPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.id as string;

  const [reviewData, setReviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Correction Action Form
  const [actionType, setActionType] = useState<
    'APPROVE' | 'CORRECT' | 'MARK_UNREADABLE' | 'REQUEST_REUPLOAD'
  >('CORRECT');
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>('');
  const [correctedValue, setCorrectedValue] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDetails = async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getReviewDetails(documentId);
      setReviewData(res.data);
      if (res.data?.extraction?.fields?.length > 0) {
        // Select first field needing review if any
        const needing = res.data.extraction.fields.find(
          (f: any) => f.reviewStatus === 'NEEDS_REVIEW' || f.isBelowThreshold
        );
        const target = needing || res.data.extraction.fields[0];
        setSelectedFieldKey(target.fieldKey);
        setCorrectedValue(target.normalizedValue || target.rawValue || '');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load document review data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [documentId]);

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('A mandatory reason is required for any human review action.');
      return;
    }

    setSubmitting(true);
    setActionSuccess(null);
    setError(null);

    try {
      const expectedVersion = reviewData?.extraction?.version || 1;
      await apiClient.submitReviewAction(documentId, {
        actionType,
        fieldKey: actionType === 'CORRECT' ? selectedFieldKey : undefined,
        correctedValue: actionType === 'CORRECT' ? correctedValue : undefined,
        reason,
        expectedVersion,
      });

      setActionSuccess(`Review action [${actionType}] recorded with optimistic version lock.`);
      setReason('');
      await loadDetails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell
        title="Side-by-Side Human Review"
        roleBadge="VERIFICATION OFFICER"
        breadcrumbs={[
          { label: 'Review Queue', href: '/verification' },
          { label: documentId?.substring(0, 8) || 'Loading...' },
        ]}
      >
        <div className="text-center py-24 text-slate-500 font-mono text-sm">
          Loading document evidence & extracted coordinates...
        </div>
      </AppShell>
    );
  }

  if (error || !reviewData) {
    return (
      <AppShell
        title="Side-by-Side Human Review"
        roleBadge="VERIFICATION OFFICER"
        breadcrumbs={[{ label: 'Review Queue', href: '/verification' }, { label: 'Error' }]}
      >
        <div className="glass-panel p-8 rounded-2xl max-w-xl mx-auto text-center border-rose-900/60">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Review Access Blocked</h2>
          <p className="text-xs text-rose-300 font-mono mb-6">{error || 'Unable to load record'}</p>
          <Link href="/verification" className="btn-secondary text-xs">
            ← Return to Review Queue
          </Link>
        </div>
      </AppShell>
    );
  }

  const { document, viewUrl, ocrResult, extraction, corrections } = reviewData;
  const currentExtractionVersion = extraction?.version || 1;

  return (
    <AppShell
      title={`Review: ${document.originalName || document.filename}`}
      subtitle={`Application: ${document.applicationId} | Category: ${document.category}`}
      roleBadge="VERIFICATION OFFICER"
      breadcrumbs={[
        { label: 'Review Queue', href: '/verification' },
        { label: document.originalName || 'Document' },
      ]}
      action={
        <div className="flex items-center gap-3">
          <StatusBadge status={document.status} />
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1">
            <Lock className="w-3 h-3 text-cyan-400" />
            v{currentExtractionVersion}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* 2-Column Side-by-Side Review Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Pane: Document Viewer / OCR Geometry (col-span-7) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-panel p-4 rounded-2xl border border-[#1C2438]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Presigned Evidence Document Preview
                </span>
                {viewUrl && (
                  <a
                    href={viewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    Open Fullscreen <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Document Frame or OCR Text fallback */}
              {viewUrl ? (
                <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                  <iframe
                    src={viewUrl}
                    className="w-full h-full border-0"
                    title="Document Evidence"
                  />
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-[500px] overflow-y-auto whitespace-pre-wrap">
                  {ocrResult?.fullText || 'No OCR text available.'}
                </div>
              )}

              {/* OCR Geometry Tokens Summary */}
              {ocrResult && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Provider: {ocrResult.provider}</span>
                  <span>Pages: {ocrResult.pageCount}</span>
                  <span>Latency: {ocrResult.latencyMs}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Extracted Fields & Correction Form (col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Extracted Fields Table */}
            <div className="glass-panel p-5 rounded-2xl border border-[#1C2438]">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Calibrated Fields (v{currentExtractionVersion})
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">
                Fields below 85% confidence are flagged for mandatory human review.
              </p>

              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {extraction?.fields?.map((f: any) => {
                  const isSelected = selectedFieldKey === f.fieldKey;
                  const isFlagged = f.isBelowThreshold || f.reviewStatus === 'NEEDS_REVIEW';

                  return (
                    <div
                      key={f.fieldKey}
                      onClick={() => {
                        setSelectedFieldKey(f.fieldKey);
                        setCorrectedValue(f.normalizedValue || f.rawValue || '');
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/30'
                          : isFlagged
                          ? 'border-amber-700/60 bg-amber-950/20 hover:border-amber-600'
                          : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">{f.label}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              f.confidence >= 0.85
                                ? 'bg-emerald-950/80 text-emerald-300'
                                : 'bg-amber-950/80 text-amber-300 font-bold'
                            }`}
                          >
                            {(f.confidence * 100).toFixed(0)}%
                          </span>
                          {isFlagged && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-900/80 text-amber-200">
                              FLAGGED
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 text-xs font-mono text-cyan-300 truncate">
                        {f.normalizedValue || f.rawValue || (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Officer Action Form */}
            <div className="glass-panel p-5 rounded-2xl border border-[#1C2438]">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                Submit Verification Decision
              </h3>

              <form onSubmit={handleSubmitAction} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Action Type
                  </label>
                  <select
                    value={actionType}
                    onChange={(e: any) => setActionType(e.target.value)}
                    className="input-field text-xs"
                  >
                    <option value="APPROVE">Approve Extracted Values</option>
                    <option value="CORRECT">Correct Field Value</option>
                    <option value="MARK_UNREADABLE">Mark Document Unreadable</option>
                    <option value="REQUEST_REUPLOAD">Request Student Re-upload</option>
                  </select>
                </div>

                {actionType === 'CORRECT' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Active Field to Correct
                      </label>
                      <input
                        type="text"
                        disabled
                        value={selectedFieldKey}
                        className="input-field text-xs font-mono bg-slate-900/80 text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Corrected Value (Verified Visually)
                      </label>
                      <input
                        type="text"
                        required
                        value={correctedValue}
                        onChange={(e) => setCorrectedValue(e.target.value)}
                        placeholder="Enter verified value from document"
                        className="input-field text-xs font-mono text-cyan-300"
                      />
                    </div>
                  </>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-slate-300">
                      Audit Justification Reason (Mandatory)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Immutable Log</span>
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide specific visual evidence or rationale for this review action..."
                    className="input-field text-xs resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-primary text-xs py-2.5 justify-center shadow-lg"
                >
                  {submitting ? 'Applying Concurrency Lock...' : 'Submit Human Review Action'}
                </button>
              </form>
            </div>

            {/* Append-Only Correction Trail */}
            {corrections && corrections.length > 0 && (
              <div className="glass-panel p-5 rounded-2xl border border-[#1C2438]">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5 font-mono">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  Append-Only Correction History ({corrections.length})
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto text-xs">
                  {corrections.map((c: any) => (
                    <div
                      key={c.id || c._id}
                      className="p-2.5 rounded-lg bg-black/40 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                        <span className="text-cyan-400">{c.fieldKey}</span>
                        <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-sans">
                        <span className="text-slate-500 line-through mr-1.5">{c.previousValue}</span>
                        <span className="text-emerald-400 font-semibold">{c.correctedValue}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">“{c.reason}”</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

