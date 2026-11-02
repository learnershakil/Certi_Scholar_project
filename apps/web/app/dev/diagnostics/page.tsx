'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Activity,
  ShieldAlert,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { AppShell } from '../../../components/AppShell';
import { apiClient } from '../../../lib/api';

export default function DiagnosticsPage() {
  const [probeResult, setProbeResult] = useState<any>(null);
  const [probing, setProbing] = useState(false);

  const [simulatedType, setSimulatedType] = useState<
    'CLEAN_PDF' | 'MALICIOUS_JS' | 'EICAR_INFECTED' | 'SPOOFED_EXE'
  >('CLEAN_PDF');
  const [intakeLog, setIntakeLog] = useState<any>(null);
  const [runningIntake, setRunningIntake] = useState(false);

  const runHealthProbe = async () => {
    setProbing(true);
    setProbeResult(null);
    try {
      const res = await apiClient.getHealth();
      setProbeResult(res);
    } catch (err: unknown) {
      setProbeResult({ error: err instanceof Error ? err.message : 'Probe failed' });
    } finally {
      setProbing(false);
    }
  };

  const handleSimulatedIntake = async () => {
    setRunningIntake(true);
    setIntakeLog(null);
    try {
      let sampleBuffer: Uint8Array;
      let filename = 'test_sample.pdf';
      const mimeType = 'application/pdf';

      if (simulatedType === 'CLEAN_PDF') {
        const text =
          '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n206\n%%EOF';
        sampleBuffer = new TextEncoder().encode(text);
      } else if (simulatedType === 'MALICIOUS_JS') {
        filename = 'suspicious_payload.pdf';
        const text =
          '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /OpenAction 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Action /S /JavaScript /JS (app.alert("malicious script");) >>\nendobj\n%%EOF';
        sampleBuffer = new TextEncoder().encode(text);
      } else if (simulatedType === 'EICAR_INFECTED') {
        filename = 'eicar_test_doc.pdf';
        const text =
          '%PDF-1.4\nX5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*\n%%EOF';
        sampleBuffer = new TextEncoder().encode(text);
      } else {
        filename = 'spoofed_exe.pdf';
        const text = 'MZ\x90\x00\x03\x00\x00\x00Binary Executable masquerading as PDF';
        sampleBuffer = new TextEncoder().encode(text);
      }

      const fileBlob = new Blob([sampleBuffer.buffer as ArrayBuffer], { type: mimeType });
      const file = new File([fileBlob], filename, { type: mimeType });

      // Step 1: Initiate
      const reg = await apiClient.initiateUpload({
        filename,
        mimeType: 'application/pdf',
        fileSize: sampleBuffer.length,
        applicationId: `APP-DIAG-${Date.now().toString().slice(-4)}`,
        instituteId: 'INST_DEV',
      });

      const docId = reg.data.document.id;

      // Step 2: Upload Buffer
      const uploadRes = await apiClient.uploadFileBuffer(docId, file);
      setIntakeLog({
        status: 'SUCCESS',
        document: uploadRes.data,
      });
    } catch (err: unknown) {
      setIntakeLog({
        status: 'REJECTED',
        error: err instanceof Error ? err.message : 'Intake failed',
      });
    } finally {
      setRunningIntake(false);
    }
  };

  return (
    <AppShell
      title="System Diagnostics & Security Probes"
      subtitle="Interactive test harness for malware scanner, bounded parser, and gateway validation."
      roleBadge="DEVELOPER DIAGNOSTICS"
      breadcrumbs={[{ label: 'System Diagnostics' }]}
    >
      <div className="space-y-6">
        {/* Probe 1: Upstream Gateway Health */}
        <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Next.js BFF → Node.js API Service Gateway Probe
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifies x-http-key header authorization and upstream service responses.
              </p>
            </div>
            <button
              onClick={runHealthProbe}
              disabled={probing}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              {probing ? 'Probing...' : 'Execute Probe'}
            </button>
          </div>

          {probeResult && (
            <pre className="p-4 rounded-xl bg-black/60 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto">
              {JSON.stringify(probeResult, null, 2)}
            </pre>
          )}
        </div>

        {/* Probe 2: Malware & Quarantine Simulation */}
        <div className="glass-panel p-6 rounded-2xl border border-[#1C2438]">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Antivirus & Quarantine Live Ingestion Test
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Simulate malicious payloads, EICAR antivirus test strings, and bounded PDF validation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Select Test Payload
              </label>
              <select
                value={simulatedType}
                onChange={(e: any) => setSimulatedType(e.target.value)}
                className="input-field text-xs font-mono"
              >
                <option value="CLEAN_PDF">Clean Standard PDF (Should Pass to OCR)</option>
                <option value="EICAR_INFECTED">EICAR Test String (Should Quarantine)</option>
                <option value="MALICIOUS_JS">Embedded JavaScript Object (Flagged)</option>
                <option value="SPOOFED_EXE">Spoofed EXE Header (Rejected)</option>
              </select>
            </div>

            <button
              onClick={handleSimulatedIntake}
              disabled={runningIntake}
              className="btn-primary text-xs py-2 px-4 justify-center"
            >
              {runningIntake ? 'Streaming to ClamAV...' : 'Run Intake Simulation'}
            </button>
          </div>

          {intakeLog && (
            <div
              className={`p-4 rounded-xl border font-mono text-xs ${
                intakeLog.status === 'SUCCESS'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              <div className="font-bold mb-1">
                {intakeLog.status === 'SUCCESS'
                  ? '✓ Intake Processed Cleanly'
                  : '✗ File Rejected / Quarantined'}
              </div>
              <pre className="text-[11px] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(intakeLog, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

