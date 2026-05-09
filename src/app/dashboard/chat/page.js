'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';

const CHANNELS = ['general', 'operations', 'hr', 'it', 'managers'];

export default function WorkChat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState('general');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { user } = useUser();
  const myName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Anonymous';

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel', activeChannel)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    const channel = supabase.channel(`chat_${activeChannel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel=eq.${activeChannel}` }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setIsSending(true);
    await supabase.from('chat_messages').insert([{
      channel: activeChannel,
      sender: myName,
      text: newMessage
    }]);
    setNewMessage('');
    setIsSending(false);
  };

  return (
    <div className="flex h-full gap-6">
      <div className="w-64 flex flex-col gap-2">
        <h2 className="font-bold mb-2">Channels</h2>
        {CHANNELS.map(c => (
          <button 
            key={c}
            onClick={() => setActiveChannel(c)}
            className={`p-2 rounded text-left ${activeChannel === c ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--surface2)]'}`}
          >
            # {c}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col card p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface2)]">
          <h2 className="font-bold"># {activeChannel}</h2>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
          {messages.map(m => (
            <div key={m.id} className={`flex flex-col ${m.sender === myName ? 'items-end' : 'items-start'}`}>
              <div className="text-xs text-muted mb-1 flex gap-2 items-center">
                <span className="font-bold">{m.sender}</span>
                <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={`p-3 rounded-lg max-w-[70%] ${m.sender === myName ? 'bg-[var(--accent)] text-white rounded-br-none' : 'bg-[var(--surface2)] rounded-bl-none'}`}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="p-4 border-t border-[var(--border)] flex gap-2" onSubmit={handleSend}>
          <input 
            type="text"
            className="flex-1 bg-[var(--surface2)] border border-[var(--border)] rounded p-2 text-[var(--text)]"
            placeholder={`Message #${activeChannel}`}
            value={newMessage} onChange={e => setNewMessage(e.target.value)}
          />
          <button className="btn btn-accent" disabled={isSending}>Send</button>
        </form>
      </div>
    </div>
  );
}
