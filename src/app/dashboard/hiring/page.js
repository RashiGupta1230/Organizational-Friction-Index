'use client';

import { useContext, useState } from 'react';
import { WorkflowContext } from '../layout';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';

const STAGES = ['Applied', 'Interviewing', 'Offer Extended', 'Onboarding', 'Active Employee', 'Terminated', 'Rejected'];

// Fix #11: Removed old inline modal, moved to reusable <Modal> in main component

export default function HiringPipeline() {
  const { globalCandidates, refreshFromDB, addWorkflowLog } = useContext(WorkflowContext);
  const [loadingId, setLoadingId]   = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [error, setError]           = useState(null);
  
  // New Candidate Form State
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ 
    name: '', role: '', department: 'Engineering', manager: '', startDate: '' 
  });

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) return;
    setSaving(true);
    const { error: insertErr } = await supabase.from('candidates').insert([{
      name: form.name.trim(), 
      role: form.role.trim(), 
      department: form.department,
      hiring_manager: form.manager,
      start_date: form.startDate || null,
      stage: 'Applied'
    }]);
    
    if (!insertErr) {
      await refreshFromDB();
      setShowModal(false);
      setForm({ name: '', role: '', department: 'Engineering', manager: '', startDate: '' });
    } else {
      setError(insertErr.message);
    }
    setSaving(false);
  };

  const promoteCandidate = async (candidate, newStage) => {
    setLoadingId(candidate.id);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from('candidates').update({ stage: newStage }).eq('id', candidate.id);
      if (updErr) throw updErr;

      if (newStage === 'Onboarding') {
        // Fix #18: guard against duplicate IT provisioning tasks
        const { data: existing } = await supabase
          .from('workflow_tasks')
          .select('id')
          .eq('linked_candidate_id', candidate.id)
          .eq('dept', 'IT')
          .neq('status', 'Resolved')
          .limit(1);

        if (!existing?.length) {
          await supabase.from('workflow_tasks').insert([{
            title: `Provision Assets & Accounts for ${candidate.name}`,
            dept: 'IT',
            source: 'HR Auto-Trigger',
            linked_candidate_id: candidate.id,
          }]);
          await addWorkflowLog(`Auto-triggered IT provisioning for ${candidate.name}`, 'HR');
        }
      }

      if (newStage === 'Active Employee') {
        // Fix Finance Loop: Auto-enroll the employee in the time_clock table
        await supabase.from('time_clock').insert([{
          emp_id: `TC-${candidate.id.replace('C-', '')}`,
          name: candidate.name,
          dept: candidate.department || 'General',
          expected_hours: 40,
          actual_hours: 0,
          status: 'Cleared'
        }]);

        await supabase.from('workflow_tasks').insert([{
          title: `Verify initial payroll enrollment for ${candidate.name}`,
          dept: 'Finance',
          source: 'HR Auto-Trigger',
          linked_candidate_id: candidate.id,
        }]);
        await addWorkflowLog(`Auto-enrolled ${candidate.name} in Payroll and notified Finance`, 'HR');
      }

      if (newStage === 'Terminated') {
        const timeNow = Date.now();
        await supabase.from('workflow_tasks').insert([
          { id: `WT-IT-${timeNow}-1`, title: `[URGENT] Revoke AWS & GitHub for ${candidate.name}`, dept: 'IT', source: 'HR Offboard Trigger', linked_candidate_id: candidate.id },
          { id: `WT-IT-${timeNow}-2`, title: `[URGENT] Lock Corporate Email for ${candidate.name}`, dept: 'IT', source: 'HR Offboard Trigger', linked_candidate_id: candidate.id },
          { id: `WT-IT-${timeNow}-3`, title: `[URGENT] Remote Wipe & Collect Laptop for ${candidate.name}`, dept: 'IT', source: 'HR Offboard Trigger', linked_candidate_id: candidate.id },
          { id: `WT-FIN-${timeNow}`, title: `[URGENT] Halt payroll, final check for ${candidate.name}`, dept: 'Finance', source: 'HR Offboard Trigger', linked_candidate_id: candidate.id },
        ]);
        await addWorkflowLog(`OFFBOARDING KILLSWITCH: Spawned 4 urgent revocation tasks for ${candidate.name}`, 'HR');
      }

      await refreshFromDB();
    } catch (e) {
      setError(e.message || 'Failed to update candidate.');
    }
    setLoadingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="page-title">HR Pipeline</h1>
          <p className="page-sub">Manage candidate lifecycle · auto-trigger cross-dept workflows</p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowModal(true)}>+ Add Candidate</button>
      </div>

      {error && (
        <div className="card border-l-4 border-l-[#EF4444] py-3 mb-4 text-sm text-[#991B1B]">{error}</div>
      )}

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto flex-1 pb-4">
        {STAGES.map(stage => {
          const cands = globalCandidates?.filter(c => c.stage === stage) || [];
          const isArchived = stage === 'Terminated' || stage === 'Rejected';
          return (
            <div key={stage} className={`kanban-col ${isArchived ? 'opacity-70' : ''}`}>
              <div className="kanban-col-header">
                <span className={stage === 'Terminated' ? 'text-red-600' : stage === 'Rejected' ? 'text-gray-500' : ''}>{stage}</span>
                <span className="kanban-count">{cands.length}</span>
              </div>

              {cands.map(c => (
                <div key={c.id} className="kanban-card">
                  <div className="font-semibold text-sm text-[#111827]">{c.name}</div>
                  <div className="text-xs text-[#6B7280] mt-0.5 mb-1">{c.role} • {c.department}</div>
                  {c.hiring_manager && <div className="text-[10px] text-muted mb-3">Manager: {c.hiring_manager}</div>}

                  {/* IT handshake status */}
                  {stage === 'Onboarding' && (
                    <div className={`text-xs px-2 py-1 rounded mb-3 font-medium ${
                      c.it_provisioned
                        ? 'bg-[#D1FAE5] text-[#065F46]'
                        : 'bg-[#FEF3C7] text-[#92400E]'
                    }`}>
                      {c.it_provisioned ? '✓ IT Handshake Complete' : '⏳ Waiting on IT Provisioning'}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 border-t border-[#F3F4F6] pt-2 mt-1">
                    {!isArchived && (
                      <button
                        className="btn btn-accent text-xs py-1.5 w-full"
                        disabled={loadingId === c.id || (stage === 'Onboarding' && !c.it_provisioned)}
                        onClick={() => promoteCandidate(c, STAGES[STAGES.indexOf(stage) + 1])}
                      >
                        {loadingId === c.id ? 'Saving…' : 'Advance →'}
                      </button>
                    )}
                    
                    {['Applied', 'Interviewing', 'Offer Extended'].includes(stage) && (
                      <button
                        className="btn btn-ghost text-xs py-1.5 w-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                        disabled={loadingId === c.id}
                        onClick={() => promoteCandidate(c, 'Rejected')}
                      >
                        Reject Candidate
                      </button>
                    )}

                    {['Active Employee', 'Onboarding'].includes(stage) && (
                      <button
                        className="btn btn-danger text-xs py-1.5 w-full"
                        disabled={loadingId === c.id}
                        onClick={() => promoteCandidate(c, 'Terminated')}
                      >
                        Killswitch (Offboard)
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {cands.length === 0 && (
                <div className="text-xs text-[#9CA3AF] italic text-center py-4">Empty</div>
              )}
            </div>
          );
        })}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="👋 Add Candidate Profile">
        <form onSubmit={handleAddCandidate} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Full Name *</label>
            <input required className="input" placeholder="e.g. Jane Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Position / Role *</label>
              <input required className="input" placeholder="e.g. UX Designer" value={form.role} onChange={e => setForm({...form, role: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Department</label>
              <select className="input cursor-pointer" value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                <option>Engineering</option>
                <option>Product</option>
                <option>Design</option>
                <option>Marketing</option>
                <option>Sales</option>
                <option>Operations</option>
                <option>HR</option>
                <option>Finance</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Hiring Manager</label>
              <input className="input" placeholder="e.g. John Smith" value={form.manager} onChange={e => setForm({...form, manager: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Target Start Date</label>
              <input type="date" className="input" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3 mt-4 pt-4 border-t border-[var(--border)]">
            <button type="button" className="btn flex-1" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-accent flex-1" disabled={saving}>
              {saving ? 'Saving...' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
