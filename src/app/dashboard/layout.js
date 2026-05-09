'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const RoleContext = createContext({});
export const WorkflowContext = createContext({});

// Module icon initials map — extend as needed
const MODULE_ICONS = {
  'dashboard': '◈',
  'hiring': '👤',
  'it-support': '⚙',
  'payroll': '💰',
  'tasks': '📋',
  'time-clock': '🕐',
  'scheduler': '📅',
  'forms': '📝',
  'feed': '📡',
  'chat': '💬',
  'org-setup': '🏢',
  'knowledge': '📚',
  'feedback': '📊',
  'policy': '🔍',
  'workflow': '🔗',
  'training': '🎓',
};

const MODULE_LABELS = {
  'dashboard': 'Dashboard',
  'hiring': 'HR Pipeline',
  'it-support': 'IT Desk',
  'payroll': 'Payroll',
  'tasks': 'Tasks',
  'time-clock': 'Time Clock',
  'scheduler': 'Scheduler',
  'forms': 'Forms',
  'feed': 'Feed',
  'chat': 'Chat',
  'org-setup': 'Org Setup',
  'knowledge': 'Knowledge',
  'feedback': 'Feedback',
  'policy': 'Policy',
  'workflow': 'Workflow',
  'training': 'Training',
};

// Fix #16: Admin now has access to ALL modules
const ALL_MODULES = [
  'dashboard', 'hiring', 'it-support', 'payroll', 'tasks',
  'time-clock', 'scheduler', 'forms', 'feed', 'chat',
  'org-setup', 'knowledge', 'feedback', 'policy', 'workflow', 'training'
];

// Emails that always receive full Admin + Owner access regardless of Clerk metadata
const ADMIN_EMAILS = [
  'cuterashigupta30@gmail.com',
];

const ROLE_PERMISSIONS = {
  Admin:      ALL_MODULES,
  HR:         ['dashboard', 'time-clock', 'hiring', 'policy', 'forms', 'knowledge', 'chat', 'feed', 'training'],
  Operations: ['dashboard', 'scheduler', 'tasks', 'forms', 'knowledge', 'chat', 'feed'],
  IT:         ['dashboard', 'it-support', 'forms', 'knowledge', 'chat', 'feed', 'training'],
  Finance:    ['dashboard', 'payroll', 'forms', 'knowledge', 'chat', 'feed'],
  Employee:   ['time-clock', 'forms', 'knowledge', 'chat', 'feed', 'training'],
};

export default function DashboardLayout({ children }) {
  const { user, isLoaded } = useUser();
  const [roleData, setRoleData] = useState({ role: 'Employee', teamId: null, isOwner: false });
  const [isInitializing, setIsInitializing] = useState(true);
  const [supabaseError, setSupabaseError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const pathname = usePathname();

  // Global Workflow State
  const [globalTasks, setGlobalTasks]           = useState([]);
  const [globalCandidates, setGlobalCandidates] = useState([]);
  const [globalSystemLogs, setGlobalSystemLogs] = useState([]);
  const [globalApprovals, setGlobalApprovals]   = useState([]);
  const [globalTimeClock, setGlobalTimeClock]   = useState([]);

  const refreshFromDB = async () => {
    try {
      setSupabaseError(null);
      const [tasksRes, candsRes, logsRes, appsRes, timeRes] = await Promise.all([
        supabase.from('workflow_tasks').select('*'),
        supabase.from('candidates').select('*'),
        supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('approvals').select('*'),
        supabase.from('time_clock').select('*'),
      ]);

      // Surface errors instead of silently ignoring them (Fix #7)
      const firstError = [tasksRes, candsRes, logsRes, appsRes, timeRes].find(r => r.error);
      if (firstError?.error) {
        setSupabaseError(firstError.error.message);
        return;
      }

      if (tasksRes.data)  setGlobalTasks(tasksRes.data);
      if (candsRes.data)  setGlobalCandidates(candsRes.data);
      if (logsRes.data)   setGlobalSystemLogs(logsRes.data);
      if (appsRes.data)   setGlobalApprovals(appsRes.data);
      if (timeRes.data)   setGlobalTimeClock(timeRes.data);
    } catch (e) {
      setSupabaseError(e.message);
    }
  };

  const addWorkflowLog = async (text, source = 'System') => {
    const { error } = await supabase.from('system_logs').insert([{ text, source }]);
    if (!error) {
      await refreshFromDB();
      setToastMessage(`${text}`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  // Resolve user role from Clerk + SQLite on load
  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      const email = user.primaryEmailAddress?.emailAddress;

      // Check hardcoded admin emails first, then fall back to Clerk publicMetadata
      const isEmailAdmin = email && ADMIN_EMAILS.includes(email.toLowerCase());
      const isOwner = isEmailAdmin ||
        user.publicMetadata?.role === 'admin' ||
        user.publicMetadata?.isOwner === true;

      if (email) {
        supabase.from('org_users').select('*').eq('email', email).single()
          .then(({ data: dbUser }) => {
            setRoleData({
              role: isOwner ? 'Admin' : (dbUser?.role || 'Employee'),
              teamId: dbUser?.team_id || null,
              isOwner,
            });
          })
          .catch(() => {
            // User not found in Supabase org_users — default to Employee
            setRoleData({ role: isOwner ? 'Admin' : 'Employee', teamId: null, isOwner });
          })
          .finally(() => setIsInitializing(false));
      } else {
        setIsInitializing(false);
      }
    } else {
      setIsInitializing(false);
    }
  }, [user, isLoaded]);

  // Initial data load from Supabase
  useEffect(() => {
    refreshFromDB();
  }, []);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#6B7280]">Loading Org Data...</p>
        </div>
      </div>
    );
  }

  const currentModule = pathname.split('/')[2] || 'dashboard';
  const allowedModules = ROLE_PERMISSIONS[roleData.role] || [];
  const hasAccess = allowedModules.includes(currentModule) || roleData.isOwner;

  return (
    <RoleContext.Provider value={{ ...roleData, setRoleData }}>
      <WorkflowContext.Provider value={{
        globalTasks, globalCandidates, globalSystemLogs, globalApprovals, globalTimeClock,
        refreshFromDB, addWorkflowLog,
        setGlobalTasks, setGlobalCandidates, setGlobalApprovals, setGlobalTimeClock,
        supabaseError,
      }}>
        <div className="flex h-screen w-full bg-[#F9FAFB] text-[#111827] overflow-hidden">

          {/* ── Teal Sidebar ── */}
          <aside className="w-64 flex flex-col py-6 px-4 gap-2 flex-shrink-0 bg-gradient-to-b from-[#0F766E] to-[#115E59] shadow-xl z-10 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8 px-2 w-full">
              <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center font-black text-[#0F766E] text-lg flex-shrink-0">
                X
              </div>
              <span className="text-white font-extrabold text-xl tracking-wider">ORG X-RAY</span>
            </div>

            {/* Nav links */}
            <div className="flex flex-col gap-1 w-full">
              {allowedModules.map(mod => (
                <Link
                  key={mod}
                  href={`/dashboard/${mod}`}
                  title={MODULE_LABELS[mod] || mod}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 text-white/70 hover:bg-white/10 hover:text-white ${currentModule === mod ? 'bg-white/20 text-white font-medium shadow-sm' : ''}`}
                >
                  <span className="text-lg leading-none">{MODULE_ICONS[mod] || '·'}</span>
                  <span className="text-sm whitespace-nowrap">{MODULE_LABELS[mod] || mod}</span>
                </Link>
              ))}
            </div>
          </aside>

          {/* ── Main Area ── */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ── Top Navbar ── */}
            <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-[#F1F5F9] flex-shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-xl tracking-tight text-[#0F766E]">Workspace</span>
                <span className="text-[#CBD5E1]">|</span>
                <span className="text-sm font-bold text-[#64748B]">{MODULE_LABELS[currentModule] || currentModule}</span>
              </div>

              {/* Search bar */}
              <div className="flex-1 max-w-md mx-6">
                <div className="flex items-center bg-[#F9FAFB] rounded-full px-3 py-1.5 border border-[#E5E7EB] gap-2">
                  <span className="text-[#9CA3AF] text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Search"
                    className="bg-transparent border-none outline-none flex-1 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
                  />
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-4">
                {/* Supabase error indicator */}
                {supabaseError && (
                  <div className="badge badge-danger" title={supabaseError}>
                    DB Error
                  </div>
                )}
                {/* Notification bell */}
                <button className="relative text-[#6B7280] hover:text-[#111827] transition-colors">
                  <span className="text-lg">🔔</span>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-white" />
                </button>
                <div className="flex items-center gap-3">
                  <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-9 h-9 shadow-sm" } }} />
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold">{user?.fullName || user?.firstName || 'User'}</span>
                    {roleData.isOwner ? (
                      <select
                        className="text-xs text-[#6B7280] bg-transparent outline-none cursor-pointer p-0 m-0 border-none appearance-none hover:text-[#0D9488] transition-colors"
                        value={roleData.role}
                        onChange={e => setRoleData({ ...roleData, role: e.target.value })}
                        title="Switch Department View"
                      >
                        {Object.keys(ROLE_PERMISSIONS).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-[#6B7280]">{roleData.role}</span>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Toast Notification Popup */}
            {toastMessage && (
              <div className="absolute top-16 right-6 bg-[#0F766E] text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 max-w-sm animate-pulse border border-[#0D9488]">
                <span className="text-xl">🔔</span>
                <span className="text-sm font-medium">{toastMessage}</span>
              </div>
            )}

            {/* ── Page Content ── */}
            <main className="flex-1 overflow-auto p-8 relative">
              {!hasAccess ? (
                <div className="card border-l-4 border-l-[#EF4444] max-w-lg">
                  <h2 className="font-bold text-[#EF4444] mb-1">Access Denied</h2>
                  <p className="text-sm text-[#6B7280]">
                    Your role (<strong>{roleData.role}</strong>) does not have permission to access this module.
                  </p>
                </div>
              ) : (
                children
              )}
            </main>
          </div>
        </div>
      </WorkflowContext.Provider>
    </RoleContext.Provider>
  );
}
