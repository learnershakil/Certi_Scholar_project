'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldCheck, LogOut, User, Menu, X, ArrowUpRight } from 'lucide-react';
import { apiClient } from '../lib/api';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    apiClient
      .getMe()
      .then((res) => {
        if (res?.data) setCurrentUser(res.data);
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      setCurrentUser(null);
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#06120E]/80 backdrop-blur-xl border-b border-[#143327]">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#00DC82] flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-[#06120E] stroke-[2.5]" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              CertiScholar
            </span>
          </Link>

          {/* Desktop Nav Links from Mockup */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <Link href="/#product" className="hover:text-white transition-colors">
              Product
            </Link>
            <Link href="/#solutions" className="hover:text-white transition-colors">
              Solutions
            </Link>
            <Link href="/#resources" className="hover:text-white transition-colors">
              Resources
            </Link>
            <Link href="/#pricing" className="hover:text-white transition-colors">
              Pricing
            </Link>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {currentUser ? (
            <div className="flex items-center gap-3 pl-3 border-l border-[#143327]">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5 justify-end">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  {currentUser.email || currentUser.userId.substring(0, 8)}
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {currentUser.roles?.[0] || 'STUDENT'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/sign-in"
                className="text-sm font-medium text-slate-200 hover:text-white transition-colors px-3 py-2"
              >
                Login
              </Link>
              <Link href="/auth/sign-in" className="btn-pill-white text-xs py-2 px-5">
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-950/40"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#143327] bg-[#081712] px-6 py-4 space-y-3">
          <Link
            href="/student"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-white font-medium"
          >
            Student Workspace
          </Link>
          <Link
            href="/verification"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-white font-medium"
          >
            Review Queue
          </Link>
          <Link
            href="/institute"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-white font-medium"
          >
            Institute Dashboard
          </Link>
          <Link
            href="/scholarship"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-white font-medium"
          >
            Scholarship Officer
          </Link>
          <div className="pt-3 border-t border-[#143327]">
            <Link
              href="/auth/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center btn-pill-white text-xs py-2.5"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
