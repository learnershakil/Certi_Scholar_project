'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileCheck,
  Shield,
  KeyRound,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import { apiClient } from '../../lib/api';

export default function StudentPortal() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [consentGrants, setConsentGrants] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [categoryHint, setCategoryHint] = useState('ACADEMIC_MARKSHEET');
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [creatingConsent, setCreatingConsent] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const meRes = await apiClient.getMe();
      setCurrentUser(meRes.data);

      const docsRes = await apiClient.listDocuments();
      setDocuments(docsRes.data || []);

      const consentRes = await apiClient.getConsentGrants();
      setConsentGrants(consentRes.data || []);

      if (docsRes.data && docsRes.data.length > 0 && docsRes.data[0]) {
        const appId = docsRes.data[0].applicationId;
        try {
          const recRes = await apiClient.getRecommendation(appId);
          setRecommendation(recRes.data);
        } catch (_) {}
      }
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File exceeds mandatory 10MB bounds limit');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);
    setUploadStep('Registering upload metadata...');

    try {
      const appId = `APP-${Date.now().toString().slice(-6)}`;
      const allowedMime = (['application/pdf', 'image/jpeg', 'image/png'].includes(selectedFile.type)
        ? selectedFile.type
        : 'application/pdf') as 'application/pdf' | 'image/jpeg' | 'image/png';

      const initiateRes = await apiClient.initiateUpload({
        filename: selectedFile.name,
        mimeType: allowedMime,
        fileSize: selectedFile.size,
        applicationId: appId,
        instituteId: currentUser?.instituteId || 'INST_DEFAULT',
        categoryHint: categoryHint as any,
      });

      const docId = initiateRes.data.document.id;
      setUploadStep('Streaming to ClamAV malware scanner & quarantine buffer...');

      await apiClient.uploadFileBuffer(docId, selectedFile);
      setUploadStep('Scanned clean! BullMQ worker queued for OCR & extraction...');

      await loadData();
      setSelectedFile(null);
      setTimeout(() => setUploadStep(null), 3000);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCertiConsent = async () => {
    if (!documents.length) return;
    setCreatingConsent(true);
    try {
      const docIds = documents.map((d) => d.id || d._id);
      await apiClient.createConsentGrant({
        instituteId: currentUser?.instituteId || 'INST_DEFAULT',
        provider: 'CERTI_ADAPTER',
        selectedDocumentIds: docIds,
        durationDays: 30,
      });
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create consent grant');
    } finally {
      setCreatingConsent(false);
    }
  };

  return (
    <AppShell
      title="Upload Documents"
      subtitle="Submit your academic and supporting documents for scholarship evaluation."
      roleBadge="STUDENT APPLICANT"
      breadcrumbs={[{ label: 'Upload Documents' }]}
      action={
        <button
          onClick={loadData}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      }
    >
      <div className="space-y-8">
        {/* Upload Container (Matching Screen 3) */}
        <div className="p-8 rounded-3xl bg-white text-slate-900 shadow-xl">
          {uploadError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadStep && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>{uploadStep}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Dropzone (8 cols) */}
            <form onSubmit={handleUploadSubmit} className="lg:col-span-8 space-y-4">
              <div className="p-10 border-2 border-dashed border-slate-300 rounded-2xl text-center hover:border-emerald-500 transition-colors bg-slate-50/60 relative">
                <input
                  type="file"
                  id="file-upload"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  {selectedFile ? selectedFile.name : 'Drag & drop your files here'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'or click to browse'}
                </p>
                <span className="text-[11px] font-mono text-slate-400 mt-3 block">
                  Supported: PDF, JPG, PNG • Max size: 10MB per file
                </span>
              </div>

              <div className="flex items-center justify-between">
                <select
                  value={categoryHint}
                  onChange={(e) => setCategoryHint(e.target.value)}
                  className="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800"
                >
                  <option value="ACADEMIC_MARKSHEET">Marksheet (Class XII)</option>
                  <option value="INCOME_CERTIFICATE">Income Certificate</option>
                  <option value="IDENTITY_PROOF">Identity Card</option>
                </select>

                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="btn-primary text-xs py-2 px-6"
                >
                  {uploading ? 'Scanning & Ingesting...' : 'Upload & Start Pipeline →'}
                </button>
              </div>
            </form>

            {/* Required Documents (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider block mb-2">
                Required Documents
              </span>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-800">Marksheet (Latest)</span>
                    <span className="text-[10px] text-slate-500">Academic Score Evidence</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-800">Identity Document</span>
                    <span className="text-[10px] text-slate-500">Aadhaar / PAN / Student ID</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-800">Income Certificate</span>
                    <span className="text-[10px] text-slate-500">Last Financial Year</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 cursor-pointer block pt-2">
                + View Guidelines
              </span>
            </div>
          </div>

          {/* Stepper at Bottom of Screen 3 */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between max-w-2xl mx-auto text-center">
            <div>
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mx-auto mb-1">
                1
              </div>
              <span className="text-xs font-bold text-slate-800 block">Upload</span>
              <span className="text-[10px] text-slate-400">Submit documents</span>
            </div>
            <div className="w-16 h-0.5 bg-emerald-500" />
            <div>
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mx-auto mb-1">
                2
              </div>
              <span className="text-xs font-bold text-slate-800 block">Process</span>
              <span className="text-[10px] text-slate-400">OCR & Extraction</span>
            </div>
            <div className="w-16 h-0.5 bg-emerald-500" />
            <div>
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mx-auto mb-1">
                3
              </div>
              <span className="text-xs font-bold text-slate-800 block">Review</span>
              <span className="text-[10px] text-slate-400">Verification & Checks</span>
            </div>
            <div className="w-16 h-0.5 bg-slate-200" />
            <div>
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center mx-auto mb-1">
                4
              </div>
              <span className="text-xs font-bold text-slate-500 block">Result</span>
              <span className="text-[10px] text-slate-400">Recommendation</span>
            </div>
          </div>
        </div>

        {/* Submitted Documents & Timeline */}
        <div className="glass-panel p-6 rounded-3xl border border-[#143327]">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            Submitted Documents & Status
          </h3>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No documents submitted yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#143327] text-slate-400 font-mono text-[11px]">
                    <th className="py-2.5 px-3">Filename</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Antivirus Scan</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#143327]/60">
                  {documents.map((doc) => (
                    <tr key={doc.id || doc._id} className="hover:bg-emerald-950/20">
                      <td className="py-3 px-3 font-semibold text-white">{doc.originalName || doc.filename}</td>
                      <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">{doc.category || 'PENDING'}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={doc.scanState || 'CLEAN'} type="scan" />
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={async () => {
                            try {
                              const res = await apiClient.getViewUrl(doc.id || doc._id);
                              window.open(res.data.viewUrl, '_blank');
                            } catch (e) {
                              alert('Preview URL generation failed');
                            }
                          }}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Explainable Recommendation (Screen 6 Preview) */}
        {recommendation && (
          <div className="p-8 rounded-3xl bg-white text-slate-900 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider block mb-1">
                Final Recommendation
              </span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">{recommendation.status}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {(recommendation.confidenceScore * 100).toFixed(0)}% Score
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 max-w-xl">{recommendation.studentExplanation}</p>
            </div>

            <Link href="/scholarship" className="btn-pill-white bg-slate-900 text-white text-xs py-3 px-6 shadow hover:bg-slate-800 shrink-0">
              View Dossier Details →
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
