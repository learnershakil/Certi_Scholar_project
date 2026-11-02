import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'document' | 'scan' | 'verification' | 'review';
}

export function StatusBadge({ status, type = 'document' }: StatusBadgeProps) {
  let colorClass = 'bg-slate-800 text-slate-300 border-slate-700';

  const normalized = status.toUpperCase();

  if (['CLEAN', 'COMPLETED', 'VERIFIED', 'AUTO_ACCEPTED', 'ELIGIBLE', 'MATCHED'].includes(normalized)) {
    colorClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80';
  } else if (['PENDING_REVIEW', 'NEEDS_REVIEW', 'VERIFICATION_PENDING', 'PROCESSING_QUEUED', 'OCR_IN_PROGRESS'].includes(normalized)) {
    colorClass = 'bg-amber-950/70 text-amber-300 border-amber-800/80 animate-pulse';
  } else if (['QUARANTINED', 'INFECTED', 'REJECTED', 'DISCREPANCY_DETECTED', 'INELIGIBLE', 'MISMATCH'].includes(normalized)) {
    colorClass = 'bg-rose-950/70 text-rose-300 border-rose-800/80';
  } else if (['UNAVAILABLE', 'NOT_FOUND', 'UNABLE_TO_CALCULATE'].includes(normalized)) {
    colorClass = 'bg-slate-900 text-slate-400 border-slate-800';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase ${colorClass}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

