'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldCheck, LogOut, User, Building, ExternalLink, Menu, X } from 'lucide-react';
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
      .catch(() => {
        // Not logged in or session expired
      });
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

  const navLinks = [
    { href: '/student', label: 'Student Portal', roles: ['STUDENT'] },
    { href: '/verification', label: 'Review Queue', roles: ['VERIFICATION_OFFICER', 'INSTITUTE_ADMIN'] },
    { href: '/institute', label: 'Institute Admin', roles: ['INSTITUTE_ADMIN'] },
    { href: '/scholarship', label: 'Scholarships', roles: ['SCHOLARSHIP_OFFICER', 'INSTITUTE_ADMIN'] },
    { href: '/dev/diagnostics', label: 'System Diagnostics', roles: [] },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-[#1C2438] bg-[#07090E]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                  CertiScholar
                </span>
                <span className="text-[10px] tracking-widest uppercase text-cyan-400/80 font-mono -mt-1">
                  Enterprise SaaS
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User Status / Login */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 justify-end">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    {currentUser.email || currentUser.userId.substring(0, 8)}
                  </span>
                  <div className="flex items-center gap-1 justify-end">
                    {currentUser.roles?.map((role: string) => (
                      <span
                        key={role}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/sign-in" className="btn-secondary text-xs py-1.5 px-3">
                  Sign In
                </Link>
                <Link href="/student" className="btn-primary text-xs py-1.5 px-3">
                  Upload Document
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0D111D] px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {link.label}
            </Link>
          ))}
          {currentUser ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-3 py-2 text-rose-400 font-medium hover:bg-rose-950/30 rounded-md"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/auth/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center mt-2 btn-primary"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

