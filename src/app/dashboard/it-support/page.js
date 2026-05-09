'use client';

import { useContext, useState } from 'react';
import { WorkflowContext } from '../layout';
import { supabase } from '@/lib/supabase';

export default function ITSupport() {
  const { globalTasks, globalSystemLogs, refreshFromDB, addWorkflowLog } = useContext(WorkflowContext);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  const itTasks    = globalTasks?.filter(t => t.dept === 'IT') || [];
  const pending    = itTasks.filter(t => t.status === 'Pending');
  const resolved   = itTasks.filter(t => t.status === 'Resolved');

  const markResolved = async (task) => {
    setLoadingId(task.id);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from('workflow_tasks').update({ status: 'Resolved' }).eq('id', task.id);
      if (updErr) throw updErr;

      if (task.linked_candidate_id) {
        if (task.source === 'HR Offboard Trigger') {
          await supabase.from('candidates')
            .update({ it_provisioned: false }).eq('id', task.linked_candidate_id);
          await addWorkflowLog(
            `IT deprovisioning complete for candidate — Access Revoked ✓`, 'IT'
          );
        } else {
          await supabase.from('candidates')
            .update({ it_provisioned: true }).eq('id', task.linked_candidate_id);
          await addWorkflowLog(
            `IT provisioning complete for candidate — HR handshake sent ✓`, 'IT'
          );
        }
      } else {
        await addWorkflowLog(`IT resolved: ${task.title}`, 'IT');
      }

      await refreshFromDB();
    } catch (e) {
      setError(e.message);
    }
    setLoadingId(null);
  };

  return (
    <div className="flex gap-8 h-full">
      {/* Left — ticket queue */}
      <div className="flex-1 flex flex-col gap-6">
        <div>
          <h1 className="page-title">IT Service Desk</h1>
          <p className="page-sub">Resolve provisioning requests and cross-dept handshakes</p>
        </div>

        {error && (
          <div className="card border-l-4 border-l-[#EF4444] py-3 text-sm text-[#991B1B]">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card">
            <div className="stat-label">Pending Tickets</div>
            <div className="stat-value text-[#F59E0B]">{pending.length}</div>
            <div className="stat-sub">Awaiting resolution</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Resolved</div>
            <div className="stat-value text-[#10B981]">{resolved.length}</div>
            <div className="stat-sub">This session</div>
          </div>
        </div>

        {/* Pending tickets */}
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="font-semibold">Pending Tickets</h2>
            {pending.length > 0 && <span className="badge badge-warning">{pending.length}</span>}
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {pending.map(t => (
              <div key={t.id} className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-[#FAFAFA]">
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${t.title.includes('[URGENT]') ? 'text-[#EF4444]' : 'text-[#111827]'}`}>
                    {t.title.includes('[URGENT]') && (
                      <span className="badge badge-danger mr-2 text-[10px]">URGENT</span>
                    )}
                    {t.title.replace('[URGENT] ', '')}
                  </div>
                  <div className="text-xs text-[#6B7280] mt-1 flex gap-3">
                    <span>Source: <span className="font-medium">{t.source}</span></span>
                    {t.linked_candidate_id && (
                      <span className="badge badge-accent text-[10px]">HR Onboarding</span>
                    )}
                    <span>{new Date(t.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  className="btn btn-success text-xs py-1.5 flex-shrink-0"
                  disabled={loadingId === t.id}
                  onClick={() => markResolved(t)}
                >
                  {loadingId === t.id ? 'Resolving…' : 'Mark Complete'}
                </button>
              </div>
            ))}
            {!pending.length && (
              <div className="px-6 py-10 text-center text-[#9CA3AF] text-sm italic">
                All clear — no pending IT tickets ✓
              </div>
            )}
          </div>
        </div>

        {/* Resolved (recent) */}
        {resolved.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <h2 className="font-semibold text-[#6B7280]">Recently Resolved</h2>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {resolved.slice(0, 5).map(t => (
                <div key={t.id} className="px-6 py-3 flex items-center gap-3">
                  <span className="text-[#10B981] text-lg">✓</span>
                  <span className="text-sm text-[#6B7280] line-through">{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right — System Log Terminal */}
      <div className="w-[320px] flex flex-col">
        <h2 className="font-semibold text-[#111827] mb-3">System Log</h2>
        <div className="log-terminal flex-1">
          <div className="log-line-source text-sm mb-3">_AUDIT TRAIL</div>
          {globalSystemLogs?.slice(0, 30).map(log => (
            <div key={log.id} className="border-b border-white/5 pb-2 mb-2">
              <div>
                <span className="log-line-time">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                {' '}
                <span className="log-line-source">{log.source}</span>
              </div>
              <div className="log-line-text">{log.text}</div>
            </div>
          ))}
          {!globalSystemLogs?.length && (
            <div className="text-[#6B7280] italic text-xs">No logs yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
