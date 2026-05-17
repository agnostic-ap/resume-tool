/* ============================================================
   icons (re-used) — keep this file self-contained for editor
   ============================================================ */

const I = ({ children, size = 16, stroke = 1.5 }) => (
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
  ArrowL:  (p) => <I {...p}><path d="M19 12H5M11 18l-6-6 6-6"/></I>,
  Save:    (p) => <I {...p}><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3"/><path d="M8 14h8v7H8z"/></I>,
};

/* ============================================================
   topbar + rail (editor variant — collapsed crumbs)
   ============================================================ */

function Topbar({ onTweaks }) {
  return (
    <header className="topbar topbar--editor">
      <div className="topbar__brand">
        <a className="logo" href="workspace.html" title="Back to workspace" style={{ textDecoration: 'none' }}>
          R
        </a>
        <div className="wordmark">
          Résumé<small>STUDIO</small>
        </div>
      </div>
      <nav className="topbar__crumbs">
        <a href="workspace.html" style={{ color: 'var(--ink-3)' }}>workspace</a>
        <span className="sep">/</span>
        <em>Senior Frontend Engineer</em>
        <span className="badge" style={{ color: 'var(--vermillion)', borderColor: 'var(--vermillion)' }}>⎇ stripe-tailor</span>
        <span className="badge">v2.4</span>
      </nav>
      <div className="topbar__sync">Saved · 4s</div>
      <div className="topbar__actions">
        <button className="topbar__btn"><Icons.Diff size={14} /><span>Diff</span></button>
        <button className="topbar__btn"><Icons.Export size={14} /><span>Export</span><kbd>⌘E</kbd></button>
        <button className="topbar__btn" onClick={onTweaks}><Icons.Cog size={14} /><span>Tweaks</span></button>
      </div>
    </header>
  );
}

function Rail() {
  const items = [
    { id: 'home',  icon: Icons.Home,  label: 'Overview', href: 'workspace.html' },
    { id: 'docs',  icon: Icons.Docs,  label: 'Documents', active: true },
    { id: 'wand',  icon: Icons.Wand,  label: 'AI Studio' },
    { id: 'tpl',   icon: Icons.Tpl,   label: 'Templates' },
    { id: 'pipe',  icon: Icons.Pipe,  label: 'Pipeline' },
    { id: 'clock', icon: Icons.Clock, label: 'History' },
  ];
  return (
    <aside className="rail">
      <div className="rail__group">
        {items.map((it) => (
          <a
            key={it.id}
            href={it.href || '#'}
            className={'rail__btn' + (it.active ? ' is-active' : '')}
            aria-label={it.label}
          >
            <it.icon />
            <span className="rail__tooltip">{it.label}</span>
          </a>
        ))}
      </div>
      <div className="rail__group rail__group--bottom">
        <button className="rail__btn"><Icons.Help /><span className="rail__tooltip">Help</span></button>
        <button className="rail__btn"><Icons.Cog /><span className="rail__tooltip">Settings</span></button>
      </div>
    </aside>
  );
}
