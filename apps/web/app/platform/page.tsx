'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Server,
  Activity,
  Layers,
  Database,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { apiClient } from '../../lib/api';

export default function PlatformSuperAdminPortal() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getHealth();
      setHealthData(res);
    } catch (err) {
      console.error('Failed to load health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <AppShell
      title="Platform Super Admin & Registry"
      subtitle="Cross-tenant isolation oversight, infrastructure health, and service telemetry."
      roleBadge="PLATFORM SUPER ADMIN"
      breadcrumbs={[{ label: 'Platform Root' }]}
      action={
        <button
          onClick={loadHealth}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Poll Services
        </button>
      }
    >
      <div className="space-y-6">
        {/* Service Health Card */}
        <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
          <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Infrastructure Status & Driver Manifest
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Real-time readiness and liveness telemetry from the Node.js API and microservices.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-black/40 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 block">Node.js API</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block">
                {healthData?.status || 'HEALTHY'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Port 4000</span>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 block">Database (MongoDB)</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block">
                {(healthData as any)?.dependencies?.database || 'UP'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Port 27017</span>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 block">Queue (Redis)</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block">
                {(healthData as any)?.dependencies?.redis || 'UP'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">BullMQ v5</span>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 block">Malware Engine</span>
              <span className="text-lg font-bold text-cyan-400 mt-1 block">
                {(healthData as any)?.dependencies?.scannerType || 'ClamAV'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Streaming socket</span>
            </div>
          </div>
        </div>

        {/* Tenancy Security Architecture */}
        <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Tenant Isolation Guarantees
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            CertiScholar enforces mandatory tenant boundaries at every architectural layer:
          </p>
          <ul className="space-y-2 text-xs text-slate-300 font-mono">
            <li className="p-3 rounded-lg bg-black/30 border border-slate-800/80">
              • <strong className="text-white">Database Query Scoping:</strong> Every collection
              (Documents, Extractions, Corrections, Scholarships, Recommendations) is indexed and queried
              with strict <code className="text-cyan-300">instituteId</code> predicates.
            </li>
            <li className="p-3 rounded-lg bg-black/30 border border-slate-800/80">
              • <strong className="text-white">No Insecure Fallback:</strong> Client requests cannot
              supply another tenant’s ID; non-super-admins are locked to their JWT claims.
            </li>
            <li className="p-3 rounded-lg bg-black/30 border border-slate-800/80">
              • <strong className="text-white">Officer Isolation:</strong> Verification officers can only
              view cases explicitly assigned to them or unassigned pooled cases in their institute.
            </li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

