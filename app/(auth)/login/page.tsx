'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, LogIn, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DEMO_ACCOUNTS = [
  { name: 'Admin', employeeId: '90046400', role: 'Admin', color: '#053C6D', description: 'Full access · Manage all events' },
  { name: 'User',  employeeId: '108168',   role: 'User',  color: '#DB620A', description: 'Create events · Add customers' },
];

export default function LoginPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employeeId.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid credentials'); return; }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(id: string) {
    setEmployeeId(id);
    setPassword('password');
    setShowDemo(false);
    setError('');
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0A1628 0%, #053C6D 50%, #0A1628 100%)' }}>

        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="absolute top-1/4 right-[-80px] w-[360px] h-[360px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #DB620A 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 left-[-40px] w-[240px] h-[240px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #DB620A 0%, transparent 70%)' }} />

        <div className="relative z-10">
          <Image
            src="/logos/30.11.2024_ICICI Bank_Logo_Rectangular logo_Digital-01.png"
            alt="ICICI Bank"
            width={140} height={40}
            className="object-contain brightness-0 invert opacity-90"
            unoptimized
          />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#DB620A]/20 border border-[#DB620A]/30 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-[#DB620A] animate-pulse" />
              <span className="text-[#DB620A] text-xs font-semibold tracking-wide uppercase">Internal Platform</span>
            </div>
            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
              Manage<br />
              <span className="text-[#DB620A]">Premium</span><br />
              Banking Events
            </h1>
            <p className="text-white/60 text-lg mt-4 leading-relaxed max-w-md">
              Create events, share event codes with your team, and track customers — all in one place.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <Shield size={14} className="text-white/30" />
          <span className="text-white/30 text-xs">Secured · Internal Use Only · ICICI Bank Ltd.</span>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#DB620A] flex items-center justify-center">
              <span className="text-white font-black text-sm">iE</span>
            </div>
            <div>
              <p className="font-extrabold text-[#0F172A]">iEvent</p>
              <p className="text-xs text-[#94A3B8]">ICICI Bank</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black text-[#0F172A]">Welcome back</h2>
            <p className="text-[#475569] text-sm mt-2">Sign in with your Employee ID to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#0F172A]">Employee ID</label>
              <Input
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="e.g. 108168"
                autoComplete="username"
                required
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#0F172A]">NT ID Password</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your NT ID password"
                autoComplete="current-password"
                required
                className="h-11 text-base"
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-[#475569]">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626] flex-shrink-0" />
                <p className="text-sm text-[#DC2626]">{error}</p>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full h-11 text-base">
              <LogIn size={18} />
              Sign In
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#FEF0E7] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#DB620A]" />
                </div>
                Demo Accounts
              </span>
              {showDemo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showDemo && (
              <div className="border-t border-[#F1F5F9] divide-y divide-[#F1F5F9]">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.employeeId}
                    onClick={() => fillDemo(acc.employeeId)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FEF0E7] transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: acc.color }}>
                      {acc.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] leading-none">{acc.name} <span className="text-[#94A3B8] font-normal">· {acc.role}</span></p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{acc.description}</p>
                    </div>
                    <div className="text-xs font-mono font-bold text-[#475569] bg-[#F1F5F9] group-hover:bg-[#DB620A] group-hover:text-white px-2 py-1 rounded-md transition-colors">
                      {acc.employeeId}
                    </div>
                  </button>
                ))}
                <div className="px-4 py-2.5 bg-[#F8FAFC]">
                  <p className="text-xs text-[#94A3B8]">Click any account to auto-fill. NT ID Password: <code className="font-mono">password</code></p>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-[#94A3B8]">
            Internal platform · Authorized personnel only<br />
            © 2026 ICICI Bank Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
