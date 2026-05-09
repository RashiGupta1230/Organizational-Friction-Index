import React from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface2)]">
          <h2 className="text-lg font-bold text-[var(--text)]">{title}</h2>
          <button 
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--danger)] transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
}
