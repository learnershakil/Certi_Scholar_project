'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function AwwwardsCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only enable on devices with fine pointer (mouse/trackpad)
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    // Fast quickTo setters for 60-120fps smooth interpolation
    const setRingX = gsap.quickTo(ring, 'x', { duration: 0.3, ease: 'power3.out' });
    const setRingY = gsap.quickTo(ring, 'y', { duration: 0.3, ease: 'power3.out' });
    const setDotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power2.out' });
    const setDotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power2.out' });

    let isVisible = false;

    const onMouseMove = (e: MouseEvent) => {
      if (!isVisible) {
        gsap.to([ring, dot], { opacity: 1, duration: 0.2 });
        isVisible = true;
      }
      setRingX(e.clientX);
      setRingY(e.clientY);
      setDotX(e.clientX);
      setDotY(e.clientY);
    };

    const onMouseLeave = () => {
      gsap.to([ring, dot], { opacity: 0, duration: 0.2 });
      isVisible = false;
    };

    const onMouseEnterInteractive = () => {
      gsap.to(ring, {
        scale: 2.4,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: '#00DC82',
        duration: 0.25,
        ease: 'power2.out',
      });
      gsap.to(dot, {
        scale: 0.4,
        duration: 0.2,
      });
    };

    const onMouseLeaveInteractive = () => {
      gsap.to(ring, {
        scale: 1,
        backgroundColor: 'transparent',
        borderColor: 'rgba(52, 211, 153, 0.6)',
        duration: 0.25,
        ease: 'power2.out',
      });
      gsap.to(dot, {
        scale: 1,
        duration: 0.2,
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    // Attach listeners to interactive elements
    const attachHoverListeners = () => {
      const interactives = document.querySelectorAll<HTMLElement>(
        'a, button, [role="button"], input, select, textarea, [data-cursor-hover]'
      );
      interactives.forEach((el) => {
        el.addEventListener('mouseenter', onMouseEnterInteractive);
        el.addEventListener('mouseleave', onMouseLeaveInteractive);
      });
      return interactives;
    };

    let interactives = attachHoverListeners();

    // Re-attach observer for dynamically rendered elements
    const observer = new MutationObserver(() => {
      interactives.forEach((el) => {
        el.removeEventListener('mouseenter', onMouseEnterInteractive);
        el.removeEventListener('mouseleave', onMouseLeaveInteractive);
      });
      interactives = attachHoverListeners();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      observer.disconnect();
      interactives.forEach((el) => {
        el.removeEventListener('mouseenter', onMouseEnterInteractive);
        el.removeEventListener('mouseleave', onMouseLeaveInteractive);
      });
    };
  }, []);

  return (
    <>
      {/* Outer fluid trailing ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-emerald-400/60 pointer-events-none -translate-x-1/2 -translate-y-1/2 z-[99999] opacity-0 transition-colors duration-150 shadow-[0_0_15px_rgba(16,185,129,0.3)] hidden sm:block"
      />
      {/* Center pinpoint dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-[#00DC82] pointer-events-none -translate-x-1/2 -translate-y-1/2 z-[99999] opacity-0 hidden sm:block shadow-[0_0_8px_#00DC82]"
      />
    </>
  );
}

