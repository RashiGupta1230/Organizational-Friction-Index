'use client';

import { useContext } from 'react';
import { WorkflowContext } from '../layout';
import { supabase } from '@/lib/supabase';

const STAGES = ['Pending', 'In Progress', 'Resolved', 'Failed'];

export default function TasksBoard() {
  const { globalTasks, refreshFromDB } = useContext(WorkflowContext);
  const opsTasks = globalTasks?.filter(t => t.dept === 'Operations') || [];

  const updateStatus = async (id, newStatus) => {
    await supabase.from('workflow_tasks').update({ status: newStatus }).eq('id', id);
    await refreshFromDB();
  };

  const forceEndShift = async () => {
    const openTasks = opsTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress');
    for (const t of openTasks) {
      await supabase.from('workflow_tasks').update({ status: 'Failed' }).eq('id', t.id);
    }
    // Also log this decay
    await supabase.from('system_logs').insert([{ text: 'Force End Shift: All open tasks decayed to Failed', source: 'Operations Flow' }]);
    await refreshFromDB();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Operations Task Board</h1>
          <p className="text-muted">Manage execution flow and SLA compliance</p>
        </div>
        <button className="btn btn-danger" onClick={forceEndShift}>
          Force End Shift (Decay Open Tasks)
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
        {STAGES.map(stage => {
          const tasks = opsTasks.filter(t => t.status === stage);
          return (
            <div key={stage} className="flex-1 min-w-[280px] bg-[var(--surface2)] p-4 rounded-lg flex flex-col">
              <h3 className="font-bold mb-4 flex justify-between">
                {stage} <span className="bg-[var(--primary)] px-2 rounded">{tasks.length}</span>
              </h3>
              
              <div className="flex flex-col gap-3 flex-1">
                {tasks.map(t => (
                  <div key={t.id} className="card p-3 shadow-md" style={{ borderColor: stage === 'Failed' ? 'var(--danger)' : 'var(--border)' }}>
                    <div className="font-bold mb-2">{t.title}</div>
                    <div className="text-xs text-muted mb-3 flex justify-between">
                      <span className="bg-[var(--surface2)] px-2 rounded">Src: {t.source}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      {stage === 'Pending' && (
                        <button className="btn text-xs py-1 px-2 w-full" onClick={() => updateStatus(t.id, 'In Progress')}>Start Task</button>
                      )}
                      {stage === 'In Progress' && (
                        <button className="btn btn-success text-xs py-1 px-2 w-full" onClick={() => updateStatus(t.id, 'Resolved')}>Mark Resolved</button>
                      )}
                      {stage === 'Failed' && (
                        <button className="btn btn-warning text-xs py-1 px-2 w-full" onClick={() => updateStatus(t.id, 'Pending')}>Clone & Roll-Over</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
