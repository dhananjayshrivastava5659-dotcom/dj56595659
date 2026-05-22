import { getCustomerByRsvpToken } from '@/lib/store';

export default async function RsvpRespondPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const customer = token ? await getCustomerByRsvpToken(token) : null;

  if (!customer || !token) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center gap-2 bg-white rounded-xl px-5 py-3 shadow-sm border border-[#E2E8F0] mb-8">
            <div className="w-6 h-6 bg-[#DB620A] rounded-full flex items-center justify-center">
              <span className="text-white font-black text-xs">i</span>
            </div>
            <span className="font-black text-[#0F172A] text-sm">ICICI Bank</span>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
            <div className="text-5xl mb-4">❓</div>
            <h1 className="text-xl font-black text-[#0F172A] mb-2">Invalid Link</h1>
            <p className="text-sm text-[#64748B]">
              This RSVP link is invalid or has already expired. Please contact the event organiser.
            </p>
          </div>
          <p className="text-xs text-[#94A3B8] mt-6">Powered by iEvent · ICICI Bank Internal Platform</p>
        </div>
      </div>
    );
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const attendingUrl  = `${base}/api/rsvp?token=${token}&response=ATTENDING`;
  const maybeUrl      = `${base}/api/rsvp?token=${token}&response=MAYBE`;
  const notGoingUrl   = `${base}/api/rsvp?token=${token}&response=NOT_ATTENDING`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white rounded-xl px-5 py-3 shadow-sm border border-[#E2E8F0]">
            <div className="w-6 h-6 bg-[#DB620A] rounded-full flex items-center justify-center">
              <span className="text-white font-black text-xs">i</span>
            </div>
            <span className="font-black text-[#0F172A] text-sm">ICICI Bank</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-7 shadow-sm space-y-6">
          <div className="text-center">
            <p className="text-sm text-[#64748B]">Hi,</p>
            <h1 className="text-2xl font-black text-[#0F172A] mt-0.5">{customer.fullName}</h1>
            <p className="text-sm text-[#64748B] mt-2">Will you be attending the event?</p>
          </div>

          <div className="space-y-3">
            <a
              href={attendingUrl}
              className="flex items-center justify-center gap-3 w-full py-4 px-5 rounded-xl bg-[#DCFCE7] border-2 border-[#86EFAC] text-[#15803D] font-black text-base hover:bg-[#BBF7D0] hover:border-[#4ADE80] active:scale-[0.98] transition-all no-underline"
            >
              <span className="text-2xl">✅</span>
              <span>Yes, I&apos;ll be there!</span>
            </a>

            <a
              href={maybeUrl}
              className="flex items-center justify-center gap-3 w-full py-4 px-5 rounded-xl bg-[#FEF9C3] border-2 border-[#FDE047] text-[#854D0E] font-black text-base hover:bg-[#FEF08A] hover:border-[#FACC15] active:scale-[0.98] transition-all no-underline"
            >
              <span className="text-2xl">🤔</span>
              <span>Maybe — not sure yet</span>
            </a>

            <a
              href={notGoingUrl}
              className="flex items-center justify-center gap-3 w-full py-4 px-5 rounded-xl bg-[#FEF2F2] border-2 border-[#FCA5A5] text-[#DC2626] font-black text-base hover:bg-[#FEE2E2] hover:border-[#F87171] active:scale-[0.98] transition-all no-underline"
            >
              <span className="text-2xl">😔</span>
              <span>Sorry, can&apos;t make it</span>
            </a>
          </div>

          <p className="text-center text-xs text-[#94A3B8]">
            Tap a button above to confirm your attendance. You can only respond once.
          </p>
        </div>

        <p className="text-center text-xs text-[#94A3B8] mt-6">
          Powered by iEvent · ICICI Bank Internal Platform
        </p>
      </div>
    </div>
  );
}
