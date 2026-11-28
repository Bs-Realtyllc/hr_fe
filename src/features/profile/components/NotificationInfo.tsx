import { BSRealtyTooltip } from '@bsrealtyllc/design-system';

// Info icon + tooltip explaining what a notification toggle actually does.
export default function NotificationInfo({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <BSRealtyTooltip content={text} position='top'>
      <span
        aria-label={text}
        className='inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-(--soft-white-darker-hover) text-[11px] font-semibold text-(--soft-white-dark-active)'
      >
        i
      </span>
    </BSRealtyTooltip>
  );
}
