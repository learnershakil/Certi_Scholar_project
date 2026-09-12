'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileCheck,
  Building2,
  Users,
  Award,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Eye,
  FileText,
  UploadCloud,
  FileWarning,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { DocumentProcessingState, ScanState } from '@repo/contracts';

export default function CertiScholarHomePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'intake_demo' | 'architecture' | 'roles'>('overview');
  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'OFFICER' | 'ADMIN'>('STUDENT');
  
  // Intake interactive demo state
  const [uploadStatus, setUploadStatus] = useState<string>('IDLE');
  const [simulatedFile, setSimulatedFile] = useState<'CLEAN_PDF' | 'MALICIOUS_JS' | 'EICAR_INFECTED' | 'SPOOFED_MIME'>('CLEAN_PDF');
  const [intakeOutput, setIntakeOutput] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  const handleSimulatedIntake = async () => {
    setIsProcessing(true);
    setUploadStatus('INGESTING');
    setIntakeOutput(null);

    try {
      // 1. Simulate client-side intake payload
      let sampleBuffer: Uint8Array;
      let filename = 'cbse_class_xii_marksheet.pdf';
      const mimeType: 'application/pdf' = 'application/pdf';

      if (simulatedFile === 'CLEAN_PDF') {
        const text = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n206\n%%EOF';
        sampleBuffer = new TextEncoder().encode(text);
      } else if (simulatedFile === 'MALICIOUS_JS') {
        filename = 'suspicious_payload.pdf';
        const text = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /OpenAction 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Action /S /JavaScript /JS (app.alert("malicious script");) >>\nendobj\n%%EOF';
        sampleBuffer = new TextEncoder().encode(text);
      } else if (simulatedFile === 'EICAR_INFECTED') {
        filename = 'eicar_test_doc.pdf';
        const text = '%PDF-1.4\nX5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*\n%%EOF';
        sampleBuffer = new TextEncoder().encode(text);
      } else {
        filename = 'spoofed_exe.pdf';
        const text = 'MZ\x90\x00\x03\x00\x00\x00Binary Executable masquerading as PDF';
        sampleBuffer = new TextEncoder().encode(text);
      }

      // Step A: Register Upload via BFF
      setUploadStatus('REGISTERING');
      const fileBlob = new Blob([sampleBuffer.buffer as ArrayBuffer], { type: mimeType });
      const file = new File([fileBlob], filename, { type: mimeType });

      // Create an anonymous/demo session if needed
      const auth = await apiClient.verifyOtp('demo-student@certischolar.edu', '123456', '60c72b2f9b1d8b2bad000001').catch(() => null);

      const reg = await apiClient.initiateUpload({
        filename,
        mimeType,
        fileSize: sampleBuffer.length,
        applicationId: 'APP-DEMO-2026',
        instituteId: '60c72b2f9b1d8b2bad000001',
      });

      setUploadStatus('SCANNING');
      
      // Step B: Upload buffer & execute pipeline
      const uploaded = await apiClient.uploadFileBuffer(reg.data.document.id || (reg.data.document as any)._id, file);

      setIntakeOutput(uploaded.data);
      setUploadStatus('COMPLETED');

      // Fetch timeline
      const tl = await apiClient.getTimeline(uploaded.data.id || (uploaded.data as any)._id);
      setTimelineEvents(tl.data || []);
    } catch (err: any) {
      setUploadStatus('ERROR');
      setIntakeOutput({ error: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F3F4F6] selection:bg-[#3B82F6]/30 font-sans antialiased">
      {/* Institutional Top Header */}
      <header className="border-b border-white/[0.08] backdrop-blur-xl bg-[#07090E]/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                CertiScholar
                <span className="text-[10px] tracking-wider uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  P12 Track J
                </span>
              </span>
              <p className="text-xs text-neutral-400 font-mono">OCR Verification & Explainable Eligibility Platform</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1 border border-white/[0.08] p-1 rounded-full bg-white/[0.02]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              System Overview
            </button>
            <button
              onClick={() => setActiveTab('intake_demo')}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                activeTab === 'intake_demo'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              M1 Secure Intake Sandbox
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Security & x-http-key Proxy
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                activeTab === 'roles'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Tenancy & Roles
            </button>
          </nav>

          <div className="flex items-center space-x-3">
            <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Node API & MongoDB Healthy
            </span>
            <a
              href="#sandbox"
              onClick={() => setActiveTab('intake_demo')}
              className="text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20"
            >
              Try Intake
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {/* Editorial Hero */}
        {activeTab === 'overview' && (
          <section className="space-y-12">
            <div className="max-w-4xl space-y-6 pt-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/40 border border-blue-500/30 text-blue-400 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Deterministic Integrity • Multi-Tenant SaaS • Explainable Decisions</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-serif tracking-tight text-white leading-[1.15]">
                Intelligent document intake and{' '}
                <span className="italic font-light text-neutral-300">explainable scholarship eligibility</span> with human oversight.
              </h1>
              <p className="text-lg text-neutral-300 leading-relaxed max-w-2xl font-light">
                CertiScholar replaces manual, inconsistent academic evaluations with a rigorous multi-stage pipeline:
                magic-byte intake, document-level OCR, schema-constrained classification, side-by-side human correction,
                mathematical verification, and auditable scholarship decisions.
              </p>
            </div>

            {/* Authenticity Principle Banner */}
            <div className="p-6 rounded-2xl bg-[#0F1420] border border-blue-500/20 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                  The Non-Negotiable Authenticity Principle
                </h3>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-4xl">
                OCR extraction, Gemini classification, internal formula recalculation, human correction, or a local demo match
                <strong> does not by itself prove document authenticity</strong>. In CertiScholar, only an authorized issuer or
                trusted credential provider (e.g. DigiLocker partner response with verified signature) can confer an authentic
                issuer verification status. All extraction, shared consent, and mathematical checks are transparently distinguished.
              </p>
            </div>

            {/* 10-Module Pipeline Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4">
              {[
                { step: 'M1', title: 'Secure Intake', desc: 'Magic bytes, structural PDF checks, malware quarantine, private R2', active: true },
                { step: 'M2', title: 'OCR & Geometry', desc: 'Google Cloud Vision, normalized bounding polygons & words' },
                { step: 'M3', title: 'Classification', desc: 'Gemini structured JSON, allowlisted categories & DB profiles' },
                { step: 'M4', title: 'Extraction', desc: 'Profile fields, measured confidence, uncertainty routing' },
                { step: 'M5', title: 'Human Review', desc: 'Side-by-side PDF viewer, bounding-box overlay, audited reason' },
                { step: 'M6', title: 'Consistency', desc: 'Subject recalculation, printed total mismatch detection' },
                { step: 'M7', title: 'Verification', desc: 'DigiLocker adapter, Certi consent locker, manual fallback' },
                { step: 'M8', title: 'Rule Engine', desc: 'Nested AND/OR JSON AST, no-code institute rule builder' },
                { step: 'M9', title: 'Recommendation', desc: 'Condition-by-condition provenance, student & officer report' },
                { step: 'M10', title: 'Audit & Timeline', desc: 'Document view audit, processing timeline, metrics & export' },
              ].map((m) => (
                <div
                  key={m.step}
                  className={`p-5 rounded-xl border transition-all ${
                    m.active
                      ? 'bg-blue-950/20 border-blue-500/40 shadow-lg shadow-blue-900/10'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {m.step}
                    </span>
                    {m.active && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Live M1
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-white mb-1">{m.title}</h4>
                  <p className="text-xs text-neutral-400 leading-normal">{m.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* M1 Interactive Intake Sandbox */}
        {activeTab === 'intake_demo' && (
          <section id="sandbox" className="space-y-8">
            <div className="max-w-3xl space-y-2">
              <h2 className="text-2xl font-serif text-white">M1 Document Intake & Security Sandbox</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Test the intake pipeline directly. Select a benign academic document, a PDF with embedded malicious JavaScript,
                an EICAR virus test payload, or an invalid spoofed file. Observe how the system enforces quarantine, structural
                validation, and safe storage promotion.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Controls Column */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 rounded-2xl bg-[#0F1420] border border-white/[0.08] space-y-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
                    1. Select Test Document Payload
                  </h3>
                  
                  <div className="space-y-3">
                    {[
                      {
                        id: 'CLEAN_PDF',
                        title: 'Clean CBSE Marksheet PDF',
                        desc: 'Valid %PDF-1.7 header, proper EOF, clean catalog, no malicious scripts.',
                        badge: 'EXPECTED: CLEAN',
                        badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      },
                      {
                        id: 'MALICIOUS_JS',
                        title: 'PDF with Embedded JavaScript',
                        desc: 'Contains /JavaScript and /OpenAction objects. Flags active script execution.',
                        badge: 'EXPECTED: QUARANTINED',
                        badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                      },
                      {
                        id: 'EICAR_INFECTED',
                        title: 'EICAR Standard Antivirus Test',
                        desc: 'Contains synthetic EICAR virus signature. Triggers immediate malware quarantine.',
                        badge: 'EXPECTED: INFECTED',
                        badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                      },
                      {
                        id: 'SPOOFED_MIME',
                        title: 'Spoofed MIME / Invalid Magic Bytes',
                        desc: 'Declared as application/pdf but actual binary is an executable payload.',
                        badge: 'EXPECTED: REJECTED',
                        badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                      },
                    ].map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSimulatedFile(item.id as any)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          simulatedFile === item.id
                            ? 'bg-blue-900/20 border-blue-500/50 shadow-md shadow-blue-900/20'
                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">{item.title}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSimulatedIntake}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing Intake via Next BFF Proxy...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Execute Intake Verification</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Output Display Column */}
              <div className="lg:col-span-7 space-y-6">
                <div className="p-6 rounded-2xl bg-[#0F1420] border border-white/[0.08] space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                        Intake Result & Security State
                      </h3>
                    </div>
                    {uploadStatus !== 'IDLE' && (
                      <span className="text-xs font-mono text-neutral-400 uppercase">
                        State: <strong className="text-blue-400">{uploadStatus}</strong>
                      </span>
                    )}
                  </div>

                  {!intakeOutput && !isProcessing && (
                    <div className="py-16 text-center space-y-3">
                      <UploadCloud className="w-12 h-12 text-neutral-600 mx-auto stroke-[1.5]" />
                      <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                        Choose a test payload on the left and run verification to inspect real-time intake telemetry.
                      </p>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="py-16 text-center space-y-4">
                      <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-neutral-300 font-mono">
                        Validating magic bytes &rarr; PDF structure &rarr; Antivirus scan &rarr; Quarantine storage
                      </p>
                    </div>
                  )}

                  {intakeOutput && !isProcessing && (
                    <div className="space-y-6">
                      {/* Status Banner */}
                      <div
                        className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                          intakeOutput.status === 'PROCESSING_QUEUED'
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {intakeOutput.status === 'PROCESSING_QUEUED' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <FileWarning className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">
                            {intakeOutput.status === 'PROCESSING_QUEUED'
                              ? 'Security Cleared — Document Accepted & Promoted'
                              : 'Security Alert — Document Quarantined & Rejected'}
                          </h4>
                          <p className="text-xs opacity-90 leading-relaxed font-mono">
                            Status: {intakeOutput.status} | Scan State: {intakeOutput.scanState}
                          </p>
                        </div>
                      </div>

                      {/* Technical Details Grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-3.5 rounded-lg bg-black/30 border border-white/[0.04] space-y-1">
                          <span className="text-neutral-500 block">SHA-256 Integrity Checksum</span>
                          <span className="text-neutral-300 break-all select-all font-mono text-[11px]">
                            {intakeOutput.checksumSha256 || 'N/A'}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-lg bg-black/30 border border-white/[0.04] space-y-1">
                          <span className="text-neutral-500 block">Storage Location (R2/Local)</span>
                          <span className="text-neutral-300 break-all font-mono text-[11px]">
                            {intakeOutput.storageKey || 'quarantine/restricted'}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-lg bg-black/30 border border-white/[0.04] space-y-1">
                          <span className="text-neutral-500 block">Antivirus / Heuristics Engine</span>
                          <span className="text-neutral-300">
                            {intakeOutput.scanDetails?.engine || 'CertiScholar-StaticHeuristics'}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-lg bg-black/30 border border-white/[0.04] space-y-1">
                          <span className="text-neutral-500 block">Identified Security Flags</span>
                          <span className="text-amber-400 font-semibold">
                            {intakeOutput.scanDetails?.pdfSecurityFlags?.join(', ') || 'None (Clean)'}
                          </span>
                        </div>
                      </div>

                      {/* Ordered Processing Timeline */}
                      {timelineEvents.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Application Processing Timeline (M10 Integrated)
                          </h4>
                          <div className="space-y-2 border-l border-white/[0.08] ml-2 pl-4">
                            {timelineEvents.map((evt, idx) => (
                              <div key={idx} className="space-y-0.5 relative">
                                <div className="w-2 h-2 rounded-full bg-blue-400 absolute -left-[21px] top-1.5" />
                                <span className="text-xs font-semibold text-neutral-200 block">{evt.title}</span>
                                <p className="text-[11px] text-neutral-400">{evt.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Security & Architecture Details */}
        {activeTab === 'architecture' && (
          <section className="space-y-8">
            <div className="max-w-3xl space-y-2">
              <h2 className="text-2xl font-serif text-white">Next.js BFF Proxy & `x-http-key` Security</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                CertiScholar strictly isolates the central Node.js API behind a server-side Next.js BFF proxy.
                Browser client scripts never speak directly with the backend API or possess backend secret keys.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0F1420] border border-white/[0.08] space-y-6">
              <div className="bg-black/50 p-6 rounded-xl border border-white/[0.06] font-mono text-xs text-neutral-300 leading-relaxed overflow-x-auto">
                <p className="text-blue-400">// Request Path Architecture</p>
                <p className="mt-2 text-white">Browser Client (Same-Origin)</p>
                <p className="text-neutral-500">  &darr; calls /api/bff/v1/documents</p>
                <p className="text-white">Next.js Route Handler (Server-Side)</p>
                <p className="text-neutral-500">  &bull; Discards any incoming client-supplied x-http-key</p>
                <p className="text-neutral-500">  &bull; Injects trusted server-only process.env.NODE_API_HTTP_KEY</p>
                <p className="text-neutral-500">  &bull; Proxies request stream</p>
                <p className="text-neutral-500">  &darr; forwarded to Node API</p>
                <p className="text-white">Node.js TypeScript API (Private Backend)</p>
                <p className="text-neutral-500">  &bull; Constant-time crypto.timingSafeEqual validation on x-http-key</p>
                <p className="text-neutral-500">  &bull; Enforces JWT Session authentication</p>
                <p className="text-neutral-500">  &bull; Enforces Institute Tenancy (instituteId scoping)</p>
                <p className="text-neutral-500">  &bull; Enforces Case Assignment & Role RBAC</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Zero Key Leakage
                  </h4>
                  <p className="text-neutral-400 leading-relaxed">
                    The service key is strictly server-only. It is never prefixed with NEXT_PUBLIC_ and never appears in client bundles.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-blue-400" />
                    Constant-Time Comparison
                  </h4>
                  <p className="text-neutral-400 leading-relaxed">
                    Node API compares header buffers using cryptographic constant-time comparison to defeat timing attack exploits.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-amber-400" />
                    Audited Document Views
                  </h4>
                  <p className="text-neutral-400 leading-relaxed">
                    Whenever presigned view URLs are generated, an immutable view entry is registered with actor, IP, timestamp, and reason.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Roles & Tenancy */}
        {activeTab === 'roles' && (
          <section className="space-y-8">
            <div className="max-w-3xl space-y-2">
              <h2 className="text-2xl font-serif text-white">Multi-Institute Tenancy Hierarchy</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                CertiScholar is built on a shared-platform, multi-tenant architecture. Every document, job, rule, and audit entry
                is bound to an instituteId. Cross-institute data access is mathematically prohibited at database and query layers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  role: 'STUDENT',
                  name: 'Student Portal',
                  desc: 'Owns profile, uploads academic & income proofs, manages first-party Certi Adapter document sharing and consent revocation.',
                  perms: ['Upload documents', 'View own timeline', 'Grant/Revoke Certi consent', 'View eligibility status'],
                },
                {
                  role: 'VERIFICATION_OFFICER',
                  name: 'Verification Officer',
                  desc: 'Assigned by Institute Admin to specific document cases. Inspects side-by-side OCR viewer, approves or corrects values with reason.',
                  perms: ['Review assigned cases', 'Approve/Correct fields', 'Request document re-upload', 'Audit-logged views'],
                },
                {
                  role: 'INSTITUTE_ADMIN',
                  name: 'Institute Administrator',
                  desc: 'Manages institute staff, assigns review responsibilities, configures nested AND/OR scholarship rules without code changes.',
                  perms: ['Manage institute staff', 'Configure scholarship rules', 'Assign officer cases', 'Export award lists'],
                },
              ].map((r) => (
                <div key={r.role} className="p-6 rounded-2xl bg-[#0F1420] border border-white/[0.08] space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">{r.name}</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{r.desc}</p>
                  <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-neutral-500">Authorized Capabilities</span>
                    {r.perms.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-neutral-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-white/[0.08] py-12 bg-black/40 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500 font-mono">
          <div>
            <p>CertiScholar &bull; P12 OCR-Based Document Verification & Explainable Eligibility Platform</p>
            <p className="text-[11px] text-neutral-600 mt-1">
              Multi-Institute SaaS Architecture &bull; Monorepo Track J
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <span>Declared Start: 06 Sep 2026</span>
            <span>Local Time: 02 Nov 2026</span>
            <span className="text-emerald-400">M1 Live</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
