'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  CheckSquare,
  Award,
  Sliders,
  Shield,
  BarChart3,
  History,
  Users,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { UserRole } from '@repo/contracts';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  action?: React.ReactNode;
}

export function AppShell({
  children,
  title,
  subtitle,
  breadcrumbs,
  action,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    apiClient
      .getMe()
      .then((res) => {
        if (res?.data) {
          setCurrentUser(res.data);
        } else {
          router.push('/');
        }
      })
      .catch(() => {
        router.push('/');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleSignOut = async () => {
    await apiClient.logout();
  };

  const role = currentUser?.role || currentUser?.roles?.[0] || 'STUDENT';

  // Role-isolated navigation links
  const studentNav = [
    { label: 'Upload Documents', href: '/student', icon: FileText },
  ];

  const officerNav = [
    { label: 'Review Queue', href: '/officer', icon: CheckSquare },
  ];

  const adminNav = [
    { label: 'Organization Overview', href: '/admin', icon: BarChart3 },
  ];

  const navItems =
    role === UserRole.ADMIN || role === 'ADMIN'
      ? adminNav
      : role === UserRole.OFFICER || role === 'OFFICER'
      ? officerNav
      : studentNav;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090a] flex items-center justify-center">
        <div className="flex items-center gap-3 text-xs text-[#8a8f98]">
          <div className="w-4 h-4 rounded-full border border-white/20 border-t-white animate-spin" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#08090a] text-[#f7f8f8] antialiased">
      {/* Desktop Sidebar (220px fixed width, #0c0d0e) */}
      <aside className="hidden lg:flex w-[220px] flex-col justify-between border-r border-white/[0.08] bg-[#0c0d0e] shrink-0 p-3">
        <div className="space-y-4">
          {/* Organization Header */}
          <div className="flex items-center justify-between px-2 py-1.5">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center relative overflow-hidden bg-white/[0.04]">
                <div className="w-[1px] h-5 bg-white transform rotate-45" />
              </div>
              <span className="font-medium text-[13px] text-[#f7f8f8]">
                CertiScholar
              </span>
            </Link>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-[#8a8f98] border border-white/[0.06]">
              {role}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-0.5 pt-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                    isActive
                      ? 'bg-white/[0.08] text-[#f7f8f8] font-medium'
                      : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 opacity-70" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile Bar */}
        <div className="border-t border-white/[0.08] pt-3 px-1 space-y-2">
          <div className="px-1">
            <div className="text-[12px] font-medium text-[#f7f8f8] truncate">
              {currentUser?.name || 'User'}
            </div>
            <div className="text-[11px] font-mono text-[#62666d] truncate">
              {currentUser?.email || ''}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-2 py-1 rounded text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.04] transition-colors"
          >
            <span>Sign out</span>
            <LogOut className="w-3 h-3 opacity-60" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header (56px) */}
        <header className="h-14 border-b border-white/[0.08] bg-[#08090a]/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-1 text-[#8a8f98] hover:text-[#f7f8f8]"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[13px]">
              <span className="text-[#62666d]">Workspace</span>
              <ChevronRight className="w-3 h-3 text-[#62666d]" />
              {breadcrumbs?.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span className="text-[#8a8f98]">{crumb.label}</span>
                  <ChevronRight className="w-3 h-3 text-[#62666d]" />
                </React.Fragment>
              ))}
              <span className="text-[#f7f8f8] font-medium">{title}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-[#62666d]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                BFF Key Active
              </span>
              <span>&bull;</span>
              <span>Local Tesseract OCR</span>
            </div>
            {action && <div>{action}</div>}
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto space-y-6">
            {subtitle && (
              <p className="text-[13px] text-[#8a8f98] -mt-2 mb-4">{subtitle}</p>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
