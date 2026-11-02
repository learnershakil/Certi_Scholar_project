"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  Lock,
  Edit3,
  ExternalLink,
  Check,
  CheckCircle2,
  ShieldAlert,
  History,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "../../../../components/AppShell";
import { StatusBadge } from "../../../../components/StatusBadge";
import { apiClient } from "../../../../lib/api";

export default function DocumentSideBySideReviewPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.id as string;

  const [reviewData, setReviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Correction Action Form
  const [actionType, setActionType] = useState<
    "APPROVE" | "CORRECT" | "MARK_UNREADABLE" | "REQUEST_REUPLOAD"
  >("CORRECT");
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>("");
  const [correctedValue, setCorrectedValue] = useState<string>("");
  const [reason, setReason] = useState<string>("");
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
        const target = res.data.extraction.fields[0];
        setSelectedFieldKey(target.fieldKey);
        setCorrectedValue(target.normalizedValue || target.rawValue || "");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load document review data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [documentId]);

  const handleSubmitAction = async (overrideAction?: string) => {
    const act = (overrideAction || actionType) as any;
    const rsn =
      reason.trim() ||
      (act === "APPROVE" ? "Verified accurate by Verification Officer." : "");

    if (!rsn) {
      alert("A mandatory reason is required for review actions.");
      return;
    }

    setSubmitting(true);
    setActionSuccess(null);
    setError(null);

    try {
      const expectedVersion = reviewData?.extraction?.version || 1;
      await apiClient.submitReviewAction(documentId, {
        actionType: act,
        fieldKey: act === "CORRECT" ? selectedFieldKey : undefined,
        correctedValue: act === "CORRECT" ? correctedValue : undefined,
        reason: rsn,
        expectedVersion,
      });

      setActionSuccess(
        `Review action [${act}] completed with optimistic version check.`,
      );
      setReason("");
      await loadDetails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell
        title="Review & Correction"
        roleBadge="VERIFICATION OFFICER"
        breadcrumbs={[
          { label: "Review Queue", href: "/verification" },
          { label: documentId?.substring(0, 8) || "Loading..." },
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
        title="Review & Correction"
        roleBadge="VERIFICATION OFFICER"
        breadcrumbs={[
          { label: "Review Queue", href: "/verification" },
          { label: "Error" },
        ]}
      >
        <div className="p-8 rounded-3xl bg-white text-slate-900 shadow-xl max-w-xl mx-auto text-center">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Review Access Blocked
          </h2>
          <p className="text-xs text-rose-600 font-mono mb-6">
            {error || "Unable to load record"}
          </p>
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
      title="Review & Correction"
      subtitle={`Application: ${document.applicationId} • Document: ${document.originalName || document.filename}`}
      roleBadge="VERIFICATION OFFICER"
      breadcrumbs={[
        { label: "Review Queue", href: "/verification" },
        { label: document.originalName || "Document" },
      ]}
      action={
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSubmitAction("MARK_UNREADABLE")}
            disabled={submitting}
            className="px-4 py-1.5 rounded-full border border-rose-500/40 text-rose-400 text-xs font-semibold hover:bg-rose-950/30 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => handleSubmitAction("APPROVE")}
            disabled={submitting}
            className="px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Approve
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* 2-Column Side-by-Side Review Matrix (Matching Screen 4) */}
        <div className="p-8 rounded-3xl bg-white text-slate-900 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Pane: Document Viewer with Bounding Boxes (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 font-mono text-xs text-slate-500">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Evidence Document Preview
              </span>
              {viewUrl && (
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold"
                >
                  Fullscreen <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Simulated Clean Marksheet Preview with Bounding Boxes */}
            <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50 font-mono text-xs relative shadow-inner">
              <div className="text-center font-bold text-slate-800 pb-3 border-b border-slate-200 mb-5">
                <span className="text-sm block font-sans">
                  Board of Secondary Education
                </span>
                <span className="text-xs font-normal text-slate-500">
                  Statement of Marks
                </span>
              </div>

              <div className="space-y-2.5 mb-6 text-slate-800">
                <div>
                  <span className="text-slate-500">Roll No : </span>
                  <span className="border-2 border-emerald-500 bg-emerald-100/70 px-2 py-0.5 rounded font-bold">
                    210314
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Name : </span>
                  <span className="border-2 border-emerald-500 bg-emerald-100/70 px-2 py-0.5 rounded font-bold">
                    Shakil Ahmad
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Class : </span>
                  <span className="border-2 border-emerald-500 bg-emerald-100/70 px-2 py-0.5 rounded font-bold">
                    XII
                  </span>
                </div>
              </div>

              {/* Subject Marks Table */}
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-2 border border-slate-300">Subjects</th>
                    <th className="p-2 border border-slate-300">Max Marks</th>
                    <th className="p-2 border border-slate-300">
                      Marks Obtained
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr>
                    <td className="p-2 border border-slate-300 font-medium">
                      Mathematics
                    </td>
                    <td className="p-2 border border-slate-300 text-slate-600">
                      100
                    </td>
                    <td className="p-2 border border-slate-300 bg-emerald-100/80 font-bold text-emerald-900">
                      95
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-slate-300 font-medium">
                      Physics
                    </td>
                    <td className="p-2 border border-slate-300 text-slate-600">
                      100
                    </td>
                    <td className="p-2 border border-slate-300 bg-emerald-100/80 font-bold text-emerald-900">
                      92
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-slate-300 font-medium">
                      Chemistry
                    </td>
                    <td className="p-2 border border-slate-300 text-slate-600">
                      100
                    </td>
                    <td className="p-2 border border-slate-300 bg-emerald-100/80 font-bold text-emerald-900">
                      90
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 pt-2 text-right text-[10px] text-slate-400 font-mono">
                Tokens parsed: {ocrResult?.pages?.[0]?.tokens?.length || 24} •
                Provider: {ocrResult?.provider || "TESSERACT"}
              </div>
            </div>
          </div>

          {/* Right Pane: Extracted Fields & Correction Form (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                Extracted Fields
              </span>
              <span className="text-[11px] font-mono font-semibold text-slate-400">
                Confidence
              </span>
            </div>

            {/* Extracted Fields List with Confidence */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {[
                {
                  key: "student_name",
                  label: "Student Name",
                  val: "Shakil Ahmad",
                  conf: 0.99,
                },
                {
                  key: "roll_number",
                  label: "Roll Number",
                  val: "210314",
                  conf: 0.98,
                },
                { key: "class", label: "Class", val: "XII", conf: 0.99 },
                {
                  key: "math_marks",
                  label: "Mathematics",
                  val: "95",
                  conf: 0.97,
                },
                {
                  key: "physics_marks",
                  label: "Physics",
                  val: "92",
                  conf: 0.97,
                },
                {
                  key: "chemistry_marks",
                  label: "Chemistry",
                  val: "90",
                  conf: 0.86,
                },
              ].map((row) => (
                <div
                  key={row.key}
                  onClick={() => {
                    setSelectedFieldKey(row.key);
                    setCorrectedValue(row.val);
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                    selectedFieldKey === row.key
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-100 bg-slate-50/70 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {row.label}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {row.val}
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    {row.conf}
                  </span>
                </div>
              ))}
            </div>

            {/* Correction Edit Box with Version Tag */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" /> Correct
                  Field
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                  Lock v{currentExtractionVersion}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Selected Field:{" "}
                  <span className="font-mono text-emerald-700">
                    {selectedFieldKey}
                  </span>
                </label>
                <input
                  type="text"
                  value={correctedValue}
                  onChange={(e) => setCorrectedValue(e.target.value)}
                  placeholder="Verified value"
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Mandatory Audit Justification
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for change..."
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs resize-none"
                />
              </div>

              <button
                onClick={() => handleSubmitAction("CORRECT")}
                disabled={submitting}
                className="w-full btn-primary text-xs py-2 justify-center"
              >
                {submitting
                  ? "Applying Lock..."
                  : "Save Correction (v" + (currentExtractionVersion + 1) + ")"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
