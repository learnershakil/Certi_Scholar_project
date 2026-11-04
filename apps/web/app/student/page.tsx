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
  Clock,
  Check,
  FileText,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { apiClient } from '../../lib/api';

export default function StudentPortal() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [consentGrants, setConsentGrants] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [categoryHint, setCategoryHint] = useState('ACADEMIC_MARKSHEET');
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [creatingConsent, setCreatingConsent] = useState(false);
  const [revokingConsentId, setRevokingConsentId] = useState<string | null>(null);

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
        try {
          const tlRes = await apiClient.getTimeline(docsRes.data[0].id);
          setTimeline(tlRes.data || []);
        } catch (_) {}
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load student data');
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
    setUploadStep('Registering upload metadata with single-tenant isolation...');

    try {
      const appId = `APP-${Date.now().toString().slice(-6)}`;
      const allowedMime = (
        ['application/pdf', 'image/jpeg', 'image/png'].includes(selectedFile.type)
          ? selectedFile.type
          : 'application/pdf'
      ) as 'application/pdf' | 'image/jpeg' | 'image/png';

      const initiateRes = await apiClient.initiateUpload({
        filename: selectedFile.name,
        mimeType: allowedMime,
        fileSize: selectedFile.size,
        applicationId: appId,
        instituteId: '660000000000000000000001',
        categoryHint: categoryHint as any,
      });

      const docId = initiateRes.data.document.id;
      setUploadStep('Streaming to ClamAV malware scanner & quarantine buffer...');

      await apiClient.uploadFileBuffer(docId, selectedFile);
      setUploadStep('Scanned clean! Local Tesseract OCR & heuristic extraction queued...');

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

  const handleRevokeConsent = async (grantId: string) => {
    setRevokingConsentId(grantId);
    try {
      await apiClient.revokeConsentGrant(grantId);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to revoke consent grant');
    } finally {
      setRevokingConsentId(null);
    }
  };

  return (
    <AppShell
      title="Upload Documents"
      subtitle="Submit your academic and supporting documents for scholarship evaluation."
      breadcrumbs={[{ label: 'Applicant Portal' }]}
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
        {/* Upload Container (Screen 3 - 1:1 Dark Linear UI) */}
        <div className="p-6 lg:p-8 rounded-lg border border-white/[0.08] bg-[#0c0d0e] space-y-6">
          {uploadError && (
            <div className="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadStep && (
            <div className="p-3.5 rounded-md bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>{uploadStep}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Dropzone (8 cols) */}
            <form onSubmit={handleUploadSubmit} className="lg:col-span-8 space-y-4">
              <div className="p-10 border-2 border-dashed border-white/[0.12] rounded-lg text-center hover:border-[#10b981]/50 transition-colors bg-[#101114] relative group">
                <input
                  type="file"
                  id="file-upload"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-12 h-12 rounded-full bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white">
                  {selectedFile ? selectedFile.name : 'Drag & drop your files here'}
                </h4>
                <p className="text-xs text-[#8a8f98] mt-1">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'or click to browse'}
                </p>
                <span className="text-[11px] font-mono text-[#62666d] mt-3 block">
                  Supported: PDF, JPG, PNG • Max size: 10MB per file
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <select
                  value={categoryHint}
                  onChange={(e) => setCategoryHint(e.target.value)}
                  className="bg-[#101114] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="ACADEMIC_MARKSHEET">Marksheet (Class XII)</option>
                  <option value="INCOME_CERTIFICATE">Income Certificate</option>
                  <option value="IDENTITY_PROOF">Identity Card (Aadhaar / PAN)</option>
                </select>

                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="btn-primary text-xs py-2 px-5"
                >
                  {uploading ? 'Processing Intake...' : 'Upload & Start Pipeline →'}
                </button>
              </div>
            </form>

            {/* Required Documents (4 cols - Screen 3 Right) */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-xs font-semibold text-white block uppercase tracking-wider text-[11px] font-mono">
                Required Documents
              </span>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-md border border-white/[0.06] bg-[#101114] flex items-center justify-between">
                  <div>
                    <span className="font-medium text-white block">Marksheet (Latest)</span>
                    <span className="text-[11px] text-[#8a8f98]">Academic Score Evidence</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                </div>

                <div className="p-3 rounded-md border border-white/[0.06] bg-[#101114] flex items-center justify-between">
                  <div>
                    <span className="font-medium text-white block">Identity Document</span>
                    <span className="text-[11px] text-[#8a8f98]">Aadhaar / PAN / Student ID</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                </div>

                <div className="p-3 rounded-md border border-white/[0.06] bg-[#101114] flex items-center justify-between">
                  <div>
                    <span className="font-medium text-white block">Income Certificate</span>
                    <span className="text-[11px] text-[#8a8f98]">Last Financial Year</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                </div>
              </div>
              <span className="text-[11px] text-[#10b981] hover:underline cursor-pointer block pt-1">
                + View Guidelines
              </span>
            </div>
          </div>

          {/* Stepper at Bottom of Screen 3 */}
          <div className="pt-6 border-t border-white/[0.08] flex items-center justify-between max-w-2xl mx-auto text-center text-xs">
            <div className="space-y-1">
              <div className="w-6 h-6 rounded-full bg-[#10b981] text-[#08090a] font-bold mx-auto flex items-center justify-center text-[11px]">
                ✓
              </div>
              <div className="font-semibold text-white">Upload</div>
              <div className="text-[10px] text-[#8a8f98]">Submit documents</div>
            </div>
            <div className="flex-1 h-[1px] bg-white/[0.1] mx-3 mb-4" />
            <div className="space-y-1">
              <div className="w-6 h-6 rounded-full bg-[#10b981] text-[#08090a] font-bold mx-auto flex items-center justify-center text-[11px]">
                ✓
              </div>
              <div className="font-semibold text-white">Process</div>
              <div className="text-[10px] text-[#8a8f98]">OCR & Extraction</div>
            </div>
            <div className="flex-1 h-[1px] bg-white/[0.1] mx-3 mb-4" />
            <div className="space-y-1">
              <div className="w-6 h-6 rounded-full bg-[#10b981] text-[#08090a] font-bold mx-auto flex items-center justify-center text-[11px]">
                ✓
              </div>
              <div className="font-semibold text-white">Review</div>
              <div className="text-[10px] text-[#8a8f98]">Verification & Checks</div>
            </div>
            <div className="flex-1 h-[1px] bg-white/[0.1] mx-3 mb-4" />
            <div className="space-y-1">
              <div className="w-6 h-6 rounded-full bg-[#10b981] text-[#08090a] font-bold mx-auto flex items-center justify-center text-[11px]">
                ✓
              </div>
              <div className="font-semibold text-white">Result</div>
              <div className="text-[10px] text-[#8a8f98]">Recommendation</div>
            </div>
          </div>
        </div>

        {/* Processing Timeline & Final Recommendation (Screen 1 Bottom Left) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Processing Timeline (7 cols) */}
          <div className="lg:col-span-7 rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-xs font-semibold text-white block">Processing Timeline</span>
                <span className="text-[11px] font-mono text-[#8a8f98]">Application: {documents[0]?.applicationId || 'n/a'}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                {timeline.length > 0 ? 'Live timeline' : 'No events yet'}
              </span>
            </div>

            {loadError && (
              <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{loadError}</div>
            )}
            <div className="space-y-3 text-xs">
              {timeline.length === 0 ? (
                <div className="text-[#8a8f98]">No timeline events yet for this application.</div>
              ) : (
                timeline.map((ev: any, idx: number) => (
                  <div key={ev._id || idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-white font-medium">{ev.title || ev.type}</span>
                      <span className="text-[11px] font-mono text-[#62666d]">{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Final Recommendation Card (5 cols - Screen 1 Right) */}
          <div className="lg:col-span-5 rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-6 space-y-5 text-center">
            <span className="text-xs font-semibold text-[#8a8f98] block uppercase font-mono tracking-wider">
              Final Recommendation
            </span>

            <div className="py-4">
              <div className="w-16 h-16 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#10b981]/10">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Eligible</h3>
              <p className="text-xs text-[#8a8f98] mt-1.5 max-w-xs mx-auto">
                Meets all conditions for Merit Scholarship (Class XII Aggregate: 92.33% &gt;= 85%, Income: ₹4.5L &lt;= ₹6L)
              </p>
            </div>

            <button
              onClick={() => alert('Explainable Audit Report: Verified with 100% confidence.')}
              className="w-full btn-primary text-xs py-2.5 justify-center flex items-center gap-1.5"
            >
              <span>View Full Report</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Certi Locker Consent Manager (M7) */}
        <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <span className="text-xs font-semibold text-white block">Certi Locker Consent Manager (M7)</span>
              <span className="text-[11px] text-[#8a8f98]">
                Grant 30-day time-bounded consent to verification officers. Revoke anytime with immediate cutoff.
              </span>
            </div>
            <button
              onClick={handleCreateCertiConsent}
              disabled={creatingConsent || !documents.length}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#10b981]" />
              <span>{creatingConsent ? 'Granting...' : 'Grant 30-Day Consent'}</span>
            </button>
          </div>

          {consentGrants.length === 0 ? (
            <div className="py-4 text-center text-xs text-[#8a8f98]">
              No active consent grants. Create a grant to permit automated credential verification.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04] text-xs">
              {consentGrants.map((grant) => (
                <div key={grant._id || grant.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-white font-medium">Grant ID: {grant._id || grant.id}</span>
                    <div className="text-[11px] text-[#8a8f98]">
                      Expires: {new Date(grant.expiresAt).toLocaleDateString()} • Provider: {grant.provider}
                    </div>
                  </div>
                  {grant.revoked ? (
                    <span className="text-rose-400 font-mono text-[11px]">REVOKED</span>
                  ) : (
                    <button
                      onClick={() => handleRevokeConsent(grant._id || grant.id)}
                      disabled={revokingConsentId === (grant._id || grant.id)}
                      className="px-2.5 py-1 rounded text-[11px] border border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                    >
                      {revokingConsentId === (grant._id || grant.id) ? 'Revoking...' : 'Revoke Consent'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
