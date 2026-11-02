'use client';

import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileCheck,
  Shield,
  Clock,
  AlertTriangle,
  Award,
  KeyRound,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
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

  // Consent modal state
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

      // If documents exist, check recommendation for the first application
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

      // Refresh documents
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

  const handleRevokeConsent = async (grantId: string) => {
    try {
      await apiClient.revokeConsentGrant(grantId);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to revoke consent');
    }
  };

  return (
    <AppShell
      title="Student Document & Eligibility Workspace"
      subtitle="Upload academic marksheet and revenue certificates for automated intake verification."
      roleBadge="STUDENT APPLICANT"
      breadcrumbs={[{ label: 'Student Workspace' }]}
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
        {/* Upload Card */}
        <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-cyan-400" />
            Secure Document Intake & Scan
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Files are validated against 10MB boundaries and streamed through live ClamAV antivirus.
          </p>

          {uploadError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadStep && (
            <div className="mb-4 p-3 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>{uploadStep}</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Document Category
                </label>
                <select
                  value={categoryHint}
                  onChange={(e) => setCategoryHint(e.target.value)}
                  className="input-field"
                >
                  <option value="ACADEMIC_MARKSHEET">CBSE Class XII Marksheet</option>
                  <option value="INCOME_CERTIFICATE">State Income Certificate</option>
                  <option value="IDENTITY_PROOF">Identity / Student Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select PDF File (Max 10MB)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="input-field text-xs file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="btn-primary text-xs py-2 px-4"
              >
                {uploading ? 'Processing Intake...' : 'Upload & Start Verification Pipeline'}
              </button>
            </div>
          </form>
        </div>

        {/* Uploaded Documents Grid */}
        <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            Submitted Documents & Verification State
          </h2>

          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <FileCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No documents submitted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-2.5 px-3">Filename</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Antivirus Scan</th>
                    <th className="py-2.5 px-3">Pipeline Status</th>
                    <th className="py-2.5 px-3">Application ID</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {documents.map((doc) => (
                    <tr key={doc.id || doc._id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-medium text-white">{doc.originalName || doc.filename}</td>
                      <td className="py-3 px-3 text-slate-300">{doc.category || 'PENDING'}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={doc.scanState || 'CLEAN'} type="scan" />
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={doc.status} type="document" />
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">{doc.applicationId}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={async () => {
                            try {
                              const res = await apiClient.getViewUrl(doc.id || doc._id);
                              window.open(res.data.viewUrl, '_blank');
                            } catch (e) {
                              alert('Unable to load document view URL');
                            }
                          }}
                          className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1"
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

        {/* Explainable Recommendation Dossier (M9) */}
        {recommendation && (
          <div className="glass-panel p-6 rounded-2xl border border-indigo-900/40 bg-gradient-to-br from-indigo-950/20 to-black/60">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                Scholarship Eligibility Determination (M9)
              </h2>
              <StatusBadge status={recommendation.status} />
            </div>

            <p className="text-xs text-slate-400 mb-4 font-mono">
              Confidence Calibrated Score: {(recommendation.confidenceScore * 100).toFixed(1)}% |
              Generated: {new Date(recommendation.createdAt).toLocaleString()}
            </p>

            <div className="p-4 rounded-xl bg-black/50 border border-slate-800 text-sm text-slate-200 leading-relaxed font-sans">
              {recommendation.studentExplanation}
            </div>
          </div>
        )}

        {/* Certi Adapter Locker Consent Manager (M7) */}
        <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                Certi Adapter Digital Locker Consent Grants (M7)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Grant 30-day read-only access to Certi Adapter for authentic issuer retrieval.
              </p>
            </div>
            <button
              onClick={handleCreateCertiConsent}
              disabled={creatingConsent || !documents.length}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              {creatingConsent ? 'Granting Consent...' : 'Grant 30-Day Consent'}
            </button>
          </div>

          {consentGrants.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-800 rounded-lg">
              No active digital locker consent grants recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {consentGrants.map((g) => (
                <div
                  key={g.id || g._id}
                  className="p-3.5 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-white font-mono">{g.provider}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Granted: {new Date(g.grantedAt).toLocaleDateString()} | Expires:{' '}
                      {new Date(g.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    {g.isRevoked ? (
                      <span className="text-xs text-slate-500 font-mono">REVOKED</span>
                    ) : (
                      <button
                        onClick={() => handleRevokeConsent(g.id || g._id)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-mono"
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

