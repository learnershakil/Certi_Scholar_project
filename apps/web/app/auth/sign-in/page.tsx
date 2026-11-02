'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { apiClient } from '../../../lib/api';

export default function SignInPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [identifier, setIdentifier] = useState('student.demo@inst-a.edu');
  const [otpCode, setOtpCode] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.from(cardRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
    }
  }, []);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.requestOtp(identifier, 'EMAIL' as any);
      setSuccessMsg(res.data?.message || 'Verification code delivered to inbox.');
      setStep('VERIFY');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to deliver OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.verifyOtp(identifier, otpCode);
      const roles = res.user?.roles || [];

      if (roles.includes('STUDENT' as any)) router.push('/student');
      else if (roles.includes('VERIFICATION_OFFICER' as any)) router.push('/verification');
      else if (roles.includes('INSTITUTE_ADMIN' as any)) router.push('/institute');
      else if (roles.includes('SCHOLARSHIP_OFFICER' as any)) router.push('/scholarship');
      else router.push('/student');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const presetAccounts = [
    { label: 'Student', email: 'student.demo@inst-a.edu', role: 'Applicant' },
    { label: 'Verification Officer', email: 'officer.demo@inst-a.edu', role: 'Reviewer' },
    { label: 'Institute Admin', email: 'admin.demo@inst-a.edu', role: 'Tenant Admin' },
    { label: 'Scholarship Officer', email: 'scholarship.demo@inst-a.edu', role: 'Evaluator' },
  ];

  return (
    <div className="min-h-screen bg-[#040D0A] flex flex-col justify-center py-12 px-6 sm:px-6 lg:px-8 text-slate-100 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-500/12 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#00DC82]/8 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#10B981] to-[#00DC82] flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6 text-[#06120E] stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
            CertiScholar
          </span>
        </Link>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          Sign in to your Workspace
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Secure passwordless OTP authentication with session cookies
        </p>
      </div>

      <div ref={cardRef} className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-panel-elevated py-8 px-6 sm:rounded-3xl sm:px-10 border border-emerald-500/30 shadow-2xl">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 'REQUEST' ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Email Address or Student ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="student.demo@inst-a.edu"
                    className="input-field pl-10 bg-[#071913] border-[#143528] focus:border-emerald-500 text-sm py-2.5"
                  />
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 font-semibold">
                  Select Quick Demo Account:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {presetAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => setIdentifier(acc.email)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                        identifier === acc.email
                          ? 'border-emerald-400 bg-emerald-950/70 text-white shadow-sm shadow-emerald-500/20'
                          : 'border-[#143327] bg-[#071913]/60 text-slate-400 hover:border-emerald-800 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-white text-[11px]">{acc.label}</div>
                      <div className="text-[10px] text-emerald-400 font-mono truncate">{acc.role}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary text-sm py-3 justify-center shadow-lg shadow-emerald-500/25"
              >
                {loading ? 'Requesting Code...' : 'Request One-Time Code →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    One-Time Password (OTP)
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('REQUEST')}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Change Email
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="input-field pl-10 font-mono text-center tracking-widest text-lg py-2.5 bg-[#071913] border-[#143528]"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1.5 block">
                  Demo code <strong className="text-emerald-400 font-mono">123456</strong> is pre-filled.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary text-sm py-3 justify-center shadow-lg shadow-emerald-500/25"
              >
                {loading ? 'Authenticating...' : 'Sign In & Set Session →'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-[#143327] text-center">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
            >
              ← Return to CertiScholar Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
