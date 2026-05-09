'use client';

import { useState } from 'react';
import { analyzeSentimentAction } from '@/app/actions';

export default function FrictionFeedback() {
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState('IT Systems');
  const [submissions, setSubmissions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Analyze sentiment via server action
      const sentimentScore = await analyzeSentimentAction(feedback);
      
      const newEntry = {
        id: Date.now(),
        text: feedback,
        category,
        sentiment: sentimentScore,
        date: new Date().toLocaleString()
      };
      
      setSubmissions([newEntry, ...submissions]);
      setFeedback('');
    } catch (error) {
      console.error(error);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full gap-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Friction Feedback</h1>
        <p className="text-muted">Report organizational friction anonymously. Processed via NLP sentiment analysis.</p>
      </div>

      <div className="flex gap-8">
        <div className="w-1/3 flex flex-col gap-4">
          <div className="card">
            <h2 className="font-bold mb-4 text-warning">Submit Feedback</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-muted mb-1">Category</label>
                <select 
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded p-2 text-[var(--text)]"
                  value={category} onChange={e => setCategory(e.target.value)}
                >
                  <option>IT Systems</option>
                  <option>HR Processes</option>
                  <option>Management</option>
                  <option>Work Environment</option>
                  <option>Cross-Department Comms</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Describe the Friction</label>
                <textarea 
                  required
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded p-2 text-[var(--text)] min-h-[120px]"
                  placeholder="e.g. It takes way too long to get approval for new software..."
                  value={feedback} onChange={e => setFeedback(e.target.value)}
                />
              </div>
              <button className="btn btn-warning w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Analyzing...' : 'Submit Anonymously'}
              </button>
            </form>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <h2 className="font-bold mb-4">Recent Submissions (NLP Analyzed)</h2>
          <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
            {submissions.map(sub => (
              <div key={sub.id} className="card border-l-4" style={{ borderLeftColor: sub.sentiment < 0 ? 'var(--danger)' : 'var(--success)' }}>
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-[var(--surface2)] px-2 py-1 rounded text-xs text-muted font-bold">{sub.category}</span>
                  <span className="text-xs text-muted">{sub.date}</span>
                </div>
                <div className="mb-4 text-[var(--text)]">"{sub.text}"</div>
                <div className="flex justify-between items-center text-sm border-t border-[var(--border)] pt-2 mt-auto">
                  <span className="text-muted">AFINN Sentiment Score:</span>
                  <span className={`font-mono font-bold ${sub.sentiment < 0 ? 'text-danger' : 'text-success'}`}>
                    {sub.sentiment > 0 ? '+' : ''}{sub.sentiment.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {submissions.length === 0 && (
              <div className="text-center text-muted p-8 border border-dashed border-[var(--border)] rounded-lg">
                No feedback submitted yet in this session.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
