'use client';

import React from 'react';
import Link from 'next/link';

export function Navbar() {
  const scrollToLogin = () => {
    const el = document.getElementById('login-portal');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      const input = el.querySelector('input');
      input?.focus();
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="sticky top-0 z-50 h-14 bg-[#08090a]/85 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Geometric Diagonal Icon */}
            <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center relative overflow-hidden bg-white/[0.04]">
              <div className="w-[1px] h-6 bg-white transform rotate-45" />
            </div>
            <span className="font-medium text-sm text-[#f7f8f8] tracking-tight">
              CertiScholar
            </span>
          </Link>

          {/* In-Page Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-[13px] text-[#8a8f98]">
            <button
              onClick={() => scrollToSection('architecture')}
              className="hover:text-[#f7f8f8] transition-colors"
            >
              Architecture
            </button>
            <button
              onClick={() => scrollToSection('intake-ocr')}
              className="hover:text-[#f7f8f8] transition-colors"
            >
              Intake & OCR
            </button>
            <button
              onClick={() => scrollToSection('rule-engine')}
              className="hover:text-[#f7f8f8] transition-colors"
            >
              Rule Engine
            </button>
            <button
              onClick={() => scrollToSection('audit-trail')}
              className="hover:text-[#f7f8f8] transition-colors"
            >
              Audit Trail
            </button>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={scrollToLogin}
            className="btn-linear-ghost text-[13px] px-3 py-1.5"
          >
            Log in
          </button>
          <button
            onClick={scrollToLogin}
            className="btn-linear-primary text-[13px] px-3.5 py-1.5"
          >
            Sign in with OTP
          </button>
        </div>
      </div>
    </nav>
  );
}
