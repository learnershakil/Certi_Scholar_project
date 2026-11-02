'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  FileText,
  CheckSquare,
  Award,
  Sliders,
  Shield,
  BarChart3,
  History,
  Settings,
  ChevronRight,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';
import { apiClient } from '../lib/api';

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
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', href: '/institute', icon: LayoutDashboard },
    { label: 'Applications', href: '/student', icon: FileText },
    { label: 'Review Queue', href: '/verification', icon: CheckSquare, badge: '12' },
    { label: 'Scholarships', href: '/scholarship', icon: Award },
    { label: 'Rules & Profiles', href: '/institute', icon: Sliders },
    { label: 'Verification', href: '/verification', icon: Shield },
    { label: 'Reports', href: '/institute', icon: BarChart3 },
    { label: 'Audit Logs', href: '/institute', icon: History },
    { label: 'Diagnostics', href: '/dev/diagnostics', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-[#06120E] text-slate-100 font-sans antialiased">
      {/* Desktop Sidebar (Matching Mockup Screens 2, 3, 4, 5) */}
      <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-[#143327] bg-[#071711]/90 backdrop-blur-xl shrink-0 p-5">
        <div className="space-y-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 px-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#00DC82] flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4 text-[#06120E] stroke-[2.5]" />
            </div>
            <span className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">
              CertiScholar
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#10B981] text-[#06120E] shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#0E261E]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-[#06120E] text-emerald-400'
                          : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Pill at Bottom */}
        <div className="p-3 rounded-xl bg-[#0B1E17] border border-[#143327] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-tight">Admin</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {roleBadge || 'Super Admin'}
              </span>
            </div>
          </div>
          <button
            onClick={async () => {
              await apiClient.logout();
              window.location.href = '/';
            }}
            title="Sign Out"
            className="text-slate-400 hover:text-rose-400 p-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header / Breadcrumb Bar */}
        <header className="border-b border-[#143327] bg-[#071711]/60 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* Mobile Sidebar Toggle & Breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white"
              >
                {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Link href="/" className="hover:text-emerald-400 transition-colors">
                  CertiScholar
                </Link>
                {breadcrumbs?.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-emerald-400 transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-slate-200">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Top Right Action Button */}
            {action && <div>{action}</div>}
          </div>
        </header>

        {/* Mobile Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div className="lg:hidden border-b border-[#143327] bg-[#091D16] p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#0E261E]"
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
