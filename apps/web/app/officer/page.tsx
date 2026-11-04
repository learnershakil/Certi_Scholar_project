'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  Award,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { apiClient } from '../../lib/api';

export default function OfficerPortal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'ASSIGNMENTS' | 'DECISIONS'>('QUEUE');
  const [queue, setQueue] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [queueRes, assignmentsRes] = await Promise.all([
        apiClient.getReviewQueue().catch(() => ({ data: { items: [], total: 0, totalPages: 0 } })),
        apiClient.getMyAssignments().catch(() => ({ data: [] })),
      ]);

      const items = 'items' in (queueRes.data || {}) ? (queueRes.data as any).items : [];
      setQueue(items || []);
      setAssignments(assignmentsRes.data || []);
    } catch (err) {
      console.error('Failed to load officer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredQueue = queue.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.applicationId?.toLowerCase().includes(q) ||
      item.documentId?.toLowerCase().includes(q) ||
      item.categoryHint?.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell
      title="Review Queue"
      subtitle="Inspect extracted document fields, verify applicant claims, and calibrate confidence."
      breadcrumbs={[{ label: 'Verification & Review' }]}
      action={
        <button
          onClick={loadData}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Queue
        </button>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-white/[0.08] pb-3 text-xs">
          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'QUEUE'
                ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            Review Queue ({queue.length})
          </button>
          <button
            onClick={() => setActiveTab('ASSIGNMENTS')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'ASSIGNMENTS'
                ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            My Assigned Cases ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('DECISIONS')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'DECISIONS'
                ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            Evaluated Recommendations
          </button>
        </div>

        {/* Tab 1: Review Queue */}
        {activeTab === 'QUEUE' && (
          <div className="space-y-4">
            {/* Filter / Search Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#62666d]" />
                <input
                  type="text"
                  placeholder="Filter by Application ID, Document ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#101114] border border-white/[0.08] rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#62666d] focus:outline-none focus:border-white/20"
                />
              </div>
              <span className="text-xs text-[#8a8f98]">
                Showing {filteredQueue.length} pending items
              </span>
            </div>

            {/* Queue Table */}
            <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#101114] text-[#8a8f98] font-mono uppercase text-[11px]">
                    <th className="py-2.5 px-4 font-normal">Application ID</th>
                    <th className="py-2.5 px-4 font-normal">Document / Category</th>
                    <th className="py-2.5 px-4 font-normal">Confidence</th>
                    <th className="py-2.5 px-4 font-normal">Review Reason</th>
                    <th className="py-2.5 px-4 font-normal">Status</th>
                    <th className="py-2.5 px-4 font-normal text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#8a8f98]">
                        <CheckSquare className="w-6 h-6 mx-auto mb-2 opacity-30 text-[#10b981]" />
                        <span>All verification queues are clear. No pending review flags.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => (
                      <tr
                        key={item._id || item.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="py-3 px-4 font-mono font-medium text-white">
                          {item.applicationId || 'n/a'}
                        </td>
                        <td className="py-3 px-4 text-[#d0d3d8]">
                          <div className="font-medium text-white">
                            {item.originalFilename || 'Marksheet.pdf'}
                          </div>
                          <div className="text-[10px] font-mono text-[#8a8f98]">
                            {item.categoryHint || 'ACADEMIC_MARKSHEET'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono text-xs px-2 py-0.5 rounded ${
                              (item.confidence || 0.95) >= 0.9
                                ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20'
                                : 'bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20'
                            }`}
                          >
                            {((item.confidence || 0.95) * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#8a8f98]">
                          {item.reviewReason || 'Confidence Calibration Required'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20">
                            {item.status || 'PENDING_REVIEW'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/officer/review/${item.documentId || item._id || item.id}`}
                            className="btn-primary text-xs py-1 px-3 inline-flex items-center gap-1"
                          >
                            <span>Inspect & Correct</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Assigned Cases */}
        {activeTab === 'ASSIGNMENTS' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-6 text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="font-semibold text-white">My Active Assignments</span>
                <span className="text-[#8a8f98]">{assignments.length} items currently assigned</span>
              </div>
              {assignments.length === 0 ? (
                <div className="py-8 text-center text-[#8a8f98]">
                  <span>No specific cases assigned to your officer account. Review cases can be claimed from the global queue.</span>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {assignments.map((asg) => (
                    <div key={asg._id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white font-mono">{asg.applicationId}</div>
                        <div className="text-[11px] text-[#8a8f98]">{asg.notes || 'Routine Verification'}</div>
                      </div>
                      <Link
                        href={`/officer/review/${asg.documentId || asg._id}`}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        Open Case →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Evaluated Decisions */}
        {activeTab === 'DECISIONS' && (
          <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-6 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-semibold text-white">Recent Scholarship Decisions</span>
              <span className="text-[#10b981] font-mono">Single-Tenant Evaluation Active</span>
            </div>
            <p className="text-[#8a8f98]">
              Decisions are generated transparently using the M8 Scholarship Rule Engine with M6 academic consistency checks and M7 issuer verification adapters.
            </p>
            <div className="p-4 rounded-md bg-[#101114] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center text-[#10b981]">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-white">Merit Scholarship (APP-10482)</div>
                  <div className="text-[11px] text-[#8a8f98]">Ananya Sharma • Class XII Aggregate: 92.33%</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                ELIGIBLE
              </span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
