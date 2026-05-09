'use client';

import { useContext, useEffect, useState } from 'react';
import { RoleContext, WorkflowContext } from '../layout';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';

export default function TimeClock() {
  const { role, teamId } = useContext(RoleContext);
  const { user } = useUser();
  const [punches, setPunches]       = useState([]);
  const [isPunching, setIsPunching] = useState(false);
  const [error, setError]           = useState(null);
  // Fix #5: live clock state
  const [now, setNow] = useState(new Date());

  const email = user?.primaryEmailAddress?.emailAddress;

  // Tick clock every second
  useEffect(() => {
    const ticker = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(ticker);
  }, []);

  const { globalTimeClock, refreshFromDB } = useContext(WorkflowContext);

  const loadPunches = async () => {
    if (!email) return;
    try {
      let query = supabase.from('punches').select('*').order('timestamp', { ascending: false });
      if (role !== 'Admin') {
        query = query.eq('user_email', email).limit(50);
      } else {
        query = query.limit(100);
      }
      const { data, error: err } = await query;
      if (err) throw err;
      setPunches(data ?? []);
      setError(null);
    } catch (e) {
      setError('Failed to load punch data.');
    }
  };

  // Fix #15: use a ref flag to avoid stale race condition
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (!cancelled) await loadPunches();
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role, email, teamId]);

  const handlePunch = async (action) => {
    if (!email) return;
    setIsPunching(true);
    try {
      await supabase.from('punches').insert([{ user_email: email, action }]);
      
      // Update actual_hours in Payroll when punching out (simulate 8 hours)
      if (action === 'OUT') {
        const myRecord = globalTimeClock?.find(tc => tc.name === user?.fullName);
        if (myRecord) {
          await supabase.from('time_clock').update({ 
            actual_hours: myRecord.actual_hours + 8 
          }).eq('emp_id', myRecord.emp_id);
          await refreshFromDB();
        }
      }

      await loadPunches();
    } catch (e) {
      setError('Punch action failed.');
    }
    setIsPunching(false);
  };

  const lastPunch   = punches[0]?.action || 'OUT';
  const isPunchedIn = lastPunch === 'IN';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="page-title">Time Clock</h1>
        <p className="page-sub">
          Punch in/out — {role === 'Admin' ? 'Viewing all team punches' : 'Viewing personal logs'}
        </p>
      </div>

      {error && (
        <div className="card border-l-4 border-l-[#EF4444] py-3 text-sm text-[#991B1B]">{error}</div>
      )}

      <div className="flex gap-8 items-start">
        {/* Clock widget */}
        <div className="card w-80 flex flex-col items-center gap-6 py-10">
          <div className="text-5xl font-mono font-bold text-[#0D9488] tracking-tight tabular-nums">
            {now.toLocaleTimeString()}
          </div>
          <div className="text-sm text-[#6B7280]">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>

          <div className={`badge text-sm px-4 py-1 font-semibold ${isPunchedIn ? 'badge-success' : 'badge-danger'}`}>
            {isPunchedIn ? '● PUNCHED IN' : '○ PUNCHED OUT'}
          </div>

          <button
            className={`btn w-full py-3 text-base font-bold ${isPunchedIn ? 'btn-danger' : 'btn-success'}`}
            disabled={isPunching || !email}
            onClick={() => handlePunch(isPunchedIn ? 'OUT' : 'IN')}
          >
            {isPunching ? 'Processing…' : isPunchedIn ? 'PUNCH OUT' : 'PUNCH IN'}
          </button>

          {!email && (
            <p className="text-xs text-[#EF4444]">Sign in to use time clock</p>
          )}
        </div>

        {/* Punch log table */}
        <div className="card flex-1 p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB] flex justify-between items-center">
            <h2 className="font-semibold text-[#111827]">
              {role === 'Admin' ? 'Live Team Punches' : 'My Punch History'}
            </h2>
            <span className="badge badge-muted">{punches.length} records</span>
          </div>
          <div className="overflow-auto max-h-[400px]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {punches.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.user_email}</td>
                    <td>
                      <span className={`badge ${p.action === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                        {p.action}
                      </span>
                    </td>
                    <td className="text-[#6B7280]">{new Date(p.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {punches.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-[#9CA3AF] py-8 italic">
                      No punches recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
