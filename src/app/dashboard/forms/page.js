'use client';

import { useContext, useState } from 'react';
import { WorkflowContext, RoleContext } from '../layout';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';

export default function FormsApprovals() {
  const { globalApprovals, refreshFromDB, addWorkflowLog } = useContext(WorkflowContext);
  const { role, isOwner } = useContext(RoleContext);
  const { user } = useUser();
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ title: '', type: 'Infrastructure', sla_days: 5 });

  const myEmail = user?.primaryEmailAddress?.emailAddress || 'unknown@org';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingId('submit');
    setError(null);
    try {
      const id = `APP-${Date.now()}`;
      const { error: insErr } = await supabase.from('approvals').insert([{
        id,
        title: form.title.trim(),
        requester: myEmail,
        type: form.type,
        sla_days: parseInt(form.sla_days),
        age: 0,
        dept: role !== 'Employee' ? role : 'Operations',
        status: 'Pending',
      }]);
      if (insErr) throw insErr;
      await addWorkflowLog(`Approval requested: "${form.title}" (SLA: ${form.sla_days}d)`, role);
      setForm({ title: '', type: 'Infrastructure', sla_days: 5 });
      await refreshFromDB();
    } catch (e) {
      setError(e.message);
    }
    setLoadingId(null);
  };

  const updateStatus = async (id, status) => {
    setLoadingId(id);
    setError(null);
    try {
      const { error: updErr } = await supabase.from('approvals').update({ status }).eq('id', id);
      if (updErr) throw updErr;
      await addWorkflowLog(`Approval ${id} → ${status}`, 'Admin');
      await refreshFromDB();
    } catch (e) {
      setError(e.message);
    }
    setLoadingId(null);
  };

  const slaBreaches = globalApprovals?.filter(
    a => a.age >= a.sla_days && !['Approved', 'Rejected'].includes(a.status)
  ).length || 0;

  const simulateDay = async () => {
    if (!isOwner) return;
    setLoadingId('simulate');
    try {
      const pendingApps = globalApprovals.filter(a => !['Approved', 'Rejected'].includes(a.status));
      for (const a of pendingApps) {
        await supabase.from('approvals').update({ age: a.age + 1 }).eq('id', a.id);
      }
      await refreshFromDB();
    } catch (e) {
      setError(e.message);
    }
    setLoadingId(null);
  };

  return (
    <div className="flex flex-col gap-8 h-full">
      <div>
        <h1 className="page-title">Forms & Approvals</h1>
        <p className="page-sub">Submit SLA-tracked requests · Approvers manage the queue</p>
      </div>

      {error && (
        <div className="card border-l-4 border-l-[#EF4444] py-3 text-sm text-[#991B1B]">{error}</div>
      )}

      {/* Note on SLA age (Fix #20) */}
      <div className="card border-l-4 border-l-[#F59E0B] py-3 flex justify-between items-center">
        <div>
          <p className="text-sm font-semibold text-[#92400E]">
            {slaBreaches > 0 ? `⚠ ${slaBreaches} SLA breach${slaBreaches > 1 ? 'es' : ''} detected` : 'SLA Tracking Active'}
          </p>
          <p className="text-xs text-[#6B7280] mt-1">
            Normally, <code>age</code> increments via pg_cron. For testing, admins can simulate a day passing.
          </p>
        </div>
        {isOwner && (
          <button className="btn btn-warning text-xs" onClick={simulateDay} disabled={loadingId === 'simulate'}>
            {loadingId === 'simulate' ? 'Simulating...' : 'Fast-Forward 1 Day'}
          </button>
        )}
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Submit form */}
        <div className="w-80 flex-shrink-0">
          <h2 className="font-semibold mb-3">New Request</h2>
          <form className="card flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Request Title *</label>
              <input
                required className="input"
                placeholder="Describe what you need…"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Category</label>
              <select
                className="input"
                value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              >
                <option>Infrastructure</option>
                <option>Procurement</option>
                <option>Compliance</option>
                <option>HR Policy</option>
                <option>IT Security</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">SLA Deadline (days)</label>
              <input
                required type="number" min="1" max="30" className="input"
                value={form.sla_days} onChange={e => setForm({ ...form, sla_days: e.target.value })}
              />
            </div>
            <button className="btn btn-accent mt-2" disabled={loadingId === 'submit'}>
              {loadingId === 'submit' ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* Approval queue */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Approval Queue</h2>
            <div className="flex gap-2">
              <span className="badge badge-muted">{globalApprovals?.length || 0} total</span>
              {slaBreaches > 0 && <span className="badge badge-danger">{slaBreaches} breached</span>}
            </div>
          </div>

          <div className="flex flex-col gap-3 overflow-auto pb-4 pr-1 flex-1">
            {globalApprovals?.map(a => {
              const isOverdue = a.age >= a.sla_days && !['Approved', 'Rejected'].includes(a.status);
              const canAct = (role === 'Admin' || isOwner) && a.status === 'Pending';
              return (
                <div key={a.id} className={`card ${isOverdue ? 'border-l-4 border-l-[#EF4444]' : ''}`}>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#111827]">{a.title}</div>
                      <div className="text-xs text-[#6B7280] mt-1 flex flex-wrap gap-3">
                        <span>By: <span className="font-medium">{a.requester}</span></span>
                        <span>Dept: {a.dept}</span>
                        <span>Type: {a.type}</span>
                        <span>Ref: <code className="text-[10px]">{a.id}</code></span>
                      </div>
                    </div>
                    <span className={`badge flex-shrink-0 ${
                      a.status === 'Approved'          ? 'badge-success' :
                      a.status === 'Rejected'          ? 'badge-danger'  :
                      a.status === 'Awaiting Revisions'? 'badge-warning' :
                      'badge-muted'
                    }`}>
                      {a.status}
                    </span>
                  </div>

                  {/* SLA bar */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (a.age / a.sla_days) * 100)}%`,
                          backgroundColor: isOverdue ? '#EF4444' : a.age / a.sla_days > 0.7 ? '#F59E0B' : '#10B981',
                        }}
                      />
                    </div>
                    <span className={`text-xs font-mono ${isOverdue ? 'text-[#EF4444] font-bold' : 'text-[#6B7280]'}`}>
                      Day {a.age}/{a.sla_days}{isOverdue ? ' — BREACHED' : ''}
                    </span>
                  </div>

                  {canAct && (
                    <div className="flex gap-2 border-t border-[#F3F4F6] pt-3">
                      <button
                        className="btn text-xs py-1 flex-1"
                        disabled={loadingId === a.id}
                        onClick={() => updateStatus(a.id, 'Awaiting Revisions')}
                      >Request Revision</button>
                      <button
                        className="btn btn-danger text-xs py-1 flex-1"
                        disabled={loadingId === a.id}
                        onClick={() => updateStatus(a.id, 'Rejected')}
                      >Reject</button>
                      <button
                        className="btn btn-success text-xs py-1 flex-1"
                        disabled={loadingId === a.id}
                        onClick={() => updateStatus(a.id, 'Approved')}
                      >Approve</button>
                      {isOwner && (
                        <button
                          className="btn text-xs py-1 flex-1 bg-violet-100 text-violet-700 border-violet-300 hover:bg-violet-200"
                          disabled={loadingId === a.id}
                          onClick={() => updateStatus(a.id, 'Approved')}
                        >⚡ Override</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!globalApprovals?.length && (
              <div className="text-center text-[#9CA3AF] text-sm italic py-12">No approvals yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
