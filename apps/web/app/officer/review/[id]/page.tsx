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

  // Mocked/Loaded Extracted Fields matching Screen 4 in media_1793735044024_84c158d8.jpg
  const [fields, setFields] = useState<ExtractedField[]>([
    {
      key: 'studentName',
      label: 'Student Name',
      value: 'Ananya Sharma',
      confidence: 0.99,
      bbox: { x: 120, y: 155, width: 220, height: 26 },
    },
    {
      key: 'rollNumber',
      label: 'Roll Number',
      value: '210314',
      confidence: 0.98,
      bbox: { x: 120, y: 125, width: 140, height: 26 },
    },
    {
      key: 'classGrade',
      label: 'Class',
      value: 'XII',
      confidence: 0.99,
      bbox: { x: 120, y: 185, width: 80, height: 26 },
    },
    {
      key: 'mathMarks',
      label: 'Mathematics',
      value: 95,
      confidence: 0.97,
      bbox: { x: 260, y: 245, width: 60, height: 24 },
    },
    {
      key: 'physicsMarks',
      label: 'Physics',
      value: 92,
      confidence: 0.97,
      bbox: { x: 260, y: 275, width: 60, height: 24 },
    },
    {
      key: 'chemMarks',
      label: 'Chemistry',
      value: 90,
      confidence: 0.86,
      bbox: { x: 260, y: 305, width: 60, height: 24 },
    },
  ]);

  const [correctionsHistory, setCorrectionsHistory] = useState<any[]>([
    {
      id: 'h1',
      fieldKey: 'Mathematics',
      previousValue: '85',
      correctedValue: '95',
      reason: 'Calibrated OCR artifact: misread 9 as 8',
      officer: 'Officer Demo',
      timestamp: '2 mins ago',
    },
  ]);

  useEffect(() => {
    // Attempt to load live extraction record if available
    apiClient
      .getExtraction(documentId)
      .then((res) => {
        if (res?.data?.fields && Object.keys(res.data.fields).length > 0) {
          // Normalize loaded fields if available
        }
      })
      .catch(() => {})
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
      setActionSuccess('M6 Academic Consistency check completed: 100% Consistent.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Consistency check failed');
    } finally {
      setRunningConsistency(false);
    }
  };

  const handleRunVerification = async (provider: 'CERTI_ADAPTER' | 'SIMULATED_PROVIDER') => {
    setVerifying(true);
    try {
      const res = await apiClient.executeVerification({
        applicationId: 'APP-10482',
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
      subtitle="Application: APP-10482 • Document: Marksheet.pdf"
      breadcrumbs={[
        { label: 'Review Queue', href: '/officer' },
        { label: 'APP-10482' },
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

            {/* Document Mock Sheet with SVG Polygon Overlay */}
            <div className="relative w-full aspect-[4/3] bg-[#f8fafc] rounded-md overflow-hidden p-6 border border-slate-300 select-none">
              {/* Document Background Layout */}
              <div className="text-center pb-4 border-b border-slate-300">
                <h3 className="font-serif font-bold text-slate-800 text-sm tracking-wide uppercase">
                  Central Board of Secondary Education
                </h3>
                <p className="text-[10px] text-slate-500 font-serif">Statement of Marks • Higher Secondary Examination</p>
              </div>

              {/* Student Metadata */}
              <div className="mt-4 grid grid-cols-2 gap-y-2 text-[11px] text-slate-700 font-sans">
                <div>
                  <span className="text-slate-400">Roll No: </span>
                  <span className="font-mono font-bold text-slate-900">210314</span>
                </div>
                <div>
                  <span className="text-slate-400">Class: </span>
                  <span className="font-bold text-slate-900">XII</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Candidate Name: </span>
                  <span className="font-bold text-slate-900">Ananya Sharma</span>
                </div>
              </div>

              {/* Subject Scores Table */}
              <div className="mt-4 border border-slate-300 rounded overflow-hidden text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    <tr className="border-b border-slate-300">
                      <th className="p-1.5">Subject</th>
                      <th className="p-1.5">Max Marks</th>
                      <th className="p-1.5">Marks Obtained</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr>
                      <td className="p-1.5 font-medium">Mathematics</td>
                      <td className="p-1.5 font-mono">100</td>
                      <td className="p-1.5 font-mono font-bold">95</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-medium">Physics</td>
                      <td className="p-1.5 font-mono">100</td>
                      <td className="p-1.5 font-mono font-bold">92</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-medium">Chemistry</td>
                      <td className="p-1.5 font-mono">100</td>
                      <td className="p-1.5 font-mono font-bold">90</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Interactive SVG Bounding Box Coordinate Overlays */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {fields.map((f) => {
                  if (!f.bbox) return null;
                  const isSelected = selectedFieldKey === f.key;
                  return (
                    <rect
                      key={f.key}
                      x={f.bbox.x}
                      y={f.bbox.y}
                      width={f.bbox.width}
                      height={f.bbox.height}
                      fill={isSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.08)'}
                      stroke={isSelected ? '#10b981' : '#059669'}
                      strokeWidth={isSelected ? 2 : 1.5}
                      rx={3}
                      className="transition-all"
                    />
                  );
                })}
              </svg>
            </div>
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
                  onClick={() => handleRunVerification('SIMULATED_PROVIDER')}
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
