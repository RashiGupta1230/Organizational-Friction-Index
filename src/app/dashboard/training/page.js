'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';

const MODULES = [
  { id: 1, title: 'Security Awareness 101', icon: '🔒' },
  { id: 2, title: 'Code of Conduct', icon: '📜' },
  { id: 3, title: 'Workplace Safety', icon: '👷' },
  { id: 4, title: 'Data Privacy & GDPR', icon: '🛡️' },
  { id: 5, title: 'Diversity & Inclusion', icon: '🤝' },
  { id: 6, title: 'Emergency Protocols', icon: '🚨' }
];

export default function Training() {
  const [completions, setCompletions] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const { user } = useUser();
  const myEmail = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    if (!myEmail) return;
    const fetchCompletions = async () => {
      const { data } = await supabase.from('training_completions').select('module_id').eq('user_email', myEmail);
      if (data) setCompletions(data.map(d => d.module_id));
    };
    fetchCompletions();
  }, [myEmail]);

  const markComplete = async (moduleId) => {
    if (!myEmail) return;
    setLoadingId(moduleId);
    try {
      await supabase.from('training_completions').insert([{ user_email: myEmail, module_id: moduleId }]);
      setCompletions(prev => [...prev, moduleId]);
    } catch (e) {
      console.error(e);
    }
    setLoadingId(null);
  };

  const progress = Math.round((completions.length / MODULES.length) * 100);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Employee Training</h1>
        <p className="text-muted">Complete required modules to maintain compliance</p>
      </div>

      <div className="card mb-8 p-6 bg-[var(--surface2)]">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Overall Progress</span>
          <span className="font-mono text-accent">{progress}%</span>
        </div>
        <div className="w-full bg-[var(--surface)] h-4 rounded-full overflow-hidden">
          <div className="bg-[var(--accent)] h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MODULES.map(mod => {
          const isComplete = completions.includes(mod.id);
          return (
            <div key={mod.id} className="card flex flex-col items-center text-center p-6 gap-4">
              <div className="text-5xl">{mod.icon}</div>
              <h3 className="font-bold">{mod.title}</h3>
              <div className="mt-auto pt-4 w-full">
                {isComplete ? (
                  <div className="bg-success/20 text-success font-bold py-2 rounded text-sm w-full">
                    ✓ Completed
                  </div>
                ) : (
                  <button 
                    className="btn btn-accent w-full"
                    disabled={loadingId === mod.id}
                    onClick={() => markComplete(mod.id)}
                  >
                    {loadingId === mod.id ? 'Saving...' : 'Mark Complete'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
