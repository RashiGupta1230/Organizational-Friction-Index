'use client';

import { useContext, useState } from 'react';
import { WorkflowContext } from '../layout';
import { supabase } from '@/lib/supabase';

export default function Payroll() {
  const { globalTimeClock, globalTasks, refreshFromDB, addWorkflowLog } = useContext(WorkflowContext);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  const financeTasks = globalTasks?.filter(t => t.dept === 'Finance') || [];
  const pendingFinanceTasks = financeTasks.filter(t => t.status === 'Pending');

  const handleDiscrepancy = async (record) => {
    setLoadingId(record.emp_id);
    setError(null);
    try {
      const { error: taskErr } = await supabase.from('workflow_tasks').insert([{
        title: `Payroll Override Required for ${record.name} (actual: ${record.actual_hours}h / expected: ${record.expected_hours}h)`,
        dept: 'Operations',
        source: 'Finance Auto-Trigger',
      }]);
      if (taskErr) throw taskErr;

      await supabase.from('time_clock').update({ status: 'Ops Override Pending' }).eq('emp_id', record.emp_id);
      await addWorkflowLog(`Finance flagged payroll discrepancy for ${record.name}`, 'Finance');
      await refreshFromDB();
    } catch (e) {
      setError(e.message);
    }
    setLoadingId(null);
  };

  // Fix #19: mark the employee's time_clock as Cleared when Finance task is resolved
  const markTaskResolved = async (task) => {
    setLoadingId(task.id);
    setError(null);
    try {
      const { error: taskErr } = await supabase
        .from('workflow_tasks').update({ status: 'Resolved' }).eq('id', task.id);
      if (taskErr) throw taskErr;

      // Close the payroll loop — extract employee name from task title
      if (task.source === 'HR Offboard Trigger') {
        const nameMatch = task.title.match(/for (.+)$/);
        if (nameMatch) {
          const name = nameMatch[1].trim();
          await supabase
            .from('time_clock')
            .delete()
            .eq('name', name);
        }
      } else {
        // Title format: "Payroll Override Required for <name> (…)"
        const nameMatch = task.title.match(/for (.+?) \(/);
        if (nameMatch) {
          const name = nameMatch[1];
          await supabase
            .from('time_clock')
            .update({ status: 'Cleared' })
            .eq('name', name)
            .eq('status', 'Ops Override Pending');
        }
      }

      await addWorkflowLog(`Finance resolved payroll task: ${task.title}`, 'Finance');
      await refreshFromDB();
    } catch (e) {
      setError(e.message);
    }
    setLoadingId(null);
  };

  const discrepancyCount = globalTimeClock?.filter(
    tc => tc.expected_hours !== tc.actual_hours && tc.status !== 'Cleared'
  ).length || 0;

  return (
    <div className="flex flex-col gap-8 h-full">
      <div>
        <h1 className="page-title">Payroll Reconciliation</h1>
        <p className="page-sub">Finance Portal — flag discrepancies and close the payroll loop</p>
      </div>

      {error && (
        <div className="card border-l-4 border-l-[#EF4444] py-3 text-sm text-[#991B1B]">{error}</div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">Discrepancies</div>
          <div className="stat-value text-[#EF4444]">{discrepancyCount}</div>
          <div className="stat-sub">Uncleared hour mismatches</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Finance Tasks</div>
          <div className="stat-value text-[#F59E0B]">{pendingFinanceTasks.length}</div>
          <div className="stat-sub">Awaiting action</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cleared Records</div>
          <div className="stat-value text-[#10B981]">
            {globalTimeClock?.filter(tc => tc.status === 'Cleared').length || 0}
          </div>
          <div className="stat-sub">Payroll loop closed</div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Time Clock Records Table */}
        <div className="flex-1 flex flex-col">
          <h2 className="font-semibold text-[#111827] mb-3">Time Clock Records</h2>
          <div className="card p-0 overflow-hidden flex-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Expected</th>
                  <th>Actual</th>
                  <th>Δ Hours</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {globalTimeClock?.map(tc => {
                  const diff = tc.actual_hours - tc.expected_hours;
                  const hasDiscrepancy = diff !== 0;
                  return (
                    <tr key={tc.emp_id}>
                      <td className="font-semibold">{tc.name}</td>
                      <td className="text-[#6B7280]">{tc.dept}</td>
                      <td>{tc.expected_hours}h</td>
                      <td className={`font-bold ${hasDiscrepancy ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                        {tc.actual_hours}h
                      </td>
                      <td className={`font-mono text-sm ${diff > 0 ? 'text-[#F59E0B]' : diff < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                        {diff > 0 ? `+${diff}` : diff}h
                      </td>
                      <td>
                        <span className={`badge ${
                          tc.status === 'Cleared'              ? 'badge-success' :
                          tc.status === 'Ops Override Pending' ? 'badge-warning' :
                          'badge-muted'
                        }`}>
                          {tc.status}
                        </span>
                      </td>
                      <td className="text-right">
                        {hasDiscrepancy && tc.status === 'Needs Review' && (
                          <button
                            className="btn btn-warning text-xs py-1"
                            disabled={loadingId === tc.emp_id}
                            onClick={() => handleDiscrepancy(tc)}
                          >
                            {loadingId === tc.emp_id ? '…' : 'Flag → Ops'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!globalTimeClock?.length && (
                  <tr><td colSpan={7} className="text-center text-[#9CA3AF] py-8 italic">No records.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Finance Task Queue */}
        <div className="w-[340px] flex flex-col">
          <h2 className="font-semibold text-[#111827] mb-3">
            Finance Inbox
            {pendingFinanceTasks.length > 0 && (
              <span className="ml-2 badge badge-warning">{pendingFinanceTasks.length}</span>
            )}
          </h2>
          <div className="flex flex-col gap-3 overflow-auto flex-1 pb-4 pr-1">
            {pendingFinanceTasks.map(t => (
              <div key={t.id} className="card-sm">
                <div className={`font-semibold text-sm mb-1 ${t.title.includes('[URGENT]') ? 'text-[#EF4444]' : 'text-[#111827]'}`}>
                  {t.title}
                </div>
                <div className="text-xs text-[#6B7280] mb-3">
                  Source: <span className="font-medium">{t.source}</span>
                </div>
                <button
                  className="btn btn-success text-xs w-full py-1.5"
                  disabled={loadingId === t.id}
                  onClick={() => markTaskResolved(t)}
                >
                  {loadingId === t.id ? 'Closing loop…' : 'Mark Resolved + Clear Payroll'}
                </button>
              </div>
            ))}
            {!pendingFinanceTasks.length && (
              <div className="card-sm text-center text-[#9CA3AF] text-sm italic py-8">
                Inbox clear ✓
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
