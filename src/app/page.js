'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-hidden selection:bg-[#0f766e]/20">
      
      {/* Navbar */}
      <nav className="flex justify-between items-center px-10 py-6 max-w-7xl mx-auto w-full absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0f766e] to-[#115e59] shadow-lg flex items-center justify-center font-black text-white text-lg">
            X
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-[#0f172a]">ORG X-RAY</span>
        </div>
        <div className="flex gap-4 items-center">
          {isSignedIn ? (
            <Link href="/dashboard" className="font-bold text-[#0f766e] hover:text-[#115e59] transition">
              Go to Dashboard &rarr;
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="font-bold text-[#64748b] hover:text-[#0f172a] transition">
                Sign In
              </Link>
              <Link href="/sign-up" className="bg-[#0f172a] text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 relative pt-20">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#ccfbf1] rounded-full blur-[100px] opacity-60 pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#e2e8f0] rounded-full blur-[120px] opacity-60 pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f8fafc] border border-[#e2e8f0] mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-xs font-bold text-[#64748b] tracking-wide uppercase">Enterprise Micro-ERP Platform</span>
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold text-[#0f172a] tracking-tight max-w-4xl leading-[1.1] mb-6">
          Expose organizational <br className="hidden md:block"/>
          <span className="bg-gradient-to-r from-[#0f766e] to-[#3b82f6] bg-clip-text text-transparent">friction in real-time.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-[#64748b] max-w-2xl mb-12 font-medium">
          A unified, cross-departmental operating system that automates IT provisioning, flags payroll discrepancies, and tracks your global SLA health.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
          {isSignedIn ? (
            <Link href="/dashboard" className="bg-[#0f766e] text-white px-8 py-4 rounded-xl font-bold shadow-[0_8px_30px_rgba(15,118,110,0.3)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(15,118,110,0.4)] transition-all duration-300 w-full text-center text-lg">
              Open Workspace
            </Link>
          ) : (
            <>
              <Link href="/sign-up" className="bg-[#0f766e] text-white px-8 py-4 rounded-xl font-bold shadow-[0_8px_30px_rgba(15,118,110,0.3)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(15,118,110,0.4)] transition-all duration-300 w-full text-center text-lg">
                Start Free Trial
              </Link>
              <Link href="/sign-in" className="bg-white text-[#0f172a] border border-[#e2e8f0] px-8 py-4 rounded-xl font-bold shadow-sm hover:bg-[#f8fafc] hover:-translate-y-1 transition-all duration-300 w-full text-center text-lg">
                Sign In
              </Link>
            </>
          )}
        </div>
      </main>

    </div>
  );
}
