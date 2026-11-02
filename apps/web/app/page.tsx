'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  FileText,
  ScanLine,
  CheckCircle2,
  Cpu,
  Lock,
  ArrowRight,
  Sparkles,
  Users,
  Award,
  Activity,
  Layers,
  Scale,
  Search,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { apiClient } from '../lib/api';

export default function HomePage() {
  const router = useRouter();
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick-login helper for evaluators and demonstration
  const handleQuickLogin = async (role: string, email: string) => {
    setLoggingInRole(role);
    setErrorMsg(null);
    try {
      // 1. Request OTP
      await apiClient.requestOtp(email, 'EMAIL' as any);
      // 2. In dev/demo, code is 123456
      const result = await apiClient.verifyOtp(email, '123456');

      if (role === 'STUDENT') router.push('/student');
      else if (role === 'VERIFICATION_OFFICER') router.push('/verification');
      else if (role === 'INSTITUTE_ADMIN') router.push('/institute');
      else if (role === 'SCHOLARSHIP_OFFICER') router.push('/scholarship');
      else if (role === 'SUPER_ADMIN') router.push('/platform');
      else router.push('/student');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setErrorMsg(msg);
      setLoggingInRole(null);
    }
  };

  const roleProfiles = [
    {
      role: 'STUDENT',
      title: 'Student Portal',
      email: 'student.demo@inst-a.edu',
      desc: 'Submit academic marksheet, income certificates & manage Certi Locker consent grants.',
      badge: 'Applicant',
      accent: 'border-cyan-500/40 text-cyan-400',
      destination: '/student',
    },
    {
      role: 'VERIFICATION_OFFICER',
      title: 'Verification Officer',
      email: 'officer.demo@inst-a.edu',
      desc: 'Perform human-in-the-loop side-by-side review with bounding boxes & optimistic locking.',
      badge: 'Reviewer',
      accent: 'border-blue-500/40 text-blue-400',
      destination: '/verification',
    },
    {
      role: 'INSTITUTE_ADMIN',
      title: 'Institute Administrator',
      email: 'admin.demo@inst-a.edu',
      desc: 'Assign verification workload, configure AST scholarship rules & export audit reports.',
      badge: 'Tenant Admin',
      accent: 'border-indigo-500/40 text-indigo-400',
      destination: '/institute',
    },
    {
      role: 'SCHOLARSHIP_OFFICER',
      title: 'Scholarship Officer',
      email: 'scholarship.demo@inst-a.edu',
      desc: 'Evaluate applications against 3-valued logic ASTs and generate explainable dossiers.',
      badge: 'Evaluator',
      accent: 'border-violet-500/40 text-violet-400',
      destination: '/scholarship',
    },
    {
      role: 'SUPER_ADMIN',
      title: 'Platform Super Admin',
      email: 'superadmin.demo@certischolar.gov.in',
      desc: 'Cross-tenant oversight, multi-institute tenancy registry & service health monitoring.',
      badge: 'Platform Root',
      accent: 'border-emerald-500/40 text-emerald-400',
      destination: '/platform',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#07090E] text-slate-100 selection:bg-cyan-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32 border-b border-[#1C2438]">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 w-[450px] h-[250px] bg-blue-600/10 blur-[110px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 backdrop-blur-md mb-8">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-medium text-cyan-300 tracking-wide font-mono">
              Production-Grade SaaS | Multi-Institute Architecture
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.1]">
            OCR Document Verification &{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Explainable Scholarship
            </span>{' '}
            Eligibility
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            CertiScholar eliminates manual certificate fraud with streaming antivirus intake,
            token-level OCR geometry, human-in-the-loop review with optimistic concurrency, and
            transparent 3-valued AST rule evaluations.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/student" className="btn-primary text-base py-3 px-6 shadow-xl shadow-cyan-500/20">
              Submit Document for Intake
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link href="/verification" className="btn-secondary text-base py-3 px-6">
              Open Reviewer Queue
            </Link>
            <Link
              href="/dev/diagnostics"
              className="px-4 py-3 rounded-lg text-sm font-mono text-slate-400 hover:text-cyan-400 border border-slate-800 hover:border-slate-700 bg-slate-900/40 transition-colors"
            >
              🛠️ System Diagnostics
            </Link>
          </div>

          {/* System Spec Highlights */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="glass-panel p-4 rounded-xl text-left border-l-2 border-l-cyan-500">
              <span className="text-xs font-mono text-slate-400 block">Intake Security</span>
              <span className="text-sm font-semibold text-white mt-1 block">Live ClamAV Streaming</span>
              <span className="text-[11px] text-cyan-400/80 font-mono">Bounded 10MB parser</span>
            </div>
            <div className="glass-panel p-4 rounded-xl text-left border-l-2 border-l-blue-500">
              <span className="text-xs font-mono text-slate-400 block">OCR Geometry</span>
              <span className="text-sm font-semibold text-white mt-1 block">FastAPI + Tesseract 5.5</span>
              <span className="text-[11px] text-blue-400/80 font-mono">Word bounding vertices</span>
            </div>
            <div className="glass-panel p-4 rounded-xl text-left border-l-2 border-l-indigo-500">
              <span className="text-xs font-mono text-slate-400 block">AST Rule Engine</span>
              <span className="text-sm font-semibold text-white mt-1 block">3-Valued Logic</span>
              <span className="text-[11px] text-indigo-400/80 font-mono">Zero silent passes</span>
            </div>
            <div className="glass-panel p-4 rounded-xl text-left border-l-2 border-l-emerald-500">
              <span className="text-xs font-mono text-slate-400 block">Audit Defense</span>
              <span className="text-sm font-semibold text-white mt-1 block">Append-Only Logs</span>
              <span className="text-[11px] text-emerald-400/80 font-mono">Formula injection guard</span>
            </div>
          </div>
        </div>
      </section>

      {/* Role Quick-Login Test Drive Matrix */}
      <section className="py-16 bg-[#090D17] border-b border-[#1C2438]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Instant Role-Based Workspace Portals
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Explore CertiScholar through each stakeholder persona. One-click instant authentication
              issues an authenticated session token and routes directly to the designated workspace.
            </p>
            {errorMsg && (
              <div className="mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-sm">
                {errorMsg}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {roleProfiles.map((p) => {
              const isLoading = loggingInRole === p.role;
              return (
                <div
                  key={p.role}
                  className="glass-panel p-5 rounded-xl flex flex-col justify-between hover:border-cyan-500/40 transition-all hover:-translate-y-1 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${p.accent}`}>
                        {p.badge}
                      </span>
                      <Users className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1.5">{p.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">{p.desc}</p>
                    <div className="p-2 rounded bg-black/40 border border-slate-800 mb-4 font-mono text-[11px] text-slate-400 truncate">
                      {p.email}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleQuickLogin(p.role, p.email)}
                      disabled={isLoading}
                      className="w-full btn-primary text-xs py-2 px-3 justify-center"
                    >
                      {isLoading ? 'Authenticating...' : `Enter as ${p.badge}`}
                    </button>
                    <Link
                      href={p.destination}
                      className="block text-center text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition-colors py-1"
                    >
                      Browse Route Directly →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Architectural Pillars */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
            End-to-End Integrity
          </span>
          <h2 className="mt-2 text-3xl font-extrabold text-white">
            10-Module Rigorous Pipeline Architecture
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            From raw multipart ingest to explainable dual dossiers, every state transition is
            cryptographically validated and recorded in an append-only timeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="glass-panel p-6 rounded-2xl relative group">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-5">
              <ScanLine className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              M1–M4: Ingest, Scan & Extraction
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Files are streamed through ClamAV, validated with bounded pdf-lib parsing, normalized via
              FastAPI/Tesseract 5.5, and mapped to extraction profiles with sub-millimeter bounding polygons.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-400 font-mono">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ClamAV socket quarantine
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Prompt injection neutralization
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Calibrated confidence scores
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-6 rounded-2xl relative group">
            <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400 mb-5">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              M5–M7: Human Review & Verification
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Low-confidence fields trigger mandatory human review. Verification officers use side-by-side
              overlays with optimistic locking, while arithmetic engines detect mark discrepancies.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-400 font-mono">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Optimistic concurrency versioning
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Recomputed subject sum parity
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Certi 30-day locker consent
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-6 rounded-2xl relative group">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400 mb-5">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              M8–M10: Rules, Explainability & Audit
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Administrators author scholarship rules as JSON ASTs with 3-valued logic. Explainability engines
              generate transparent dossiers for students and confidential audit logs for officers.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-400 font-mono">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 3-valued ternary rule AST
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Dual student/officer explanations
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Formula injection CSV protection
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
