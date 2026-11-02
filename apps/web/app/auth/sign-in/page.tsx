'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../../lib/api';

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [identifier, setIdentifier] = useState('student.demo@inst-a.edu');
  const [otpCode, setOtpCode] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.requestOtp(identifier, 'EMAIL' as any);
      setSuccessMsg(res.data?.message || 'Verification code delivered.');
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
    { label: 'Student', email: 'student.demo@inst-a.edu' },
    { label: 'Verification Officer', email: 'officer.demo@inst-a.edu' },
    { label: 'Institute Admin', email: 'admin.demo@inst-a.edu' },
    { label: 'Scholarship Officer', email: 'scholarship.demo@inst-a.edu' },
  ];

  return (
    <div className="min-h-screen bg-[#07090E] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 group mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">CertiScholar</span>
        </Link>
        <h2 className="text-xl font-bold tracking-tight text-white">
          Sign in to your Workspace
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Secure passwordless OTP authentication with session cookies
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-panel py-8 px-6 sm:rounded-2xl sm:px-10 border border-[#1C2438]">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 'REQUEST' ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address or Student ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="student.demo@inst-a.edu"
                    className="input-field pl-9"
                  />
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-mono text-slate-400 mb-2">
                  Select Quick Demo Account:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {presetAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => setIdentifier(acc.email)}
                      className={`text-left p-2 rounded text-xs font-mono border transition-all ${
                        identifier === acc.email
                          ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                          : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-200">{acc.label}</div>
                      <div className="truncate text-[10px] text-slate-500">{acc.email}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2.5 justify-center"
              >
                {loading ? 'Sending Code...' : 'Request One-Time Code'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    One-Time Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('REQUEST')}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Change Email
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="input-field pl-9 font-mono tracking-widest text-lg"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Development code is <span className="font-mono text-cyan-300">123456</span>.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2.5 justify-center"
              >
                {loading ? 'Verifying...' : 'Verify & Enter Workspace'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <Link href="/" className="text-xs text-slate-400 hover:text-cyan-400 transition-colors">
              ← Return to CertiScholar Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

