/* Top bar + left rail */

function Topbar({ onOpenCmdk }) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <div className="logo">R</div>
        <div className="wordmark">
          Résumé<small>STUDIO</small>
        </div>
      </div>

      <nav className="topbar__crumbs">
        <span>workspace</span>
        <span className="sep">/</span>
        <span>@lin</span>
        <span className="sep">/</span>
        <span className="cur">Overview</span>
        <span className="badge">main</span>
      </nav>

      <div className="topbar__actions">
        <button className="topbar__btn" onClick={onOpenCmdk}>
          <Icons.Search size={14} />
          <span>Search & commands</span>
          <kbd>⌘K</kbd>
        </button>
        <a className="topbar__btn" href="#github" title="Open on GitHub">
          <Icons.Github size={14} />
          <span>GitHub</span>
          <span className="star">★ 12.4k</span>
        </a>
        <button className="topbar__btn" title="Settings">
          <Icons.Cog size={14} />
        </button>
      </div>
    </header>
  );
}

function Rail() {
  const [active, setActive] = React.useState('home');
  const items = [
    { id: 'home',    icon: Icons.Home,  label: 'Overview' },
    { id: 'docs',    icon: Icons.Docs,  label: 'Documents', num: 5 },
    { id: 'wand',    icon: Icons.Wand,  label: 'AI Studio' },
    { id: 'tpl',     icon: Icons.Tpl,   label: 'Templates' },
    { id: 'pipe',    icon: Icons.Pipe,  label: 'Pipeline', num: 12 },
    { id: 'clock',   icon: Icons.Clock, label: 'History' },
  ];
  const bottom = [
    { id: 'help', icon: Icons.Help, label: 'Help' },
    { id: 'set',  icon: Icons.Cog,  label: 'Settings' },
  ];

  return (
    <aside className="rail">
      <div className="rail__group">
        {items.map((it) => (
          <button
            key={it.id}
            className={'rail__btn' + (active === it.id ? ' is-active' : '')}
            onClick={() => setActive(it.id)}
            aria-label={it.label}
          >
            <it.icon />
            {it.num && <span className="num">{it.num}</span>}
            <span className="rail__tooltip">{it.label}</span>
          </button>
        ))}
      </div>
      <div className="rail__group rail__group--bottom">
        {bottom.map((it) => (
          <button key={it.id} className="rail__btn" aria-label={it.label}>
            <it.icon />
            <span className="rail__tooltip">{it.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
