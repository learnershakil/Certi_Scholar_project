'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from './Navbar';
import { ChevronRight } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  roleBadge?: string;
  breadcrumbs?: { label: string; href?: string }[];
  action?: React.ReactNode;
}

export function AppShell({
  children,
  title,
  subtitle,
  roleBadge,
  breadcrumbs,
  action,
}: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#07090E] text-slate-100">
      <Navbar />

      {/* Page Header */}
      <div className="border-b border-[#1C2438] bg-[#0A0E18]/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-mono">
              <Link href="/" className="hover:text-cyan-400 transition-colors">
                Home
              </Link>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-cyan-400 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-slate-200">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {title}
                </h1>
                {roleBadge && (
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                    {roleBadge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="mt-1 text-sm text-slate-400 max-w-3xl">{subtitle}</p>
              )}
            </div>

            {action && <div className="flex items-center gap-3">{action}</div>}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1C2438] py-6 text-center text-xs text-slate-500 bg-[#07090E]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 CertiScholar. OCR-Based Verification & Explainable Scholarship Platform.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Production Grade SaaS</span>
            <span>•</span>
            <span>Multi-Tenant Architecture</span>
            <span>•</span>
            <span>Tamper-Resistant Audit Trail</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

