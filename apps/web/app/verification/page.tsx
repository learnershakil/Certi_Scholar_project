'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Filter,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  UserCheck,
  Eye,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import { apiClient } from '../../lib/api';

export default function VerificationQueuePage() {
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const [queueRes, assignmentsRes] = await Promise.all([
        apiClient.getReviewQueue({ category: selectedCategory || undefined }),
        apiClient.getMyAssignments().catch(() => ({ data: [] })),
      ]);
      setQueueItems(queueRes.data?.items || []);
      setMyAssignments(assignmentsRes.data || []);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [selectedCategory]);

  return (
    <AppShell
      title="Human Review & Correction Queue"
      subtitle="Examine documents flagged for confidence calibration or data discrepancies."
      roleBadge="VERIFICATION OFFICER"
      breadcrumbs={[{ label: 'Review Queue' }]}
      action={
        <button
          onClick={loadQueue}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Queue
        </button>
      }
    >
      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-4 rounded-xl border border-amber-900/40">
            <span className="text-xs font-mono text-amber-400 block">Pending Review</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {queueItems.length}
            </span>
            <span className="text-[11px] text-slate-400">Awaiting officer verification</span>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-cyan-900/40">
            <span className="text-xs font-mono text-cyan-400 block">Assigned Directly</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {myAssignments.length}
            </span>
            <span className="text-[11px] text-slate-400">Scoped to your officer account</span>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-emerald-900/40">
            <span className="text-xs font-mono text-emerald-400 block">Concurrency Control</span>
            <span className="text-2xl font-bold text-white mt-1 block">Active</span>
            <span className="text-[11px] text-slate-400">Optimistic version locking</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="glass-panel p-4 rounded-xl flex items-center justify-between border border-[#1C2438]">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-300">Category Filter:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field py-1 text-xs w-56"
            >
              <option value="">All Categories</option>
              <option value="ACADEMIC_MARKSHEET">Academic Marksheets</option>
              <option value="INCOME_CERTIFICATE">Income Certificates</option>
              <option value="IDENTITY_PROOF">Identity Proofs</option>
            </select>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {queueItems.length} documents
          </span>
        </div>

        {/* Queue Table */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-[#1C2438]">
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-500">Loading review queue...</div>
          ) : queueItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-200">Review Queue Cleared</p>
              <p className="text-xs text-slate-500 mt-1">
                No documents currently require manual confidence calibration or correction.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono">
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Application ID</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {queueItems.map((doc) => (
                    <tr key={doc.id || doc._id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">
                          {doc.originalName || doc.filename}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {doc.id || doc._id}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                        {doc.category || 'ACADEMIC_MARKSHEET'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{doc.applicationId}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/verification/review/${doc.id || doc._id}`}
                          className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Side-by-Side Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

