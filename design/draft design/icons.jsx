/* Inline SVG icons — stroke-based, no emoji */

const I = ({ children, size = 18, stroke = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const Icons = {
  Home:    (p) => <I {...p}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></I>,
  Docs:    (p) => <I {...p}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></I>,
  Wand:    (p) => <I {...p}><path d="M4 20l8-8"/><path d="M14 6l2 2"/><path d="M18 4l2 2"/><path d="M16 10l2 2"/><path d="M12 4l1 1"/></I>,
  Pipe:    (p) => <I {...p}><rect x="3" y="5" width="6" height="14"/><rect x="9" y="9" width="6" height="10"/><rect x="15" y="13" width="6" height="6"/></I>,
  Clock:   (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>,
  Tpl:     (p) => <I {...p}><rect x="3" y="4" width="18" height="6"/><rect x="3" y="12" width="8" height="8"/><rect x="13" y="12" width="8" height="8"/></I>,
  Cog:     (p) => <I {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></I>,
  Help:    (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></I>,
  Search:  (p) => <I {...p}><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></I>,
  Plus:    (p) => <I {...p}><path d="M12 5v14M5 12h14"/></I>,
  Export:  (p) => <I {...p}><path d="M4 14v5h16v-5"/><path d="M12 4v11"/><path d="M8 8l4-4 4 4"/></I>,
  Open:    (p) => <I {...p}><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M14 14v6H4V10h6"/></I>,
  Diff:    (p) => <I {...p}><path d="M12 4v16"/><path d="M5 8h4M5 16h4"/><path d="M15 8h4M15 16h4"/></I>,
  Github:  (p) => <I {...p} stroke={1.4}><path d="M9 19c-4 1-4-2-6-2"/><path d="M15 22v-3.5a3 3 0 0 0-.9-2.3c3-.4 5.9-1.5 5.9-6.5a5 5 0 0 0-1.4-3.5c.1-.3.6-1.8-.1-3.7 0 0-1.1-.4-3.5 1.3a12 12 0 0 0-6 0C6.6 2.1 5.5 2.5 5.5 2.5c-.7 1.9-.2 3.4-.1 3.7A5 5 0 0 0 4 9.7c0 5 2.9 6.1 5.7 6.5a3 3 0 0 0-.9 2.3V22"/></I>,
  Lang:    (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></I>,
  Branch:  (p) => <I {...p}><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 8v8"/><path d="M18 10c0 4-6 4-6 8"/></I>,
  Sparkle: (p) => <I {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2.5 2.5M14.5 14.5L17 17M7 17l2.5-2.5M14.5 9.5L17 7"/></I>,
  Pin:     (p) => <I {...p}><path d="M12 17v5"/><path d="M9 11l-3 3h12l-3-3V4H9z"/></I>,
  Eye:     (p) => <I {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></I>,
  ArrowR:  (p) => <I {...p}><path d="M5 12h14M13 6l6 6-6 6"/></I>,
};
