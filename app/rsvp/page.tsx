'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

const CONFIG = {
  ATTENDING: {
    emoji: '🎉',
    title: 'See you there!',
    message: "Thank you! Your attendance has been confirmed. We look forward to seeing you at the event.",
    color: '#059669',
    bg: '#ECFDF5',
    border: '#6EE7B7',
  },
  MAYBE: {
    emoji: '🤔',
    title: 'Response Recorded',
    message: "Thank you for letting us know. We've noted your tentative response.",
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FCD34D',
  },
  NOT_ATTENDING: {
    emoji: '😔',
    title: 'Response Recorded',
    message: "Thank you for letting us know. We're sorry you won't be able to join us this time.",
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FCA5A5',
  },
  invalid: {
    emoji: '❓',
    title: 'Invalid Link',
    message: "This RSVP link is invalid or has already expired. Please contact the event organiser.",
    color: '#6B7280',
    bg: '#F9FAFB',
    border: '#E5E7EB',
  },
};

function RsvpContent() {
  const params = useSearchParams();
  const status = params.get('status') as keyof typeof CONFIG | null;
  const name   = params.get('name') ?? '';

  const cfg = (status && CONFIG[status]) ? CONFIG[status] : CONFIG.invalid;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ICICI Bank header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white rounded-xl px-5 py-3 shadow-sm border border-[#E2E8F0]">
            <div className="w-6 h-6 bg-[#DB620A] rounded-full flex items-center justify-center">
              <span className="text-white font-black text-xs">i</span>
            </div>
            <span className="font-black text-[#0F172A] text-sm">ICICI Bank</span>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border-2 p-8 text-center shadow-sm"
          style={{ background: cfg.bg, borderColor: cfg.border }}
        >
          <div className="text-6xl mb-4">{cfg.emoji}</div>
          <h1 className="text-2xl font-black mb-2" style={{ color: cfg.color }}>{cfg.title}</h1>
          {name && (
            <p className="text-sm font-semibold text-[#475569] mb-3">
              Hi <span className="text-[#0F172A]">{name}</span>,
            </p>
          )}
          <p className="text-[#475569] text-sm leading-relaxed">{cfg.message}</p>
        </div>

        <p className="text-center text-xs text-[#94A3B8] mt-6">
          Powered by iEvent · ICICI Bank Internal Platform
        </p>
      </div>
    </div>
  );
}

export default function RsvpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><p className="text-[#94A3B8]">Loading...</p></div>}>
      <RsvpContent />
    </Suspense>
  );
}
