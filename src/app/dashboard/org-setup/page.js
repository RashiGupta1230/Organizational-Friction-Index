'use client';

import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { RoleContext } from '../layout';
import Modal from '@/components/Modal';

export default function OrgSetup() {
  const { isOwner } = useContext(RoleContext);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const [teamForm, setTeamForm] = useState({ name: '', hierarchy: '{}', color: '#3b82f6', logo: '' });
  const [userForm, setUserForm] = useState({ email: '', username: '', role: 'Employee', teamId: '' });

  const loadData = async () => {
    const { data: t } = await supabase.from('org_teams').select('*');
    const { data: u } = await supabase.from('org_users').select('*, org_teams(name)');
    if (t) setTeams(t);
    if (u) setUsers(u.map(user => ({ ...user, team_name: user.org_teams?.name })));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    await supabase.from('org_teams').insert([{
      name: teamForm.name,
      branding_color: teamForm.color
    }]);
    setTeamForm({ name: '', hierarchy: '{}', color: '#3b82f6', logo: '' });
    setIsTeamModalOpen(false);
    await loadData();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    await supabase.from('org_users').insert([{
      email: userForm.email,
      username: userForm.username,
      role: userForm.role,
      team_id: userForm.teamId || null
    }]);
    setUserForm({ email: '', username: '', role: 'Employee', teamId: '' });
    setIsUserModalOpen(false);
    await loadData();
  };

  if (!isOwner) return <div className="text-danger">Admin access required.</div>;

  return (
    <div className="flex flex-col h-full gap-8 overflow-y-auto pb-8">
      <div>
        <h1 className="text-2xl font-bold">Organization Setup</h1>
        <p className="text-muted">Manage Teams and RBAC Users</p>
      </div>

      <div className="flex gap-8">
        <div className="flex-1">
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Teams List</h2>
              <button className="btn btn-accent text-xs" onClick={() => setIsTeamModalOpen(true)}>+ Add Team</button>
            </div>
            <div className="flex flex-col gap-2">
              {teams.map(t => (
                <div key={t.id} className="p-3 bg-[var(--surface2)] rounded flex justify-between border-l-4" style={{ borderLeftColor: t.branding_color }}>
                  <span className="font-bold">{t.name}</span>
                </div>
              ))}
              {teams.length === 0 && <div className="text-muted text-sm py-4">No teams created.</div>}
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Users List</h2>
              <button className="btn btn-accent text-xs" onClick={() => setIsUserModalOpen(true)}>+ Add User</button>
            </div>
            <div className="flex flex-col gap-2">
              {users.map(u => (
                <div key={u.id} className="p-3 bg-[var(--surface2)] rounded flex justify-between items-center">
                  <div>
                    <div className="font-bold">{u.username}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs bg-accent/20 text-accent px-2 py-1 rounded font-bold">{u.role}</div>
                    <div className="text-xs text-muted mt-1">{u.team_name || 'No Team'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} title="Create New Team">
        <form onSubmit={handleCreateTeam} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Team Name *</label>
            <input required className="input w-full" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Branding Color</label>
            <input type="color" className="input w-full h-12 p-1 cursor-pointer" value={teamForm.color} onChange={e => setTeamForm({...teamForm, color: e.target.value})} />
          </div>
          <button className="btn btn-accent w-full mt-2">Create Team</button>
        </form>
      </Modal>

      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Create User / Role Binding">
        <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Email Address *</label>
            <input required type="email" className="input w-full" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Full Name *</label>
            <input required className="input w-full" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Role *</label>
            <select className="input w-full" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
              <option>Admin</option>
              <option>HR</option>
              <option>Operations</option>
              <option>IT</option>
              <option>Finance</option>
              <option>Employee</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Assigned Team</label>
            <select className="input w-full" value={userForm.teamId} onChange={e => setUserForm({...userForm, teamId: e.target.value})}>
              <option value="">No Team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button className="btn btn-success w-full mt-2">Create User</button>
        </form>
      </Modal>
    </div>
  );
}
