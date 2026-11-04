'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  Shield,
  Sliders,
  FileCheck,
  TrendingUp,
  Download,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { apiClient } from '../../lib/api';
import { UserRole } from '@repo/contracts';

interface RuleCondition {
  id: string;
  field: string;
  operator: string;
  value: string | number;
  unit: string;
}

export default function AdminPortal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'RULES' | 'USERS' | 'ASSIGN' | 'AUDIT'>('PIPELINE');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // New User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.OFFICER);
  const [creatingUser, setCreatingUser] = useState(false);

  // Scholarship Rule Builder State (Screen 5)
  const [scholarshipName, setScholarshipName] = useState('Merit Scholarship');
  const [logicalOp, setLogicalOp] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<RuleCondition[]>([
    {
      id: 'c1',
      field: 'Percentage in Class XII',
      operator: '>=',
      value: 85,
      unit: '%',
    },
    {
      id: 'c2',
      field: 'Annual Family Income',
      operator: '<=',
      value: 600000,
      unit: '₹',
    },
  ]);

  // Test Harness State
  const [testPercentage, setTestPercentage] = useState(88);
  const [testIncome, setTestIncome] = useState(450000);
  const [testResult, setTestResult] = useState<any>(null);
  const [testingRules, setTestingRules] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, usersRes, auditRes] = await Promise.all([
        apiClient.getDashboardMetrics(),
        apiClient.listUsers(),
        apiClient.getAuditLogs(),
      ]);

      setDashboardData(dashRes.data);
      setUsers(usersRes.data || []);
      setAuditLogs(auditRes.data || []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load admin data');
      setDashboardData(null);
      setUsers([]);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        field: 'Percentage in Class X',
        operator: '>=',
        value: 75,
        unit: '%',
      },
    ]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveRules = async () => {
    try {
      await apiClient.createScholarship({
        name: scholarshipName,
        code: `SCH-${scholarshipName.toUpperCase().replace(/\s+/g, '-')}`,
        rules: {
          operator: logicalOp,
          conditions: conditions.map((c) => ({
            field: c.field,
            operator: c.operator as any,
            value: Number(c.value) || c.value,
          })),
        },
      });
      setActionSuccess('Scholarship rules saved and AST versioned successfully.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save rules');
    }
  };

  const handleRunTestHarness = async () => {
    setTestingRules(true);
    try {
      const res = await apiClient.testRules({
        rules: {
          operator: logicalOp,
          conditions: conditions.map((c) => ({
            field: c.field,
            operator: c.operator as any,
            value: Number(c.value) || c.value,
          })),
        },
        applicantData: {
          'Percentage in Class XII': testPercentage,
          'Annual Family Income': testIncome,
        },
      });
      setTestResult(res.data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Rule test failed');
    } finally {
      setTestingRules(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setCreatingUser(true);
    try {
      await apiClient.createUser({
        email: newEmail,
        name: newName || newEmail.split('@')[0],
        role: newRole,
      });
      setActionSuccess(`User ${newEmail} created with role ${newRole}`);
      setNewEmail('');
      setNewName('');
      await loadData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'User creation failed');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await fetch('/api/bff/v1/reporting/export/csv');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CertiScholar_Applications_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <AppShell
      title="Application Pipeline"
      subtitle="Real-time overview of document processing and scholarship applications."
      breadcrumbs={[{ label: 'Administration' }]}
      action={
        <button
          onClick={loadData}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        {loadError && (
          <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {loadError} — dashboard data is not shown as empty; it failed to load.
          </div>
        )}
        {actionSuccess && (
          <div className="p-3 rounded-md bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-white/[0.08] pb-3 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('PIPELINE')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
              activeTab === 'PIPELINE'
                ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            Pipeline & Analytics
          </button>
          <button
            onClick={() => setActiveTab('RULES')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
              activeTab === 'RULES'
                ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            Scholarship Rule Builder
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
              activeTab === 'USERS'
                ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            Users & Roles ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
              activeTab === 'AUDIT'
                ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            Audit Trail & CSV Export
          </button>
        </div>

        {/* Tab 1: Pipeline & Analytics (Screen 2 & Screen 6) */}
        {activeTab === 'PIPELINE' && (
          <div className="space-y-6">
            {/* 4 Top KPI Cards (Screen 2 Top) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border border-white/[0.08] bg-[#0c0d0e]">
                <div className="text-[#8a8f98] text-xs font-medium">Total Applications</div>
                <div className="text-2xl font-bold text-white mt-1">1,248</div>
                <div className="text-[11px] text-[#10b981] font-mono mt-1">↑ +12% this month</div>
              </div>

              <div className="p-4 rounded-lg border border-white/[0.08] bg-[#0c0d0e]">
                <div className="text-[#8a8f98] text-xs font-medium">Processed</div>
                <div className="text-2xl font-bold text-white mt-1">892</div>
                <div className="text-[11px] text-[#10b981] font-mono mt-1">↑ +18%</div>
              </div>

              <div className="p-4 rounded-lg border border-white/[0.08] bg-[#0c0d0e]">
                <div className="text-[#8a8f98] text-xs font-medium">In Review</div>
                <div className="text-2xl font-bold text-white mt-1">168</div>
                <div className="text-[11px] text-[#eab308] font-mono mt-1">↓ -6% backlog</div>
              </div>

              <div className="p-4 rounded-lg border border-white/[0.08] bg-[#0c0d0e]">
                <div className="text-[#8a8f98] text-xs font-medium">Eligible</div>
                <div className="text-2xl font-bold text-white mt-1">142</div>
                <div className="text-[11px] text-[#10b981] font-mono mt-1">↑ +21%</div>
              </div>
            </div>

            {/* Middle Section: Processing Funnel & Applications Over Time (Screen 2 Middle) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Funnel (5 cols) */}
              <div className="lg:col-span-5 rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-5 space-y-4">
                <span className="text-xs font-semibold text-white block">Processing Funnel</span>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-[#8a8f98] mb-1">
                      <span>Uploaded</span>
                      <span className="font-mono text-white">1,248</span>
                    </div>
                    <div className="w-full h-2 rounded bg-white/[0.06] overflow-hidden">
                      <div className="w-full h-full bg-[#10b981]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#8a8f98] mb-1">
                      <span>OCR Completed</span>
                      <span className="font-mono text-white">1,183</span>
                    </div>
                    <div className="w-full h-2 rounded bg-white/[0.06] overflow-hidden">
                      <div className="w-[95%] h-full bg-[#10b981]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#8a8f98] mb-1">
                      <span>Extraction Done</span>
                      <span className="font-mono text-white">1,052</span>
                    </div>
                    <div className="w-full h-2 rounded bg-white/[0.06] overflow-hidden">
                      <div className="w-[84%] h-full bg-[#10b981]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#8a8f98] mb-1">
                      <span>Reviewed</span>
                      <span className="font-mono text-white">892</span>
                    </div>
                    <div className="w-full h-2 rounded bg-white/[0.06] overflow-hidden">
                      <div className="w-[71%] h-full bg-[#10b981]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#8a8f98] mb-1">
                      <span>Eligible</span>
                      <span className="font-mono text-[#10b981]">142</span>
                    </div>
                    <div className="w-full h-2 rounded bg-white/[0.06] overflow-hidden">
                      <div className="w-[11.4%] h-full bg-[#10b981]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Applications Over Time Area Graph (7 cols) */}
              <div className="lg:col-span-7 rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Applications Over Time</span>
                  <span className="text-[11px] font-mono text-[#8a8f98]">Sep 22: 264 applications</span>
                </div>

                {/* SVG Area Chart */}
                <div className="w-full aspect-[21/9] relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Horizontal grid lines */}
                    <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.06)" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.06)" />
                    <line x1="0" y1="140" x2="500" y2="140" stroke="rgba(255,255,255,0.06)" />

                    {/* Area fill */}
                    <path
                      d="M 20 150 Q 80 140, 140 120 T 260 80 T 360 40 T 480 90 L 480 170 L 20 170 Z"
                      fill="url(#areaGradient)"
                    />
                    {/* Stroke line */}
                    <path
                      d="M 20 150 Q 80 140, 140 120 T 260 80 T 360 40 T 480 90"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />
                    {/* Peak point */}
                    <circle cx="360" cy="40" r="4" fill="#10b981" stroke="#08090a" strokeWidth="2" />
                  </svg>
                  <div className="flex justify-between text-[10px] font-mono text-[#62666d] mt-2">
                    <span>Sep 6</span>
                    <span>Sep 10</span>
                    <span>Sep 14</span>
                    <span>Sep 18</span>
                    <span className="text-[#10b981] font-semibold">Sep 22</span>
                    <span>Sep 26</span>
                    <span>Sep 30</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen 6 Reports & Analytics (Accuracy, Outcomes Breakdown) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Extraction Accuracy by Document Type (6 cols) */}
              <div className="lg:col-span-6 rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-5 space-y-4">
                <span className="text-xs font-semibold text-white block">
                  Extraction Accuracy by Document Type
                </span>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-[#8a8f98] mb-1">
                      <span>Marksheet (Class XII)</span>
                      <span className="font-mono text-white">93.4%</span>
                    </div>
                    <div className="w-full h-2 rounded bg-white/[0.06] overflow-hidden">
                      <div className="w-[93.4%] h-full bg-[#10b981]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#8a8f98] mb-1">
                      <span>Income Certificate</span>
                      <span className="font-mono text-white">90.2%</span>
                    </div>
                    <div className="w-full h-2 rounded bg-white/[0.06] overflow-hidden">
                      <div className="w-[90.2%] h-full bg-[#10b981]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#8a8f98] mb-1">
                      <span>Identity Document (Aadhaar / PAN)</span>
                      <span className="font-mono text-white">91.3%</span>
                    </div>
                    <div className="w-full h-2 rounded bg-white/[0.06] overflow-hidden">
                      <div className="w-[91.3%] h-full bg-[#10b981]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Outcomes Breakdown (6 cols) */}
              <div className="lg:col-span-6 rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-5 space-y-4">
                <span className="text-xs font-semibold text-white block">Application Outcomes</span>
                <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                  <div className="p-3 rounded bg-[#101114] border border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                      <span className="text-[#8a8f98]">Eligible</span>
                    </div>
                    <div className="font-mono font-bold text-white text-base mt-1">142 (11.4%)</div>
                  </div>

                  <div className="p-3 rounded bg-[#101114] border border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-[#8a8f98]">Not Eligible</span>
                    </div>
                    <div className="font-mono font-bold text-white text-base mt-1">36 (2.9%)</div>
                  </div>

                  <div className="p-3 rounded bg-[#101114] border border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#eab308]" />
                      <span className="text-[#8a8f98]">In Review</span>
                    </div>
                    <div className="font-mono font-bold text-white text-base mt-1">168 (13.5%)</div>
                  </div>

                  <div className="p-3 rounded bg-[#101114] border border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[#8a8f98]">Processing</span>
                    </div>
                    <div className="font-mono font-bold text-white text-base mt-1">902 (72.2%)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Applications Table (Screen 2 Bottom) */}
            <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] overflow-hidden">
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Recent Applications</span>
                <button
                  onClick={() => router.push('/officer')}
                  className="text-[11px] text-[#10b981] hover:underline"
                >
                  View All Review Cases →
                </button>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#101114] text-[#8a8f98] font-mono uppercase text-[11px]">
                    <th className="py-2.5 px-4 font-normal">Application ID</th>
                    <th className="py-2.5 px-4 font-normal">Student Name</th>
                    <th className="py-2.5 px-4 font-normal">Scholarship</th>
                    <th className="py-2.5 px-4 font-normal">Status</th>
                    <th className="py-2.5 px-4 font-normal text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono font-medium text-white">APP-10482</td>
                    <td className="py-3 px-4 text-white">Ananya Sharma</td>
                    <td className="py-3 px-4 text-[#8a8f98]">Merit Scholarship</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                        Eligible
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#8a8f98]">2 min ago</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono font-medium text-white">APP-10481</td>
                    <td className="py-3 px-4 text-white">Rohan Mehta</td>
                    <td className="py-3 px-4 text-[#8a8f98]">Need-Based Aid</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20">
                        In Review
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#8a8f98]">8 min ago</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Scholarship Rule Builder (Screen 5) */}
        {activeTab === 'RULES' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Scholarship Rule Builder</h3>
                  <p className="text-xs text-[#8a8f98] mt-0.5">
                    Create and manage eligibility rules without writing code.
                  </p>
                </div>
                <button onClick={handleSaveRules} className="btn-primary text-xs py-1.5 px-4">
                  Save Changes
                </button>
              </div>

              {/* Scholarship Header */}
              <div className="flex items-center justify-between p-3 rounded bg-[#101114] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={scholarshipName}
                    onChange={(e) => setScholarshipName(e.target.value)}
                    className="bg-transparent font-medium text-white text-sm focus:outline-none"
                  />
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-[#08090a] p-1 rounded border border-white/[0.08] text-[11px]">
                  <button
                    onClick={() => setLogicalOp('AND')}
                    className={`px-2 py-0.5 rounded font-mono ${
                      logicalOp === 'AND' ? 'bg-white/[0.1] text-white' : 'text-[#8a8f98]'
                    }`}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => setLogicalOp('OR')}
                    className={`px-2 py-0.5 rounded font-mono ${
                      logicalOp === 'OR' ? 'bg-white/[0.1] text-white' : 'text-[#8a8f98]'
                    }`}
                  >
                    OR
                  </button>
                </div>
              </div>

              {/* Conditions List */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-white block">Eligibility Conditions</span>
                {conditions.map((cond) => (
                  <div
                    key={cond.id}
                    className="p-3 rounded bg-[#101114] border border-white/[0.06] flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <select
                        value={cond.field}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConditions((prev) =>
                            prev.map((c) => (c.id === cond.id ? { ...c, field: val } : c))
                          );
                        }}
                        className="bg-[#08090a] border border-white/[0.08] rounded p-1.5 text-white text-xs"
                      >
                        <option value="Percentage in Class XII">Percentage in Class XII</option>
                        <option value="Annual Family Income">Annual Family Income</option>
                        <option value="Percentage in Class X">Percentage in Class X</option>
                      </select>

                      <select
                        value={cond.operator}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConditions((prev) =>
                            prev.map((c) => (c.id === cond.id ? { ...c, operator: val } : c))
                          );
                        }}
                        className="bg-[#08090a] border border-white/[0.08] rounded p-1.5 text-white font-mono text-xs"
                      >
                        <option value=">=">&gt;=</option>
                        <option value="<=">&lt;=</option>
                        <option value="==">==</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                      </select>

                      <input
                        type="number"
                        value={cond.value}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setConditions((prev) =>
                            prev.map((c) => (c.id === cond.id ? { ...c, value: val } : c))
                          );
                        }}
                        className="bg-[#08090a] border border-white/[0.08] rounded p-1.5 text-white font-mono text-xs w-28"
                      />

                      <span className="text-[#8a8f98] font-mono">{cond.unit}</span>
                    </div>

                    <button
                      onClick={() => handleRemoveCondition(cond.id)}
                      className="text-[#8a8f98] hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={handleAddCondition}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Condition</span>
                </button>
              </div>

              {/* Real-time Hypothetical Applicant Test Harness */}
              <div className="border-t border-white/[0.08] pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Hypothetical Applicant Test Harness</span>
                  <button
                    onClick={handleRunTestHarness}
                    disabled={testingRules}
                    className="btn-primary text-xs py-1 px-3 flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3" />
                    <span>{testingRules ? 'Evaluating...' : 'Evaluate Test Applicant'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[#8a8f98] mb-1">Percentage in Class XII (%)</label>
                    <input
                      type="number"
                      value={testPercentage}
                      onChange={(e) => setTestPercentage(Number(e.target.value))}
                      className="w-full bg-[#101114] border border-white/[0.08] rounded p-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8a8f98] mb-1">Annual Family Income (₹)</label>
                    <input
                      type="number"
                      value={testIncome}
                      onChange={(e) => setTestIncome(Number(e.target.value))}
                      className="w-full bg-[#101114] border border-white/[0.08] rounded p-2 text-white font-mono"
                    />
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded text-xs border flex items-center justify-between ${
                      testResult.isEligible
                        ? 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}
                  >
                    <span>
                      Outcome: <strong>{testResult.isEligible ? 'ELIGIBLE' : 'INELIGIBLE'}</strong>
                    </span>
                    <span className="font-mono text-[11px]">{testResult.reason || 'All conditions satisfied'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Users & Roles */}
        {activeTab === 'USERS' && (
          <div className="space-y-6">
            {/* Create New User */}
            <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] p-5 space-y-4">
              <span className="text-xs font-semibold text-white block">Provision Organization User</span>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-[#101114] border border-white/[0.08] rounded p-2 text-white"
                />
                <input
                  type="text"
                  placeholder="Full Name (optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-[#101114] border border-white/[0.08] rounded p-2 text-white"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="bg-[#101114] border border-white/[0.08] rounded p-2 text-white"
                >
                  <option value={UserRole.STUDENT}>STUDENT (Applicant)</option>
                  <option value={UserRole.OFFICER}>OFFICER (Verification & Review)</option>
                  <option value={UserRole.ADMIN}>ADMIN (Organization Admin)</option>
                </select>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="btn-primary text-xs py-2 px-4 justify-center"
                >
                  {creatingUser ? 'Creating...' : '+ Add User'}
                </button>
              </form>
            </div>

            {/* Users Table */}
            <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#101114] text-[#8a8f98] font-mono uppercase text-[11px]">
                    <th className="py-2.5 px-4 font-normal">Name</th>
                    <th className="py-2.5 px-4 font-normal">Email</th>
                    <th className="py-2.5 px-4 font-normal">Role</th>
                    <th className="py-2.5 px-4 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {users.map((u) => (
                    <tr key={u._id || u.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-medium text-white">{u.name || 'User'}</td>
                      <td className="py-3 px-4 text-[#8a8f98] font-mono">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-white border border-white/[0.08]">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#10b981] flex items-center gap-1.5 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Trail & CSV Export */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98]">
                Immutable, append-only security log for regulatory compliance.
              </span>
              <button
                onClick={handleExportCsv}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Applications CSV (M10)</span>
              </button>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-[#0c0d0e] overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#101114] text-[#8a8f98] font-mono uppercase text-[11px]">
                    <th className="py-2.5 px-4 font-normal">Timestamp</th>
                    <th className="py-2.5 px-4 font-normal">Event Type</th>
                    <th className="py-2.5 px-4 font-normal">Description</th>
                    <th className="py-2.5 px-4 font-normal">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#8a8f98]">
                        Audit logs recorded continuously upon verification events.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-mono text-[#8a8f98] text-[11px]">
                          {new Date(log.timestamp || log.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[#10b981]">{log.action || log.type}</td>
                        <td className="py-2.5 px-4 text-white">{log.description || log.title || 'Audited event'}</td>
                        <td className="py-2.5 px-4 text-[#8a8f98] font-mono">{log.actorRole || 'SYSTEM'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
