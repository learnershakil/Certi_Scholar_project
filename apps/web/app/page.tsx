'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../components/Navbar';
import { apiClient } from '../lib/api';
import { Check, AlertCircle, ArrowRight, Shield, RefreshCw } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  // Login form state
  const [email, setEmail] = useState('student@certischolar.edu');
  const [otpCode, setOtpCode] = useState('123456');
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.requestOtp(email);
      setSuccessMsg(res.data?.message || 'Verification code delivered via local Nodemailer.');
      setStep('VERIFY');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.verifyOtp(email, otpCode);
      const role = res.user?.role;
      if (role === 'STUDENT') {
        router.push('/student');
      } else if (role === 'OFFICER') {
        router.push('/officer');
      } else {
        router.push('/admin');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#08090a] text-[#f7f8f8] antialiased">
      <Navbar />

      {/* Hero Section + Login Gate */}
      <section className="pt-16 pb-20 max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column (Headline + Subtitle) */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-[-0.035em] text-[#f7f8f8] leading-[1.06]">
              Document verification system for institutions and officers
            </h1>
            <p className="text-base sm:text-lg text-[#8a8f98] max-w-xl font-normal leading-relaxed">
              Purpose-built for single-organization scholarship intake, local Tesseract OCR,
              arithmetic consistency, and explainable eligibility.
            </p>
          </div>

          {/* Right Column (Embedded Email OTP Login Card) */}
          <div className="lg:col-span-5" id="login-portal">
            <div className="bg-[#0c0d0e] border border-white/[0.1] rounded-xl p-6 shadow-2xl relative">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[#8a8f98]">
                    Single-Tenant Gate
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#62666d]">Nodemailer SMTP</span>
              </div>

              {error && (
                <div className="mb-4 p-2.5 rounded bg-rose-950/60 border border-rose-900/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-2.5 rounded bg-emerald-950/60 border border-emerald-900/80 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {step === 'REQUEST' ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#8a8f98] mb-1.5">
                      Organization Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@certischolar.edu"
                      className="linear-input text-sm py-2"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] font-mono text-[#62666d] mb-1.5 uppercase">
                      1-Click Demo Accounts:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDemoAccount('student@certischolar.edu')}
                        className={`text-left p-1.5 rounded border text-[11px] font-mono transition-colors ${
                          email === 'student@certischolar.edu'
                            ? 'bg-white/[0.08] border-white/20 text-[#f7f8f8]'
                            : 'bg-white/[0.02] border-white/[0.06] text-[#8a8f98] hover:bg-white/[0.04]'
                        }`}
                      >
                        student
                      </button>
                      <button
                        type="button"
                        onClick={() => setDemoAccount('officer@certischolar.edu')}
                        className={`text-left p-1.5 rounded border text-[11px] font-mono transition-colors ${
                          email === 'officer@certischolar.edu'
                            ? 'bg-white/[0.08] border-white/20 text-[#f7f8f8]'
                            : 'bg-white/[0.02] border-white/[0.06] text-[#8a8f98] hover:bg-white/[0.04]'
                        }`}
                      >
                        officer
                      </button>
                      <button
                        type="button"
                        onClick={() => setDemoAccount('admin@certischolar.edu')}
                        className={`text-left p-1.5 rounded border text-[11px] font-mono transition-colors ${
                          email === 'admin@certischolar.edu'
                            ? 'bg-white/[0.08] border-white/20 text-[#f7f8f8]'
                            : 'bg-white/[0.02] border-white/[0.06] text-[#8a8f98] hover:bg-white/[0.04]'
                        }`}
                      >
                        admin
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-linear-primary py-2 text-[13px] mt-2"
                  >
                    {loading ? 'Dispatching...' : 'Send 6-Digit OTP via Nodemailer →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[12px] font-medium text-[#8a8f98]">
                        Enter 6-Digit OTP Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setStep('REQUEST')}
                        className="text-[11px] text-[#8a8f98] hover:text-[#f7f8f8] underline"
                      >
                        Change Email
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="linear-input text-center text-lg font-mono tracking-[0.35em] py-2"
                    />
                    <span className="block text-[11px] text-[#62666d] mt-1 font-mono">
                      Dispatched via local Nodemailer SMTP (127.0.0.1:1025). Demo code: 123456.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-linear-primary py-2 text-[13px]"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enter Workspace →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width 3-Pane Application Preview Window Below Hero */}
        <div className="mt-16 bg-[#0c0d0e] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8)] relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
            {/* Left Pane (220px / 3 cols) */}
            <div className="lg:col-span-3 border-r border-white/[0.08] p-4 bg-[#08090a]/50 text-xs space-y-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#62666d] block">
                Queue & Navigation
              </span>
              <div className="space-y-1">
                <div className="p-2 rounded bg-white/[0.08] text-[#f7f8f8] font-medium flex items-center justify-between">
                  <span>DOC-8453 CBSE Marksheet</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                </div>
                <div className="p-2 rounded text-[#8a8f98] hover:text-[#f7f8f8]">
                  DOC-8452 State Income Certificate
                </div>
                <div className="p-2 rounded text-[#8a8f98] hover:text-[#f7f8f8]">
                  DOC-8451 Aadhaar Card
                </div>
              </div>
            </div>

            {/* Center Pane (6 cols) */}
            <div className="lg:col-span-6 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#f7f8f8]">
                  DOC-8453 CBSE Class XII Marksheet Verification
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-[#8a8f98]">
                  CBSE_XII_MARKSHEET_2024
                </span>
                <span className="text-[10px] font-mono text-[#10b981]">96.2% Conf</span>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-2.5 pt-2 text-xs">
                <div className="flex items-center gap-2 text-[#8a8f98]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  <span>ClamAV Scan Clean &bull; Magic bytes verified (%PDF-1.4)</span>
                </div>
                <div className="flex items-center gap-2 text-[#8a8f98]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  <span>Local Tesseract OCR extracted 18 tokens with geometry bounding</span>
                </div>
                <div className="flex items-center gap-2 text-[#8a8f98]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  <span>Arithmetic Consistency Verified &bull; 452/500 = 90.4% matches printed</span>
                </div>
              </div>
            </div>

            {/* Right Floating Overlay Card (3 cols) */}
            <div className="lg:col-span-3 p-4 bg-[#121316] border-l border-white/[0.12] text-xs font-mono space-y-2">
              <div className="flex justify-between items-center text-[#8a8f98] pb-1 border-b border-white/[0.06]">
                <span>Diff Inspector v1.0</span>
                <span className="text-[#10b981]">APPROVED</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="text-[#f43f5e]">- rawValue: &quot;45O&quot;</div>
                <div className="text-[#10b981]">+ normalizedValue: 450</div>
                <div className="text-[#62666d]">// Verified by Officer against Page 1 polygon</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Split-Contrast Statement */}
      <section id="architecture" className="py-20 border-t border-white/[0.08] max-w-[1200px] mx-auto px-6">
        <p className="text-2xl sm:text-4xl font-medium leading-[1.25] tracking-[-0.02em]">
          <span className="text-[#f7f8f8]">
            A new standard for institutional document verification.{' '}
          </span>
          <span className="text-[#8a8f98]">
            Running 100% locally with zero third-party cloud dependencies, CertiScholar pairs
            deterministic OCR geometry with explainable scholarship rules.
          </span>
        </p>
      </section>

      {/* 3-Column Isometric Wireframe Grid */}
      <section id="intake-ocr" className="border-t border-b border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
          {/* FIG 0.1 */}
          <div className="p-8 space-y-6 group hover:bg-white/[0.01] transition-colors">
            <span className="text-[11px] font-mono text-[#62666d]">FIG 0.1</span>
            {/* SVG Wireframe 1: Stacked Planes */}
            <div className="h-40 flex items-center justify-center">
              <svg width="140" height="110" viewBox="0 0 140 110" fill="none" className="stroke-white/30 group-hover:stroke-white/60 transition-colors">
                <path d="M70 15 L120 40 L70 65 L20 40 Z" strokeWidth="1" />
                <path d="M70 35 L120 60 L70 85 L20 60 Z" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M70 55 L120 80 L70 105 L20 80 Z" strokeWidth="1" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#f7f8f8] mb-1">Quarantine-first intake</h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                Magic-byte inspection, PDF /JavaScript blocking, and streaming socket ClamAV malware scanning.
              </p>
            </div>
          </div>

          {/* FIG 0.2 */}
          <div className="p-8 space-y-6 group hover:bg-white/[0.01] transition-colors">
            <span className="text-[11px] font-mono text-[#62666d]">FIG 0.2</span>
            {/* SVG Wireframe 2: Isometric Cube Cluster */}
            <div className="h-40 flex items-center justify-center">
              <svg width="140" height="110" viewBox="0 0 140 110" fill="none" className="stroke-white/30 group-hover:stroke-white/60 transition-colors">
                <rect x="35" y="25" width="30" height="30" strokeWidth="1" />
                <rect x="75" y="25" width="30" height="30" strokeWidth="1" />
                <rect x="55" y="55" width="30" height="30" strokeWidth="1" />
                <line x1="50" y1="55" x2="70" y2="25" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#f7f8f8] mb-1">Local OCR & geometry binding</h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                Local Tesseract OCR extracts word coordinates and binds verified polygons directly to fields.
              </p>
            </div>
          </div>

          {/* FIG 0.3 */}
          <div className="p-8 space-y-6 group hover:bg-white/[0.01] transition-colors">
            <span className="text-[11px] font-mono text-[#62666d]">FIG 0.3</span>
            {/* SVG Wireframe 3: Stepped Vertical Extrusion */}
            <div className="h-40 flex items-center justify-center">
              <svg width="140" height="110" viewBox="0 0 140 110" fill="none" className="stroke-white/30 group-hover:stroke-white/60 transition-colors">
                <rect x="25" y="70" width="18" height="30" strokeWidth="1" />
                <rect x="50" y="50" width="18" height="50" strokeWidth="1" />
                <rect x="75" y="30" width="18" height="70" strokeWidth="1" />
                <rect x="100" y="15" width="18" height="85" strokeWidth="1" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#f7f8f8] mb-1">3-valued AST rule engine</h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                Nested boolean evaluation returns PASS, FAIL, or UNKNOWN with explainable provenance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Split Showcase Section 1: Intake & Classification Kanban */}
      <section className="py-20 max-w-[1200px] mx-auto px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#f7f8f8]">Intake and classification</h2>
            <p className="text-xs text-[#8a8f98] mt-1">Deterministic document category assignment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="linear-card p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono text-[#62666d]">QUEUED</span>
              <span className="text-[#5e6ad2]">&bull; Active</span>
            </div>
            <div className="text-sm font-medium text-[#f7f8f8]">DOC-1025 Marksheet</div>
            <p className="text-xs text-[#8a8f98]">Awaiting local OCR worker execution</p>
          </div>

          <div className="linear-card p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono text-[#62666d]">PENDING REVIEW</span>
              <span className="text-[#f59e0b]">&bull; Officer</span>
            </div>
            <div className="text-sm font-medium text-[#f7f8f8]">DOC-1024 Income Cert</div>
            <p className="text-xs text-[#8a8f98]">Confidence calibrated at 84.2%</p>
          </div>

          <div className="linear-card p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono text-[#62666d]">REVIEWED</span>
              <span className="text-[#10b981]">&bull; Verified</span>
            </div>
            <div className="text-sm font-medium text-[#f7f8f8]">DOC-1023 Class XII</div>
            <p className="text-xs text-[#8a8f98]">Arithmetic verified, zero discrepancies</p>
          </div>
        </div>
      </section>

      {/* Audit Changelog Strip */}
      <section id="audit-trail" className="py-12 border-t border-white/[0.08] bg-[#0c0d0e]/50">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs font-mono">
            <div>
              <span className="text-[#62666d] block mb-1">04 NOV 2026 &bull; 01:14</span>
              <span className="text-[#f7f8f8] block">APP-2026-001 Assigned</span>
              <span className="text-[#8a8f98]">Officer assigned via admin workload pool</span>
            </div>
            <div>
              <span className="text-[#62666d] block mb-1">04 NOV 2026 &bull; 01:15</span>
              <span className="text-[#f7f8f8] block">Field Corrected v1.1</span>
              <span className="text-[#8a8f98]">Subject marks aggregate updated with reason</span>
            </div>
            <div>
              <span className="text-[#62666d] block mb-1">04 NOV 2026 &bull; 01:16</span>
              <span className="text-[#f7f8f8] block">Locker Consent Granted</span>
              <span className="text-[#8a8f98]">Student authorized 30-day Certi Adapter</span>
            </div>
            <div>
              <span className="text-[#62666d] block mb-1">04 NOV 2026 &bull; 01:17</span>
              <span className="text-[#f7f8f8] block">Recommendation Issued</span>
              <span className="text-[#10b981]">Status: ELIGIBLE with full provenance</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 text-center text-xs text-[#62666d]">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#f7f8f8]">
            <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center">
              <div className="w-[1px] h-4 bg-white transform rotate-45" />
            </div>
            <span className="font-medium text-xs">CertiScholar</span>
          </div>
          <div>Built for institutional trust. 100% local OCR &amp; Nodemailer OTP.</div>
          <div className="text-[11px] font-mono text-[#8a8f98]">Linear-Design System</div>
        </div>
      </footer>
    </div>
  );
}
