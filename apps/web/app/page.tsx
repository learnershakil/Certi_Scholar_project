"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Play,
  ArrowRight,
  Scan,
  Shield,
  Sliders,
  FileCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  BarChart3,
  Check,
  Users,
  Eye,
  ChevronRight,
  Clock,
  Award,
  UploadCloud,
  FileText,
  Calendar,
  Lock,
  ArrowUpRight,
  Maximize2,
  Smartphone,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import gsap from "gsap";
import { Navbar } from "../components/Navbar";
import { apiClient } from "../lib/api";

export default function HomePage() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const docStackContainerRef = useRef<HTMLDivElement>(null);
  const docStackRef = useRef<HTMLDivElement>(null);
  const shieldBadgeRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const phonesRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<
    | "pipeline"
    | "upload"
    | "review"
    | "rules"
    | "timeline"
    | "analytics"
    | "mobile"
  >("pipeline");
  const [viewMode, setViewMode] = useState<"board" | "interactive">("board");
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);

  // GSAP 3D Mouse Parallax & Entrance Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Entrance timeline
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".gsap-hero-badge", { y: 20, opacity: 0, duration: 0.7 })
        .from(".gsap-hero-title", { y: 35, opacity: 0, duration: 0.9 }, "-=0.5")
        .from(".gsap-hero-desc", { y: 25, opacity: 0, duration: 0.8 }, "-=0.6")
        .from(
          ".gsap-hero-cta",
          { y: 20, opacity: 0, duration: 0.7, stagger: 0.1 },
          "-=0.5",
        )
        .from(
          ".gsap-hero-card",
          { y: 30, opacity: 0, duration: 0.7, stagger: 0.08 },
          "-=0.4",
        );

      // 2. Continuous floating animation for 3D shield badge
      if (shieldBadgeRef.current) {
        gsap.to(shieldBadgeRef.current, {
          y: -10,
          rotation: -8,
          duration: 2.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }

      // 3. Subtle floating for the 3D document stack
      if (docStackRef.current) {
        gsap.to(docStackRef.current, {
          y: -14,
          duration: 3.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }, heroRef);

    // Mouse parallax 3D effect
    const container = docStackContainerRef.current;
    const stack = docStackRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      if (!container || !stack) return;
      const rect = container.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
      const mouseY = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to(stack, {
        rotationY: 12 + mouseX * 24,
        rotationX: 54 - mouseY * 20,
        x: mouseX * 25,
        y: mouseY * 25,
        duration: 0.8,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      if (!stack) return;
      gsap.to(stack, {
        rotationY: 12,
        rotationX: 54,
        x: 0,
        y: 0,
        duration: 1.2,
        ease: "power3.out",
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      ctx.revert();
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const handleQuickLogin = async (role: string, email: string) => {
    setLoggingInRole(role);
    try {
      await apiClient.requestOtp(email, "EMAIL" as any);
      await apiClient.verifyOtp(email, "123456");

      if (role === "STUDENT") router.push("/student");
      else if (role === "VERIFICATION_OFFICER") router.push("/verification");
      else if (role === "INSTITUTE_ADMIN") router.push("/institute");
      else if (role === "SCHOLARSHIP_OFFICER") router.push("/scholarship");
      else router.push("/platform");
    } catch (err) {
      console.error(err);
      setLoggingInRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#040D0A] text-slate-100 relative overflow-x-hidden selection:bg-emerald-500 selection:text-black">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[650px] bg-gradient-to-b from-emerald-500/12 to-transparent blur-[160px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-1/3 -right-20 w-[550px] h-[550px] bg-[#00DC82]/10 blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-10 -left-20 w-[600px] h-[600px] bg-teal-500/8 blur-[160px] rounded-full pointer-events-none -z-10" />

      <Navbar />

      {/* ========================================================================= */}
      {/* SCREEN 1: HERO / LANDING (Matching Top-Left of Reference Mockup 100%) */}
      {/* ========================================================================= */}
      <section
        ref={heroRef}
        className="pt-10 pb-20 max-w-7xl mx-auto px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Content (7 Cols) */}
          <div className="lg:col-span-7 space-y-7">
            {/* Badge Pill */}
            <div className="gsap-hero-badge inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-[#0A1D16]/90 backdrop-blur-md shadow-sm shadow-emerald-950/40">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300 tracking-wide">
                Trusted by Institutions
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="gsap-hero-title text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
              Automating Scholarship Verification,{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-[#00DC82] to-teal-200 bg-clip-text text-transparent">
                End to End.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="gsap-hero-desc text-base sm:text-lg text-slate-300 max-w-xl font-normal leading-relaxed">
              Secure document intake, intelligent extraction, verified
              eligibility and explainable recommendations — all in one platform.
            </p>

            {/* CTA Buttons */}
            <div className="gsap-hero-cta flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/auth/sign-in"
                className="btn-pill-white text-sm py-3 px-8 shadow-xl hover:shadow-emerald-500/20"
              >
                Get Started →
              </Link>
              <button
                onClick={() => {
                  const el = document.getElementById("mockup-showcase");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="btn-pill-outline text-sm py-3 px-6 flex items-center gap-2.5 group"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                </div>
                <span>Watch Demo</span>
              </button>
            </div>
          </div>

          {/* Right Hero Graphic: 3D Isometric Glowing Document Stack on Pedestal (5 Cols) */}
          <div
            ref={docStackContainerRef}
            className="lg:col-span-5 flex items-center justify-center relative min-h-[460px] document-stack-container"
          >
            {/* Luminous Pedestal Base */}
            <div className="isometric-pedestal" />

            {/* Ambient Backlight Aura */}
            <div className="absolute w-80 h-80 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none" />

            {/* 3D Stack */}
            <div
              ref={docStackRef}
              className="relative w-72 h-[370px] document-isometric cursor-pointer"
            >
              {/* Back Sheet 3 */}
              <div className="absolute inset-0 rounded-2xl bg-[#091D16]/90 border border-emerald-500/20 backdrop-blur-md transform -translate-x-4 -translate-y-4 p-5 shadow-2xl">
                <div className="w-20 h-2.5 rounded bg-emerald-800/50 mb-3" />
                <div className="w-44 h-2 rounded bg-emerald-900/40 mb-2" />
                <div className="w-32 h-2 rounded bg-emerald-900/40" />
              </div>

              {/* Middle Sheet 2 */}
              <div className="absolute inset-0 rounded-2xl bg-[#0C251D]/90 border border-emerald-500/30 backdrop-blur-md transform -translate-x-2 -translate-y-2 p-5 shadow-2xl">
                <div className="w-24 h-2.5 rounded bg-emerald-700/60 mb-3" />
                <div className="w-48 h-2 rounded bg-emerald-800/40 mb-2" />
                <div className="w-36 h-2 rounded bg-emerald-800/40" />
              </div>

              {/* Front Main Sheet 1 (Mark Sheet Preview) */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0F3126]/95 via-[#0A221A]/95 to-[#061410]/95 border-2 border-emerald-400/50 backdrop-blur-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(16,185,129,0.3)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                      <div className="w-20 h-2.5 rounded bg-emerald-400/70" />
                    </div>
                    <div className="w-12 h-2 rounded bg-emerald-500/40" />
                  </div>

                  <div className="space-y-2.5">
                    <div className="w-full h-2 rounded bg-emerald-500/20" />
                    <div className="w-5/6 h-2 rounded bg-emerald-500/20" />
                    <div className="w-4/6 h-2 rounded bg-emerald-500/20" />
                    <div className="w-full h-2 rounded bg-emerald-500/20" />
                  </div>

                  {/* Document Content Box */}
                  <div className="mt-8 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-between backdrop-blur-sm">
                    <div>
                      <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                        Statement of Marks
                      </div>
                      <div className="text-xs text-white font-semibold">
                        Shakil Ahmad
                      </div>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-[#00DC82] font-bold border border-emerald-500/30">
                      92.3%
                    </span>
                  </div>
                </div>

                {/* Floating Glowing Shield Checkmark Badge (As in Reference Mockup) */}
                <div
                  ref={shieldBadgeRef}
                  className="self-center -mb-8 w-18 h-18 rounded-2xl bg-gradient-to-tr from-[#10B981] via-[#00DC82] to-emerald-300 p-[2px] shadow-[0_0_40px_rgba(0,220,130,0.7)] transform -rotate-12 hover:rotate-0 transition-transform duration-300"
                >
                  <div className="w-full h-full rounded-[14px] bg-[#061A14]/90 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <Check className="w-9 h-9 text-[#00DC82] stroke-[3.5] drop-shadow-[0_0_12px_#00DC82]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Feature Pills at Bottom of Hero (Screen 1 Feature Grid) */}
        <div
          ref={cardsRef}
          className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="gsap-hero-card glass-panel p-5 rounded-2xl border border-[#143327] hover:border-emerald-500/50 hover:bg-[#0E261E]/90 transition-all hover:-translate-y-1 group">
            <div className="w-10 h-10 rounded-xl bg-[#0E261E] border border-emerald-500/30 flex items-center justify-center text-[#00DC82] mb-3.5 group-hover:scale-110 transition-transform shadow-sm shadow-emerald-500/10">
              <Scan className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-0.5">
              OCR & Extraction
            </h3>
            <p className="text-xs text-slate-400">From any document</p>
          </div>

          <div className="gsap-hero-card glass-panel p-5 rounded-2xl border border-[#143327] hover:border-emerald-500/50 hover:bg-[#0E261E]/90 transition-all hover:-translate-y-1 group">
            <div className="w-10 h-10 rounded-xl bg-[#0E261E] border border-emerald-500/30 flex items-center justify-center text-[#00DC82] mb-3.5 group-hover:scale-110 transition-transform shadow-sm shadow-emerald-500/10">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-0.5">
              Verified & Secure
            </h3>
            <p className="text-xs text-slate-400">Issuer-backed checks</p>
          </div>

          <div className="gsap-hero-card glass-panel p-5 rounded-2xl border border-[#143327] hover:border-emerald-500/50 hover:bg-[#0E261E]/90 transition-all hover:-translate-y-1 group">
            <div className="w-10 h-10 rounded-xl bg-[#0E261E] border border-emerald-500/30 flex items-center justify-center text-[#00DC82] mb-3.5 group-hover:scale-110 transition-transform shadow-sm shadow-emerald-500/10">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-0.5">
              Rule-Based Eligibility
            </h3>
            <p className="text-xs text-slate-400">No-code configuration</p>
          </div>

          <div className="gsap-hero-card glass-panel p-5 rounded-2xl border border-[#143327] hover:border-emerald-500/50 hover:bg-[#0E261E]/90 transition-all hover:-translate-y-1 group">
            <div className="w-10 h-10 rounded-xl bg-[#0E261E] border border-emerald-500/30 flex items-center justify-center text-[#00DC82] mb-3.5 group-hover:scale-110 transition-transform shadow-sm shadow-emerald-500/10">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-0.5">
              Explainable Results
            </h3>
            <p className="text-xs text-slate-400">Transparent & auditable</p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MASTER SHOWCASE GALLERY: 100% FAITHFUL TO THE ATTACHED DESIGN MOCKUP */}
      {/* ========================================================================= */}
      <section
        id="mockup-showcase"
        className="py-20 border-t border-[#143327] bg-[#05140F]/90 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-10">
          {/* Section Header with View Mode Switcher */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] font-mono uppercase tracking-widest text-[#00DC82] font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Awwwards Showcase Suite
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Complete Product Architecture
              </h2>
              <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                Experience all 8 interconnected operational views designed for
                students, verification officers, and scholarship administrators.
              </p>
            </div>

            {/* View Mode Toggle: Mockup Board vs Deep Interactive Studio */}
            <div className="flex items-center p-1 rounded-full bg-[#081C15] border border-[#143327] self-start md:self-auto">
              <button
                onClick={() => setViewMode("board")}
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "board"
                    ? "bg-emerald-500 text-[#040D0A] shadow-md shadow-emerald-500/20 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Full Design Board (8 Screens)</span>
              </button>
              <button
                onClick={() => setViewMode("interactive")}
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "interactive"
                    ? "bg-emerald-500 text-[#040D0A] shadow-md shadow-emerald-500/20 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Interactive Studio</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VIEW 1: FULL DESIGN BOARD (EXACT LAYOUT AS ATTACHED IMAGE) */}
          {/* ========================================================================= */}
          {viewMode === "board" && (
            <div className="space-y-8 animate-fadeIn">
              {/* TOP ROW: Screen 2 (Application Pipeline) */}
              <div className="grid grid-cols-1 gap-8">
                {/* SCREEN 2: APPLICATION PIPELINE DASHBOARD */}
                <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-emerald-500/30 overflow-hidden shadow-2xl relative">
                  <div className="flex items-center justify-between pb-4 border-b border-[#143327] mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-xs text-[#06120E]">
                        2
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          Application Pipeline
                        </h3>
                        <p className="text-xs text-slate-400">
                          Real-time overview of document processing and
                          scholarship applications.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-300 bg-[#0E241D] px-3 py-1.5 rounded-lg border border-[#143327] flex items-center gap-1.5">
                        <span>Last 30 Days</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                      <Link
                        href="/institute"
                        className="btn-primary text-xs py-1.5 px-3.5"
                      >
                        Open Pipeline →
                      </Link>
                    </div>
                  </div>

                  {/* 4 KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-white text-slate-900 shadow-md">
                      <span className="text-xs font-semibold text-slate-500 block">
                        Total Applications
                      </span>
                      <span className="text-2xl font-bold block mt-1">
                        1,248
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        ↑ +12%
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-white text-slate-900 shadow-md">
                      <span className="text-xs font-semibold text-slate-500 block">
                        Processed
                      </span>
                      <span className="text-2xl font-bold block mt-1">892</span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        ↑ +18%
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-white text-slate-900 shadow-md">
                      <span className="text-xs font-semibold text-slate-500 block">
                        In Review
                      </span>
                      <span className="text-2xl font-bold block mt-1">168</span>
                      <span className="text-[11px] font-semibold text-rose-600">
                        ↓ -6%
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-white text-slate-900 shadow-md">
                      <span className="text-xs font-semibold text-slate-500 block">
                        Eligible
                      </span>
                      <span className="text-2xl font-bold block mt-1">142</span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        ↑ +21%
                      </span>
                    </div>
                  </div>

                  {/* Funnel & Chart Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                    {/* Processing Funnel (5 Cols) */}
                    <div className="lg:col-span-5 p-5 rounded-2xl bg-white text-slate-900 shadow-md flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-900 block mb-3 font-mono">
                        Processing Funnel
                      </span>
                      <div className="space-y-2.5 font-mono text-xs">
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                          <span className="font-semibold text-slate-700">
                            Uploaded
                          </span>
                          <span className="font-bold text-emerald-800">
                            1,248
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-100/70 border border-emerald-200">
                          <span className="font-semibold text-slate-700">
                            OCR Completed
                          </span>
                          <span className="font-bold text-emerald-800">
                            1,183
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-200/60 border border-emerald-300">
                          <span className="font-semibold text-slate-700">
                            Extraction Done
                          </span>
                          <span className="font-bold text-emerald-800">
                            1,052
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-300/50 border border-emerald-400">
                          <span className="font-semibold text-slate-700">
                            Reviewed
                          </span>
                          <span className="font-bold text-emerald-900">
                            892
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-400/50 border border-emerald-500">
                          <span className="font-semibold text-slate-800">
                            Eligible
                          </span>
                          <span className="font-bold text-emerald-950">
                            142
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Applications Over Time Line Chart (7 Cols) */}
                    <div className="lg:col-span-7 p-5 rounded-2xl bg-white text-slate-900 shadow-md flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          Applications Over Time
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                          Sep 22 • 264 applications
                        </span>
                      </div>

                      <div className="relative h-44 w-full flex items-end">
                        <svg
                          viewBox="0 0 400 140"
                          className="w-full h-full overflow-visible"
                        >
                          <defs>
                            <linearGradient
                              id="boardChartGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#10B981"
                                stopOpacity="0.45"
                              />
                              <stop
                                offset="100%"
                                stopColor="#10B981"
                                stopOpacity="0.0"
                              />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0,110 Q 50,100 100,85 T 200,90 T 300,30 T 400,20 L 400,140 L 0,140 Z"
                            fill="url(#boardChartGrad)"
                          />
                          <path
                            d="M 0,110 Q 50,100 100,85 T 200,90 T 300,30 T 400,20"
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="3.5"
                          />
                          <circle
                            cx="300"
                            cy="30"
                            r="5"
                            fill="#10B981"
                            stroke="#FFFFFF"
                            strokeWidth="2.5"
                          />
                        </svg>
                      </div>

                      <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-3 border-t border-slate-100">
                        <span>Sep 6</span>
                        <span>Sep 10</span>
                        <span>Sep 14</span>
                        <span>Sep 18</span>
                        <span>Sep 22</span>
                        <span>Sep 26</span>
                        <span>Sep 30</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Applications Table */}
                  <div className="p-5 rounded-2xl bg-white text-slate-900 shadow-md overflow-x-auto">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        Recent Applications
                      </span>
                      <Link
                        href="/institute"
                        className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                      >
                        View All →
                      </Link>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-mono text-[11px]">
                          <th className="py-2">Application ID</th>
                          <th className="py-2">Student Name</th>
                          <th className="py-2">Scholarship</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2.5 font-mono font-semibold">
                            APP-10482
                          </td>
                          <td className="py-2.5 font-medium">Shakil Ahmad</td>
                          <td className="py-2.5 text-slate-600">
                            Merit Scholarship
                          </td>
                          <td className="py-2.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Eligible
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-mono text-slate-500">
                            2 min ago
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-mono font-semibold">
                            APP-10481
                          </td>
                          <td className="py-2.5 font-medium">Rohan Mehta</td>
                          <td className="py-2.5 text-slate-600">
                            Need-Based Aid
                          </td>
                          <td className="py-2.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              In Review
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-mono text-slate-500">
                            8 min ago
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* MIDDLE ROW: Screen 3, Screen 4, Screen 5 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SCREEN 3: UPLOAD DOCUMENTS */}
                <div className="glass-panel-elevated rounded-3xl p-6 border border-emerald-500/20 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#143327] mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-xs text-[#06120E]">
                          3
                        </div>
                        <h4 className="font-bold text-white text-base">
                          Upload Documents
                        </h4>
                      </div>
                      <Link
                        href="/student"
                        className="text-xs text-emerald-400 font-semibold hover:underline"
                      >
                        Open Portal →
                      </Link>
                    </div>

                    <div className="p-4 rounded-2xl bg-white text-slate-900 shadow-md space-y-4">
                      {/* Dropzone */}
                      <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50/70 hover:border-emerald-500 transition-colors">
                        <UploadCloud className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <h5 className="text-xs font-bold text-slate-800">
                          Drag & drop your files here
                        </h5>
                        <p className="text-[10px] text-slate-500">
                          or click to browse
                        </p>
                        <span className="text-[9px] font-mono text-slate-400 mt-2 block">
                          PDF, JPG, PNG • Max 10MB
                        </span>
                      </div>

                      {/* Required Documents Checklist */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 block">
                          Required Documents
                        </span>
                        <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            Marksheet (Latest)
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            Identity Document
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            Income Certificate
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                      </div>

                      {/* 4-Step Stepper */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-center text-[10px]">
                        <div>
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center mx-auto mb-0.5">
                            1
                          </div>
                          <span className="font-bold text-slate-800 block">
                            Upload
                          </span>
                        </div>
                        <div className="w-6 h-0.5 bg-emerald-500" />
                        <div>
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center mx-auto mb-0.5">
                            2
                          </div>
                          <span className="font-bold text-slate-800 block">
                            Process
                          </span>
                        </div>
                        <div className="w-6 h-0.5 bg-emerald-500" />
                        <div>
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center mx-auto mb-0.5">
                            3
                          </div>
                          <span className="font-bold text-slate-800 block">
                            Review
                          </span>
                        </div>
                        <div className="w-6 h-0.5 bg-slate-200" />
                        <div>
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center mx-auto mb-0.5">
                            4
                          </div>
                          <span className="font-bold text-slate-500 block">
                            Result
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SCREEN 4: REVIEW & CORRECTION */}
                <div className="glass-panel-elevated rounded-3xl p-6 border border-emerald-500/20 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#143327] mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-xs text-[#06120E]">
                          4
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base">
                            Review & Correction
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            APP-10482 • Marksheet.pdf
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button className="px-2.5 py-1 rounded-full border border-rose-500/50 text-rose-400 text-[10px] font-bold">
                          Reject
                        </button>
                        <button className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow">
                          Approve ✓
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white text-slate-900 shadow-md space-y-3">
                      {/* Marksheet with Green Bounding Boxes */}
                      <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 text-[10px] font-mono relative">
                        <div className="text-center font-bold text-slate-800 pb-1 mb-2 border-b border-slate-200">
                          Board of Secondary Education
                        </div>
                        <div className="space-y-1 mb-2">
                          <span className="inline-block border border-emerald-500 bg-emerald-100/70 px-1 py-0.5 rounded font-bold">
                            Reg No: 12502015
                          </span>
                          <br />
                          <span className="inline-block border border-emerald-500 bg-emerald-100/70 px-1 py-0.5 rounded font-bold">
                            Name: Shakil Ahmad
                          </span>
                        </div>
                        <div className="border border-slate-200 rounded overflow-hidden">
                          <div className="flex justify-between bg-slate-200 p-1 font-bold">
                            <span>Subject</span>
                            <span>Marks</span>
                          </div>
                          <div className="flex justify-between p-1 border-b border-slate-100 bg-emerald-50 font-bold text-emerald-900">
                            <span>Mathematics</span>
                            <span>95</span>
                          </div>
                          <div className="flex justify-between p-1 bg-emerald-50 font-bold text-emerald-900">
                            <span>Physics</span>
                            <span>92</span>
                          </div>
                        </div>
                      </div>

                      {/* Confidence Badges */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center p-1.5 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-600 text-[10px]">
                            Student Name
                          </span>
                          <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            0.99
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-1.5 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-600 text-[10px]">
                            Roll Number
                          </span>
                          <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            0.98
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-1.5 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-600 text-[10px]">
                            Mathematics
                          </span>
                          <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            0.97
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SCREEN 5: SCHOLARSHIP RULE BUILDER */}
                <div className="glass-panel-elevated rounded-3xl p-6 border border-emerald-500/20 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#143327] mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-xs text-[#06120E]">
                          5
                        </div>
                        <h4 className="font-bold text-white text-base">
                          Scholarship Rule Builder
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-[#00DC82] border border-emerald-500/30 font-bold">
                        AST Engine
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white text-slate-900 shadow-md space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            Merit Scholarship
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            Active
                          </span>
                        </div>
                        <button className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow">
                          Save Changes
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-600">
                            Eligibility Conditions
                          </span>
                          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
                            <span className="px-2 py-0.5 bg-emerald-600 text-white rounded">
                              AND
                            </span>
                            <span className="px-2 py-0.5 text-slate-500">
                              OR
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 font-mono text-[10px]">
                          <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-1.5">
                            <span className="flex-1 font-semibold text-slate-800 truncate">
                              Percentage in Class XII
                            </span>
                            <span className="px-1.5 py-0.5 bg-white border rounded font-bold">
                              &gt;=
                            </span>
                            <span className="px-2 py-0.5 bg-white border rounded font-bold text-emerald-700">
                              85
                            </span>
                            <span className="text-slate-500">%</span>
                          </div>

                          <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-1.5">
                            <span className="flex-1 font-semibold text-slate-800 truncate">
                              Annual Family Income
                            </span>
                            <span className="px-1.5 py-0.5 bg-white border rounded font-bold">
                              &lt;=
                            </span>
                            <span className="px-2 py-0.5 bg-white border rounded font-bold text-emerald-700">
                              6,00,000
                            </span>
                            <span className="text-slate-500">₹</span>
                          </div>
                        </div>

                        <button className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 pt-1">
                          + Add Condition
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: Screen 6, Screen 7, Screen 8 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* SCREEN 6: PROCESSING TIMELINE (4 Cols) */}
                <div className="lg:col-span-4 glass-panel-elevated rounded-3xl p-6 border border-emerald-500/20 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-[#143327] mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-xs text-[#06120E]">
                        6
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">
                          Processing Timeline
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Application: APP-10482
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white text-slate-900 shadow-md space-y-4">
                    {/* Events List */}
                    <div className="space-y-2 text-xs">
                      {[
                        {
                          title: "Document Uploaded",
                          time: "Sep 22, 10:14 AM",
                        },
                        { title: "OCR Completed", time: "Sep 22, 10:15 AM" },
                        { title: "Fields Extracted", time: "Sep 22, 10:16 AM" },
                        { title: "Under Review", time: "Sep 22, 11:02 AM" },
                        {
                          title: "Consistency Check",
                          time: "Sep 22, 11:05 AM",
                        },
                        {
                          title: "Verification (Simulated)",
                          time: "Sep 22, 11:20 AM",
                        },
                        {
                          title: "Eligibility Evaluated",
                          time: "Sep 22, 11:21 AM",
                        },
                        {
                          title: "Recommendation Ready",
                          time: "Sep 22, 11:22 AM",
                        },
                      ].map((evt, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <div className="flex-1 flex justify-between border-b border-slate-100 pb-1 text-[11px]">
                            <span className="font-semibold text-slate-900">
                              {evt.title}
                            </span>
                            <span className="font-mono text-[9px] text-slate-400">
                              {evt.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Final Recommendation Box */}
                    <div className="pt-3 border-t border-slate-100 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-2">
                        <Check className="w-6 h-6 text-emerald-600 stroke-[3]" />
                      </div>
                      <span className="font-bold text-base text-slate-900 block">
                        Eligible
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5 mb-3">
                        Meets all conditions for Merit Scholarship
                      </p>
                      <Link
                        href="/scholarship"
                        className="btn-pill-white bg-slate-900 text-white text-[11px] py-1.5 px-4 shadow hover:bg-slate-800"
                      >
                        View Report →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* SCREEN 7: REPORTS & ANALYTICS (4 Cols) */}
                <div className="lg:col-span-4 glass-panel-elevated rounded-3xl p-6 border border-emerald-500/20 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-[#143327] mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-xs text-[#06120E]">
                        7
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">
                          Reports & Analytics
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          Application performance
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white text-slate-900 shadow-md space-y-4">
                    {/* 4 Stats */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-base font-bold text-slate-900 block">
                          91.6%
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          Extraction Acc.
                        </span>
                        <span className="text-[9px] font-mono text-emerald-600 font-bold">
                          ↑ +2.6%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-base font-bold text-slate-900 block">
                          4.8%
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          Failures
                        </span>
                        <span className="text-[9px] font-mono text-emerald-600 font-bold">
                          ↓ -1.2%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-base font-bold text-slate-900 block">
                          96.2%
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          Verification
                        </span>
                        <span className="text-[9px] font-mono text-emerald-600 font-bold">
                          ↑ +0.1%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-base font-bold text-slate-900 block">
                          42 min
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          Processing
                        </span>
                        <span className="text-[9px] font-mono text-emerald-600 font-bold">
                          ↓ -10%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bars */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-600 block">
                        Accuracy by Document
                      </span>
                      <div>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="font-semibold text-slate-700">
                            Marksheet
                          </span>
                          <span className="font-mono font-bold">93.4%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: "93.4%" }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="font-semibold text-slate-700">
                            Income Certificate
                          </span>
                          <span className="font-mono font-bold">90.2%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: "90.2%" }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="font-semibold text-slate-700">
                            Identity Document
                          </span>
                          <span className="font-mono font-bold">91.3%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: "91.3%" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Donut Summary */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center text-center">
                        <span className="text-[10px] font-bold">1,248</span>
                      </div>
                      <div className="space-y-1 text-[9px] font-mono">
                        <div className="text-emerald-700 font-bold">
                          Eligible: 142 (11.4%)
                        </div>
                        <div className="text-amber-700 font-bold">
                          In Review: 168 (13.5%)
                        </div>
                        <div className="text-slate-600 font-bold">
                          Processing: 902 (72.2%)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SCREEN 8: MOBILE EXPERIENCE SHOWCASE (4 Cols, 4 Sleek Phone Mockups) */}
                <div className="lg:col-span-4 glass-panel-elevated rounded-3xl p-6 border border-emerald-500/20 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-[#143327] mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-xs text-[#06120E]">
                        8
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">
                          Mobile Experience
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          4-Screen Native Flow
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Sleek Smartphone Mockups in a 2x2 Grid */}
                  <div ref={phonesRef} className="grid grid-cols-2 gap-3">
                    {/* Phone 1: Splash Screen */}
                    <div className="phone-mockup-frame p-2.5 h-[230px] flex flex-col justify-between text-left">
                      <div className="w-8 h-1.5 rounded-full bg-slate-800 mx-auto mb-2" />
                      <div className="space-y-1">
                        <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
                          <ShieldCheck className="w-3 h-3 text-[#06120E]" />
                        </div>
                        <h6 className="text-[9px] font-extrabold text-white leading-tight">
                          Scholarship Verification, Simplified.
                        </h6>
                        <p className="text-[7px] text-slate-400 line-clamp-3">
                          Secure document intake & verified eligibility.
                        </p>
                      </div>
                      <div className="w-full py-1 rounded-full bg-white text-[8px] font-bold text-center text-slate-900 mt-2">
                        Get Started →
                      </div>
                    </div>

                    {/* Phone 2: My Application Status */}
                    <div className="phone-mockup-frame p-2.5 h-[230px] flex flex-col justify-between bg-white text-slate-900">
                      <div className="w-8 h-1.5 rounded-full bg-slate-200 mx-auto mb-1" />
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] font-bold">
                            My Application
                          </span>
                          <span className="text-[7px] px-1 rounded bg-amber-100 text-amber-800 font-bold">
                            In Review
                          </span>
                        </div>
                        <span className="text-[8px] font-mono text-slate-400 block mb-2">
                          APP-10482
                        </span>
                        <div className="space-y-1 text-[7px] font-mono">
                          <div className="flex items-center gap-1 text-emerald-700 font-bold">
                            <Check className="w-2.5 h-2.5" /> Upload
                          </div>
                          <div className="flex items-center gap-1 text-emerald-700 font-bold">
                            <Check className="w-2.5 h-2.5" /> Processing
                          </div>
                          <div className="flex items-center gap-1 text-amber-700 font-bold">
                            ● Review
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            ○ Eligibility
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            ○ Complete
                          </div>
                        </div>
                      </div>
                      <div className="w-full h-1 rounded-full bg-slate-100" />
                    </div>

                    {/* Phone 3: Extracted Details */}
                    <div className="phone-mockup-frame p-2.5 h-[230px] flex flex-col justify-between bg-white text-slate-900">
                      <div className="w-8 h-1.5 rounded-full bg-slate-200 mx-auto mb-1" />
                      <div>
                        <span className="text-[8px] font-bold block mb-2">
                          Extracted Details
                        </span>
                        <div className="space-y-1.5 text-[7px]">
                          <div className="p-1 rounded bg-slate-50 border border-slate-100">
                            <span className="text-slate-400 block text-[6px]">
                              Name
                            </span>
                            <span className="font-bold">Shakil Ahmad</span>
                          </div>
                          <div className="p-1 rounded bg-slate-50 border border-slate-100">
                            <span className="text-slate-400 block text-[6px]">
                              Class
                            </span>
                            <span className="font-bold">XII</span>
                          </div>
                          <div className="p-1 rounded bg-slate-50 border border-slate-100">
                            <span className="text-slate-400 block text-[6px]">
                              Percentage
                            </span>
                            <span className="font-bold text-emerald-700 font-mono">
                              92.33%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full py-1 rounded bg-slate-900 text-[7px] font-bold text-center text-white">
                        Confirm Data
                      </div>
                    </div>

                    {/* Phone 4: Recommendation Final */}
                    <div className="phone-mockup-frame p-2.5 h-[230px] flex flex-col justify-between items-center text-center bg-white text-slate-900">
                      <div className="w-8 h-1.5 rounded-full bg-slate-200 mb-1" />
                      <div>
                        <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-500 flex items-center justify-center mx-auto mb-1">
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-900 block">
                          Eligible
                        </span>
                        <span className="text-[7px] text-slate-500 block mb-1">
                          Merit Scholarship
                        </span>
                      </div>
                      <div className="w-full py-1 rounded bg-emerald-600 text-[7px] font-bold text-white shadow">
                        Full Report
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: INTERACTIVE STUDIO MODE (EXPLORE INDIVIDUAL SCREENS DEEPLY) */}
          {/* ========================================================================= */}
          {viewMode === "interactive" && (
            <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-2xl animate-fadeIn">
              {/* Interactive Tabs */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8 p-1.5 rounded-full bg-[#081E16] border border-[#143327] max-w-fit mx-auto">
                {[
                  { id: "pipeline", label: "1. Pipeline" },
                  { id: "upload", label: "2. Upload" },
                  { id: "review", label: "3. Review" },
                  { id: "rules", label: "4. Rules" },
                  { id: "timeline", label: "5. Timeline" },
                  { id: "analytics", label: "6. Analytics" },
                  { id: "mobile", label: "7. Mobile App" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activeTab === t.id
                        ? "bg-emerald-500 text-[#040D0A] shadow-md shadow-emerald-500/30 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Interactive Tab Content */}
              {activeTab === "pipeline" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#143327]">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Application Pipeline
                      </h3>
                      <p className="text-xs text-slate-400">
                        Real-time overview of document processing and
                        scholarship applications.
                      </p>
                    </div>
                    <Link
                      href="/institute"
                      className="btn-primary text-xs py-1.5 px-4"
                    >
                      Launch Full Dashboard →
                    </Link>
                  </div>
                  {/* Pipeline Content */}
                  <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-md">
                    <p className="text-xs text-slate-600 mb-4">
                      Live metrics and operational queue directly mapped to
                      MongoDB document ingestion & verification states.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 block">
                          Total Applications
                        </span>
                        <span className="text-2xl font-bold block mt-1">
                          1,248
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-600">
                          ↑ +12%
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 block">
                          Processed
                        </span>
                        <span className="text-2xl font-bold block mt-1">
                          892
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-600">
                          ↑ +18%
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 block">
                          In Review
                        </span>
                        <span className="text-2xl font-bold block mt-1">
                          168
                        </span>
                        <span className="text-[11px] font-semibold text-rose-600">
                          ↓ -6%
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 block">
                          Eligible
                        </span>
                        <span className="text-2xl font-bold block mt-1">
                          142
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-600">
                          ↑ +21%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "upload" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#143327]">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Upload Documents
                      </h3>
                      <p className="text-xs text-slate-400">
                        Drag and drop student marksheet, identity proof and
                        income certificates.
                      </p>
                    </div>
                    <Link
                      href="/student"
                      className="btn-primary text-xs py-1.5 px-4"
                    >
                      Enter Student Portal →
                    </Link>
                  </div>
                  <div className="p-8 rounded-2xl bg-white text-slate-900 shadow-md">
                    <div className="p-10 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50">
                      <UploadCloud className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-slate-900">
                        Drag & drop your files here or click to browse
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Supported: PDF, JPG, PNG • Max size: 10MB per file
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "review" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#143327]">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Review & Correction
                      </h3>
                      <p className="text-xs text-slate-400">
                        Side-by-side marksheet bounding box inspection with
                        optimistic concurrency.
                      </p>
                    </div>
                    <Link
                      href="/verification"
                      className="btn-primary text-xs py-1.5 px-4"
                    >
                      Enter Review Queue →
                    </Link>
                  </div>
                  <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-md">
                    <p className="text-xs text-slate-600">
                      View highlighted bounding boxes directly aligned with OCR
                      text detection coordinates and field confidence
                      calibrations.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "rules" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#143327]">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Scholarship Rule Builder
                      </h3>
                      <p className="text-xs text-slate-400">
                        Define boolean conditions with percentage and income
                        thresholds.
                      </p>
                    </div>
                    <Link
                      href="/scholarship"
                      className="btn-primary text-xs py-1.5 px-4"
                    >
                      Open Rule Engine →
                    </Link>
                  </div>
                  <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-md">
                    <p className="text-xs text-slate-600">
                      3-valued AST logic evaluator: TRUE, FALSE, or
                      INDETERMINATE when required data points are missing.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#143327]">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Processing Timeline
                      </h3>
                      <p className="text-xs text-slate-400">
                        End-to-end provenance tracking every stage from ClamAV
                        scan to final recommendation.
                      </p>
                    </div>
                    <Link
                      href="/scholarship"
                      className="btn-primary text-xs py-1.5 px-4"
                    >
                      Inspect Dossiers →
                    </Link>
                  </div>
                  <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-md">
                    <p className="text-xs text-slate-600">
                      Dual explanation engine: Student-facing clear natural
                      language vs Confidential Officer detailed breakdown.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "analytics" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#143327]">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Reports & Analytics
                      </h3>
                      <p className="text-xs text-slate-400">
                        Institutional reporting and CSV export.
                      </p>
                    </div>
                    <Link
                      href="/institute"
                      className="btn-primary text-xs py-1.5 px-4"
                    >
                      Download Reports →
                    </Link>
                  </div>
                  <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-md">
                    <p className="text-xs text-slate-600">
                      Extraction accuracy breakdown across document categories
                      with audit compliance.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "mobile" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#143327]">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Mobile Responsive Experience
                      </h3>
                      <p className="text-xs text-slate-400">
                        Optimized for smartphones and tablets.
                      </p>
                    </div>
                  </div>
                  <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-md">
                    <p className="text-xs text-slate-600">
                      Complete end-to-end document capture and application
                      status tracking on iOS and Android viewports.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* INSTANT ROLE LAUNCHPAD (AUTHENTICATE DIRECTLY INTO LIVE ROLES) */}
      {/* ========================================================================= */}
      <section className="py-20 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] font-mono uppercase tracking-widest text-[#00DC82] font-semibold mb-2">
            Stakeholder Experience
          </div>
          <h2 className="text-3xl font-extrabold text-white">
            Access Any Role Workspace Instantly
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            Click any profile to authenticate into the live role environment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              role: "STUDENT",
              label: "Student Portal",
              email: "student.demo@inst-a.edu",
              desc: "Upload marksheet, certificates & grant 30-day Certi Locker access.",
            },
            {
              role: "VERIFICATION_OFFICER",
              label: "Verification Officer",
              email: "officer.demo@inst-a.edu",
              desc: "Side-by-side review with bounding boxes & optimistic locking.",
            },
            {
              role: "INSTITUTE_ADMIN",
              label: "Institute Admin",
              email: "admin.demo@inst-a.edu",
              desc: "Assign verification workload, configure AST rules & export CSV.",
            },
            {
              role: "SCHOLARSHIP_OFFICER",
              label: "Scholarship Officer",
              email: "scholarship.demo@inst-a.edu",
              desc: "Run 3-valued AST logic & inspect explainable dual dossiers.",
            },
          ].map((card) => {
            const isLoading = loggingInRole === card.role;
            return (
              <div
                key={card.role}
                className="glass-panel p-5 rounded-2xl border border-[#143327] hover:border-emerald-500/40 transition-all hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">
                      {card.label}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                      {card.role.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">{card.desc}</p>
                </div>

                <button
                  onClick={() => handleQuickLogin(card.role, card.email)}
                  disabled={isLoading}
                  className="w-full btn-pill-white text-xs py-2 justify-center"
                >
                  {isLoading ? "Entering..." : "Enter Workspace →"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#143327] py-8 text-center text-xs text-slate-500 bg-[#040D0A]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#06120E] stroke-[2.5]" />
            </div>
            <span className="font-bold text-sm text-white">CertiScholar</span>
          </div>
          <p>
            © 2026 CertiScholar. OCR Document Verification & Explainable
            Scholarship Platform.
          </p>
          <div className="flex items-center gap-4 text-emerald-400 font-mono text-[11px]">
            <span>Awwwards Standard Design</span>
            <span>•</span>
            <span>Multi-Tenant Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
