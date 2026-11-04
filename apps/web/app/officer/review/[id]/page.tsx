'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  X,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Calculator,
  History,
  FileText,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import { AppShell } from '../../../../components/AppShell';
import { apiClient } from '../../../../lib/api';

interface ExtractedField {
  key: string;
  label: string;
  value: string | number;
  confidence: number;
  bbox?: { x: number; y: number; width: number; height: number };
  corrected?: boolean;
}

export default function ReviewCorrectionPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>('studentName');
  const [editingField, setEditingField] = useState<ExtractedField | null>(null);
  const [correctionValue, setCorrectionValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Consistency & Verification State
  const [runningConsistency, setRunningConsistency] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [documentInfo, setDocumentInfo] = useState<any>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [correctionsHistory, setCorrectionsHistory] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .getReviewDetails(documentId)
      .then((res) => {
        const data = res?.data;
        if (!data) throw new Error('No review data returned');
        setDocumentInfo(data.document || null);
        setViewUrl(data.viewUrl || null);
        const rawFields = data.extraction?.fields || [];
        setFields(
          rawFields.map((f: any) => {
            const verts = f.source?.boundingPolygon?.vertices || [];
            let bbox: ExtractedField['bbox'];
            if (verts.length >= 4) {
              const xs = verts.map((v: any) => v.x);
              const ys = verts.map((v: any) => v.y);
              bbox = {
                x: Math.min(...xs),
                y: Math.min(...ys),
                width: Math.max(...xs) - Math.min(...xs),
                height: Math.max(...ys) - Math.min(...ys),
              };
            }
            return {
              key: f.fieldKey,
              label: f.label || f.fieldKey,
              value: f.normalizedValue ?? f.rawValue ?? '',
              confidence: f.confidence ?? 0,
              bbox,
              corrected: f.reviewStatus === 'HUMAN_CORRECTED',
            };
          })
        );
        setCorrectionsHistory(
          (data.corrections || []).map((c: any) => ({
            id: c._id || c.id,
            fieldKey: c.fieldKey,
            previousValue: String(c.originalValue ?? ''),
            correctedValue: String(c.correctedValue ?? ''),
            reason: c.reason || '',
            officer: c.officerId || 'Officer',
            timestamp: c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
          }))
        );
        if (rawFields.length > 0) setSelectedFieldKey(rawFields[0].fieldKey);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load review details');
      })
      .finally(() => setLoading(false));
  }, [documentId]);

  const handleOpenEdit = (field: ExtractedField) => {
    setEditingField(field);
    setCorrectionValue(String(field.value));
    setCorrectionReason('');
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField || !correctionReason.trim()) return;

    setSubmittingCorrection(true);
    try {
      await apiClient.submitCorrection({
        documentId,
        fieldKey: editingField.key,
        previousValue: editingField.value,
        correctedValue: isNaN(Number(correctionValue)) ? correctionValue : Number(correctionValue),
        reason: correctionReason,
      });

      // Update local state
      setFields((prev) =>
        prev.map((f) =>
          f.key === editingField.key
            ? { ...f, value: correctionValue, confidence: 1.0, corrected: true }
            : f
        )
      );

      setCorrectionsHistory((prev) => [
        {
          id: `h-${Date.now()}`,
          fieldKey: editingField.label,
          previousValue: String(editingField.value),
          correctedValue: correctionValue,
          reason: correctionReason,
          officer: 'Current Officer',
          timestamp: 'Just now',
        },
        ...prev,
      ]);

      setEditingField(null);
      setActionSuccess(`Corrected ${editingField.label} successfully.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Correction submission failed');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleRunConsistency = async () => {
    setRunningConsistency(true);
    try {
      const res = await apiClient.runConsistencyCheck(documentId);
      setConsistencyResult(res.data);
      setActionSuccess(`M6 Consistency check: ${res.data.status}, computed ${res.data.computedPercentage}% (printed ${res.data.printedPercentage ?? 'n/a'}%), discrepancy: ${res.data.discrepancyFlagged ? 'yes' : 'no'}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Consistency check failed');
    } finally {
      setRunningConsistency(false);
    }
  };

  const handleRunVerification = async (provider: 'CERTI_ADAPTER' | 'SIMULATED') => {
    setVerifying(true);
    try {
      const res = await apiClient.executeVerification({
        applicationId: documentInfo?.applicationId || '',
        documentId,
        provider,
      });
      setVerificationResult(res.data);
      setActionSuccess(`M7 Verification verified via ${provider}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleApproveDocument = async () => {
    try {
      await apiClient.submitReviewDecision({
        documentId,
        decision: 'APPROVED',
        notes: 'Document inspected and verified with high confidence.',
      });
      router.push('/officer');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const handleRejectDocument = async () => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try {
      await apiClient.submitReviewDecision({
        documentId,
        decision: 'REJECTED',
        notes: reason,
      });
      router.push('/officer');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Rejection failed');
    }
  };

  return (
    <AppShell
      title="Review & Correction"
      subtitle={`Application: ${documentInfo?.applicationId || "n/a"} - Document: ${documentInfo?.originalName || documentInfo?.filename || "n/a"}`}
      breadcrumbs={[
        { label: 'Review Queue', href: '/officer' },
        { label: documentInfo?.applicationId || 'n/a' },
      ]}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={handleRejectDocument}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={handleApproveDocument}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#10b981] hover:bg-[#059669] text-[#08090a] font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-[#10b981]/20"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {actionSuccess && (
          <div className="p-3 rounded-md bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* 2-Column Split: Document Viewer (Left) & Field Inspector (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Document Canvas & Interactive Bounding Box Coordinates (Screen 4 Left) */}
          <div className="lg:col-span-7 rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8a8f98] border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#10b981]" />
                <span className="font-medium text-white">Marksheet.pdf</span>
                <span className="text-[10px] font-mono">(Page 1 of 1 • 300 DPI)</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span>Zoom: 100%</span>
                <span className="text-[#10b981]">SVG Overlay Active</span>
              </div>
            </div>

            {loadError ? (
              <div className="p-4 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {loadError} - no mock data is shown in place of the live record.
              </div>
            ) : fields.length === 0 ? (
              <div className="p-4 rounded-md border border-white/[0.08] text-[#8a8f98] text-xs">
                No extracted fields available for this document yet. Run extraction from the review queue first.
              </div>
            ) : viewUrl ? (
              <iframe src={viewUrl} title="Document viewer" className="w-full aspect-[4/3] rounded-md border border-white/[0.08] bg-white" />
            ) : (
              <div className="p-4 rounded-md border border-white/[0.08] text-[#8a8f98] text-xs">
                No document view URL available for this record.
              </div>
            )}
            {(() => {
              const selected = fields.find((f) => f.key === selectedFieldKey);
              if (!selected?.bbox) return null;
              return (
                <div className="text-[11px] font-mono text-[#8a8f98]">
                  Selected field bounding box (document pixels): x={Math.round(selected.bbox.x)}, y={Math.round(selected.bbox.y)}, w={Math.round(selected.bbox.width)}, h={Math.round(selected.bbox.height)}
                </div>
              );
            })()}
          </div>

          {/* Right: Extracted Fields, Corrections & Verification Tools (Screen 4 Right) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Extracted Fields Table */}
            <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                <span className="text-xs font-semibold text-white">Extracted Fields</span>
                <span className="text-[11px] font-mono text-[#8a8f98]">Confidence Calibration</span>
              </div>

              <div className="space-y-2">
                {fields.map((field) => {
                  const isSelected = selectedFieldKey === field.key;
                  return (
                    <div
                      key={field.key}
                      onClick={() => setSelectedFieldKey(field.key)}
                      className={`p-2.5 rounded-md border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-[#10b981]/40 bg-white/[0.04]'
                          : 'border-white/[0.06] bg-[#101114] hover:border-white/10'
                      }`}
                    >
                      <div>
                        <div className="text-[#8a8f98] text-[11px]">{field.label}</div>
                        <div className="font-medium text-white mt-0.5">{field.value}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                            field.confidence >= 0.95
                              ? 'text-[#10b981] bg-[#10b981]/10'
                              : 'text-[#eab308] bg-[#eab308]/10'
                          }`}
                        >
                          {field.confidence.toFixed(2)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(field);
                          }}
                          className="p-1 rounded text-[#8a8f98] hover:text-white hover:bg-white/[0.08]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* M6 Consistency & M7 Verification Actions */}
            <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-4 space-y-3">
              <span className="text-xs font-semibold text-white block border-b border-white/[0.08] pb-2">
                Verification & Consistency Engines
              </span>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleRunConsistency}
                  disabled={runningConsistency}
                  className="btn-secondary text-xs py-2 px-3 justify-center flex items-center gap-1.5"
                >
                  <Calculator className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>{runningConsistency ? 'Checking...' : 'Run Consistency (M6)'}</span>
                </button>

                <button
                  onClick={() => handleRunVerification('SIMULATED')}
                  disabled={verifying}
                  className="btn-secondary text-xs py-2 px-3 justify-center flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>{verifying ? 'Verifying...' : 'Verify Issuer (M7)'}</span>
                </button>
              </div>

              {consistencyResult && (
                <div className="p-2.5 rounded bg-[#10b981]/10 border border-[#10b981]/20 text-[11px] text-[#10b981] flex items-center justify-between">
                  <span>Computed: {consistencyResult.computedPercentage}%</span>
                  <span className="font-semibold">Consistent</span>
                </div>
              )}
            </div>

            {/* Audit History of Corrections */}
            <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white border-b border-white/[0.08] pb-2">
                <History className="w-3.5 h-3.5 text-[#8a8f98]" />
                <span>Correction Audit Trail</span>
              </div>

              <div className="space-y-2 text-xs">
                {correctionsHistory.map((h) => (
                  <div key={h.id} className="p-2 rounded bg-[#101114] border border-white/[0.04]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-white">{h.fieldKey}</span>
                      <span className="text-[#8a8f98]">{h.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-[#8a8f98] mt-1">
                      <span className="line-through text-rose-400">{h.previousValue}</span> →{' '}
                      <span className="text-[#10b981] font-semibold">{h.correctedValue}</span>
                    </div>
                    <div className="text-[10px] text-[#62666d] mt-1 italic">Reason: {h.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Field Correction Modal */}
      {editingField && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h4 className="text-sm font-semibold text-white">
                Correct Field: {editingField.label}
              </h4>
              <button
                onClick={() => setEditingField(null)}
                className="text-[#8a8f98] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8a8f98] mb-1">Original Extracted Value</label>
                <input
                  type="text"
                  disabled
                  value={editingField.value}
                  className="w-full bg-[#101114] border border-white/[0.08] rounded p-2 text-white font-mono opacity-60"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-1">Calibrated / Corrected Value *</label>
                <input
                  type="text"
                  required
                  value={correctionValue}
                  onChange={(e) => setCorrectionValue(e.target.value)}
                  className="w-full bg-[#101114] border border-white/20 rounded p-2 text-white font-mono focus:border-[#10b981] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-1">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Corrected OCR artifact where character was misread"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full bg-[#101114] border border-white/20 rounded p-2 text-white focus:border-[#10b981] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="btn-primary py-1.5 px-4 text-xs"
                >
                  {submittingCorrection ? 'Recording...' : 'Save & Audit Correction →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
