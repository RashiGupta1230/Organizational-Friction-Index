'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';

export default function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', category: 'General', file: null });

  useEffect(() => {
    const fetchDocs = async () => {
      const { data } = await supabase.from('knowledge_docs').select('*').order('updated_at', { ascending: false });
      if (data) setDocs(data);
    };
    fetchDocs();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.file) return;
    
    setIsUploading(true);
    
    try {
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('knowledge_base')
        .upload(filePath, uploadForm.file);
        
      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('knowledge_base')
        .getPublicUrl(filePath);

      // 3. Save to database
      const { data, error: dbError } = await supabase.from('knowledge_docs').insert([{ 
        title: uploadForm.title, 
        category: uploadForm.category,
        url: publicUrl
      }]).select().single();
      
      if (dbError) throw dbError;
      
      if (data) setDocs(prev => [data, ...prev]);
      setIsModalOpen(false);
      setUploadForm({ title: '', category: 'General', file: null });
    } catch (e) {
      alert("Upload failed: " + e.message);
    }
    
    setIsUploading(false);
  };

  const filteredDocs = docs.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    d.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted">Central repository for company documents and SOPs</p>
        </div>
        <button className="btn btn-accent" onClick={() => setIsModalOpen(true)}>
          + Upload Document
        </button>
      </div>

      <div className="card p-2 flex gap-2 bg-[var(--surface)]">
        <span className="p-2 text-muted">🔍</span>
        <input 
          type="text" 
          placeholder="Search by title or category..." 
          className="flex-1 bg-transparent border-none outline-none text-[var(--text)]"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.map(doc => (
          <div key={doc.id} className="card hover:border-[var(--accent)] cursor-pointer transition-colors flex items-center gap-4">
            <div className="text-4xl text-accent">📄</div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">{doc.title}</h3>
              <div className="flex justify-between items-center text-sm text-muted">
                <span className="bg-[var(--surface2)] px-2 py-0.5 rounded">{doc.category}</span>
                <span>Updated: {new Date(doc.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
            {doc.url && (
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-accent py-1 px-3 text-xs">
                View
              </a>
            )}
          </div>
        ))}
        {filteredDocs.length === 0 && <div className="text-muted col-span-2 text-center p-8">No documents found.</div>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Document">
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Document Title</label>
            <input required type="text" className="input w-full" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Category</label>
            <select className="input w-full" value={uploadForm.category} onChange={e => setUploadForm({...uploadForm, category: e.target.value})}>
              <option>General</option>
              <option>HR</option>
              <option>IT</option>
              <option>Operations</option>
              <option>Finance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">File</label>
            <input required type="file" className="input w-full bg-[var(--surface2)]" onChange={e => setUploadForm({...uploadForm, file: e.target.files[0]})} />
          </div>
          <button className="btn btn-accent w-full mt-2" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
