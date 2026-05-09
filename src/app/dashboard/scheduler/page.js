'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Scheduler() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({ text: '', assigned_user: '', dayIndex: 0 });

  useEffect(() => {
    const loadShifts = async () => {
      const { data } = await supabase.from('shifts').select('*');
      if (data) setShifts(data);
      setLoading(false);
    };
    loadShifts();
  }, []);

  const handleDrop = async (e, targetDayIndex) => {
    e.preventDefault();
    const shiftId = e.dataTransfer.getData('shiftId');
    if (!shiftId) return;

    // Optimistic update
    const previousShifts = [...shifts];
    setShifts(prev => prev.map(s => s.id == shiftId ? { ...s, day_index: targetDayIndex } : s));
    
    const { error } = await supabase.from('shifts').update({ day_index: targetDayIndex }).eq('id', shiftId);
    if (error) {
      alert("Failed to move shift: " + error.message);
      setShifts(previousShifts); // Revert
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const openAddModal = (dayIndex) => {
    setShiftForm({ text: '', assigned_user: '', dayIndex });
    setIsModalOpen(true);
  };

  const handleAddShift = async (e) => {
    e.preventDefault();
    if (!shiftForm.text) return;
    
    const { data } = await supabase.from('shifts').insert([{ 
      day_index: shiftForm.dayIndex, 
      text: shiftForm.text,
      assigned_user: shiftForm.assigned_user || 'Unassigned'
    }]).select().single();
    
    if (data) setShifts(prev => [...prev, data]);
    setIsModalOpen(false);
  };

  if (loading) return <div>Loading schedule...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Weekly Shift Scheduler</h1>
        <p className="text-muted">Drag and drop shifts to organize the operational week</p>
      </div>

      <div className="flex flex-1 gap-2 overflow-x-auto pb-4">
        {DAYS.map((dayName, index) => {
          const dayShifts = shifts.filter(s => s.day_index === index);
          return (
            <div 
              key={dayName}
              className="flex-1 min-w-[200px] flex flex-col bg-[var(--surface2)] rounded-lg p-3"
              onDrop={(e) => handleDrop(e, index)}
              onDragOver={handleDragOver}
            >
              <div className="font-bold mb-3 border-b border-[var(--border)] pb-2 flex justify-between items-center">
                {dayName}
                <button onClick={() => openAddModal(index)} className="text-accent hover:text-[var(--text)] text-xl leading-none">+</button>
              </div>
              
              <div className="flex flex-col gap-2 flex-1 min-h-[100px]">
                {dayShifts.map(shift => (
                  <div 
                    key={shift.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('shiftId', shift.id)}
                    className="card p-2 cursor-grab active:cursor-grabbing text-sm border-l-4 border-l-accent"
                  >
                    <div className="font-bold">{shift.text}</div>
                    <div className="text-xs text-muted mt-1">{shift.assigned_user}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Add Shift for ${DAYS[shiftForm.dayIndex]}`}>
        <form onSubmit={handleAddShift} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Shift Details *</label>
            <input required type="text" className="input w-full" placeholder="e.g. Morning 9-5" value={shiftForm.text} onChange={e => setShiftForm({...shiftForm, text: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Assign User</label>
            <input type="text" className="input w-full" placeholder="Unassigned" value={shiftForm.assigned_user} onChange={e => setShiftForm({...shiftForm, assigned_user: e.target.value})} />
          </div>
          <button className="btn btn-accent w-full mt-2">Create Shift</button>
        </form>
      </Modal>
    </div>
  );
}
