'use client';

import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';
import { RoleContext } from '../layout';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [type, setType] = useState('Announcement');
  const [isPosting, setIsPosting] = useState(false);
  
  const { user } = useUser();
  const { role } = useContext(RoleContext);
  const myName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Anonymous';

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase.from('feed_posts').select('*').order('created_at', { ascending: false });
      if (data) setPosts(data);
    };
    fetchPosts();

    const channel = supabase.channel('feed_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, payload => {
        setPosts(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setIsPosting(true);
    await supabase.from('feed_posts').insert([{ author: myName, content: newPost, type }]);
    setNewPost('');
    setIsPosting(false);
  };

  const canPost = role === 'Admin' || role === 'HR';

  return (
    <div className="flex flex-col h-full gap-8">
      <div>
        <h1 className="text-2xl font-bold">Company Feed</h1>
        <p className="text-muted">Real-time announcements and alerts</p>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        <div className="flex-1 flex flex-col gap-4 overflow-auto pb-4 pr-2">
          {posts.map(post => (
            <div key={post.id} className="card">
              <div className="flex justify-between mb-2">
                <div className="font-bold">{post.author}</div>
                <div className="text-xs text-muted">{new Date(post.created_at).toLocaleString()}</div>
              </div>
              <div className="mb-3">{post.content}</div>
              <span className={`text-xs px-2 py-1 rounded font-bold ${
                post.type === 'Alert' ? 'bg-danger/20 text-danger' :
                post.type === 'Event' ? 'bg-accent/20 text-accent' :
                'bg-surface2 text-muted'
              }`}>
                {post.type}
              </span>
            </div>
          ))}
          {posts.length === 0 && <div className="text-center text-muted">No posts yet.</div>}
        </div>

        {canPost && (
          <div className="w-80">
            <h2 className="font-bold mb-4">New Post</h2>
            <form className="card flex flex-col gap-3" onSubmit={handlePost}>
              <textarea 
                required
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded p-2 text-[var(--text)] min-h-[100px]"
                placeholder="What's happening?"
                value={newPost} onChange={e => setNewPost(e.target.value)}
              />
              <select 
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded p-2 text-[var(--text)]"
                value={type} onChange={e => setType(e.target.value)}
              >
                <option>Announcement</option>
                <option>Alert</option>
                <option>Event</option>
              </select>
              <button className="btn btn-accent w-full" disabled={isPosting}>
                {isPosting ? 'Posting...' : 'Publish'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
