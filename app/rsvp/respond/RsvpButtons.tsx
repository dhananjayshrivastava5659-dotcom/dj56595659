'use client';

interface Props {
  attendingUrl: string;
  maybeUrl: string;
  notGoingUrl: string;
}

export function RsvpButtons({ attendingUrl, maybeUrl, notGoingUrl }: Props) {
  function go(url: string) {
    window.location.href = url;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => go(attendingUrl)}
        className="flex items-center justify-center gap-3 w-full py-4 px-5 rounded-xl bg-[#DCFCE7] border-2 border-[#86EFAC] text-[#15803D] font-black text-base hover:bg-[#BBF7D0] active:bg-[#BBF7D0] transition-colors cursor-pointer"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="text-2xl">✅</span>
        <span>Yes, I&apos;ll be there!</span>
      </button>

      <button
        type="button"
        onClick={() => go(maybeUrl)}
        className="flex items-center justify-center gap-3 w-full py-4 px-5 rounded-xl bg-[#FEF9C3] border-2 border-[#FDE047] text-[#854D0E] font-black text-base hover:bg-[#FEF08A] active:bg-[#FEF08A] transition-colors cursor-pointer"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="text-2xl">🤔</span>
        <span>Maybe — not sure yet</span>
      </button>

      <button
        type="button"
        onClick={() => go(notGoingUrl)}
        className="flex items-center justify-center gap-3 w-full py-4 px-5 rounded-xl bg-[#FEF2F2] border-2 border-[#FCA5A5] text-[#DC2626] font-black text-base hover:bg-[#FEE2E2] active:bg-[#FEE2E2] transition-colors cursor-pointer"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="text-2xl">😔</span>
        <span>Sorry, can&apos;t make it</span>
      </button>
    </div>
  );
}
