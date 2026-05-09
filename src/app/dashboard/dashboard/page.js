'use client';

import { useContext, useMemo } from 'react';
import { WorkflowContext } from '../layout';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis, Cell,
} from 'recharts';

// Fix #8: uncapped raw scores used for Global OFI, each dept has a weight
const WEIGHTS = { Operations: 0.25, IT: 0.25, Finance: 0.20, HR: 0.20, Approvals: 0.10 };

function calcOFI(globalTasks, globalApprovals, globalTimeClock, globalCandidates) {
  let opsRaw = 0, itRaw = 0, financeRaw = 0, hrRaw = 0, approvalRaw = 0;

  globalTasks?.forEach(t => {
    if (t.dept === 'Operations') {
      if (t.status === 'Failed')    opsRaw += 15;
      if (t.status === 'Pending')   opsRaw += 4;
      if (t.status === 'In Progress') opsRaw += 1;
    }
    if (t.dept === 'IT') {
      if (t.status === 'Pending')   itRaw += 5;
      if (t.source === 'HR Offboard Trigger' && t.status === 'Pending') itRaw += 15;
    }
    if (t.dept === 'Finance') {
      if (t.status === 'Pending')   financeRaw += 6;
    }
  });

  globalApprovals?.forEach(a => {
    if (a.age > a.sla_days && !['Approved', 'Rejected'].includes(a.status)) {
      approvalRaw += 10;
    }
  });

  globalTimeClock?.forEach(tc => {
    if (tc.expected_hours !== tc.actual_hours && tc.status !== 'Cleared') {
      financeRaw += 8;
    }
  });

  // HR: blocked onboarding = IT pending task with a candidate link
  globalTasks?.filter(t => t.dept === 'IT' && t.linked_candidate_id && t.status === 'Pending').forEach(() => {
    hrRaw += 6;
  });

  // Weighted global (uncapped inputs, then cap final)
  const cap = v => Math.min(100, Math.max(0, v));
  const global = cap(
    (opsRaw * WEIGHTS.Operations) +
    (itRaw  * WEIGHTS.IT) +
    (financeRaw * WEIGHTS.Finance) +
    (hrRaw  * WEIGHTS.HR) +
    (approvalRaw * WEIGHTS.Approvals)
  );

  return {
    Operations: cap(opsRaw),
    IT:         cap(itRaw),
    Finance:    cap(financeRaw),
    HR:         cap(hrRaw),
    Approvals:  cap(approvalRaw),
    Global:     global,
  };
}

function OFIGauge({ value }) {
  const color = value < 30 ? '#10B981' : value < 60 ? '#F59E0B' : '#EF4444';
  const label = value < 30 ? 'HEALTHY' : value < 60 ? 'MODERATE' : 'CRITICAL';
  const data = [{ name: 'OFI', value, fill: color }];

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: 200, height: 200 }}>
      <RadialBarChart
        width={200} height={200}
        cx={100} cy={100}
        innerRadius={65} outerRadius={95}
        startAngle={210} endAngle={-30}
        data={[{ value: 100, fill: '#F3F4F6' }, ...data]}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar dataKey="value" cornerRadius={8} />
      </RadialBarChart>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold tabular-nums" style={{ color }}>{value.toFixed(1)}</span>
        <span className="text-xs font-bold mt-0.5" style={{ color }}>{label}</span>
        <span className="text-[10px] text-[#6B7280] mt-0.5">OFI Score</span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-md text-xs">
      <p className="font-bold text-[#111827] mb-1">{label}</p>
      <p className="text-[#0D9488]">Friction Score: <strong>{payload[0].value.toFixed(1)}</strong></p>
    </div>
  );
};

export default function ExecutiveDashboard() {
  const { globalTasks, globalApprovals, globalTimeClock, globalCandidates, supabaseError } = useContext(WorkflowContext);

  const ofi = useMemo(
    () => calcOFI(globalTasks, globalApprovals, globalTimeClock, globalCandidates),
    [globalTasks, globalApprovals, globalTimeClock, globalCandidates]
  );

  const chartData = [
    { name: 'Operations', score: ofi.Operations, color: '#6366F1' },
    { name: 'IT',         score: ofi.IT,         color: '#0D9488' },
    { name: 'Finance',    score: ofi.Finance,     color: '#F59E0B' },
    { name: 'HR',         score: ofi.HR,          color: '#EC4899' },
    { name: 'SLA',        score: ofi.Approvals,   color: '#EF4444' },
  ];

  // Summary stats
  const pendingTasks    = globalTasks?.filter(t => t.status === 'Pending').length || 0;
  const failedTasks     = globalTasks?.filter(t => t.status === 'Failed').length || 0;
  const slaBreaches     = globalApprovals?.filter(a => a.age > a.sla_days && !['Approved','Rejected'].includes(a.status)).length || 0;
  const payrollIssues   = globalTimeClock?.filter(tc => tc.expected_hours !== tc.actual_hours && tc.status !== 'Cleared').length || 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="page-title">Executive Dashboard</h1>
        <p className="page-sub">Live Organizational Friction Index — weighted, real-time</p>
      </div>

      {supabaseError && (
        <div className="card border-l-4 border-l-[#EF4444]">
          <p className="text-sm font-semibold text-[#991B1B]">Supabase Connection Error</p>
          <p className="text-xs text-[#6B7280] mt-1">{supabaseError} — Check your NEXT_PUBLIC_SUPABASE_URL and ANON_KEY in .env.local</p>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">Pending Tasks</div>
          <div className="stat-value text-[#F59E0B]">{pendingTasks}</div>
          <div className="stat-sub">Across all departments</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed Tasks</div>
          <div className="stat-value text-[#EF4444]">{failedTasks}</div>
          <div className="stat-sub">OFI +15 pts each</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">SLA Breaches</div>
          <div className="stat-value text-[#EF4444]">{slaBreaches}</div>
          <div className="stat-sub">Approval delays</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Payroll Issues</div>
          <div className="stat-value text-[#F59E0B]">{payrollIssues}</div>
          <div className="stat-sub">Hour discrepancies</div>
        </div>
      </div>

      {/* OFI Score + Bar Chart */}
      <div className="flex gap-6">
        <div className="card flex flex-col items-center justify-center gap-3 w-64">
          <OFIGauge value={ofi.Global} />
          <div className="text-xs text-center text-[#6B7280] max-w-[180px]">
            Weighted across Ops·IT·Finance·HR·SLA. 0 = no friction, 100 = total gridlock.
          </div>
        </div>

        <div className="card flex-1">
          <h2 className="font-semibold text-[#111827] mb-4">Friction by Department</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dept weight legend */}
      <div className="card py-4">
        <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">OFI Weight Configuration</h3>
        <div className="flex gap-8">
          {Object.entries(WEIGHTS).map(([dept, w]) => (
            <div key={dept} className="flex flex-col gap-1">
              <div className="text-xs text-[#6B7280]">{dept}</div>
              <div className="font-bold text-sm text-[#0D9488]">{(w * 100).toFixed(0)}%</div>
              <div className="h-1.5 w-24 bg-[#F3F4F6] rounded-full overflow-hidden">
                <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${w * 100 * 4}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
