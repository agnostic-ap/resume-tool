/* Cmd+K command palette */

const CMDK_GROUPS = [
  {
    label: 'Quick actions',
    items: [
      { icon: Icons.Plus,    label: 'New résumé',                  hint: 'N' },
      { icon: Icons.Wand,    label: 'Tailor current résumé to job…', hint: 'T' },
      { icon: Icons.Branch,  label: 'Branch from main',            hint: '⌘B' },
      { icon: Icons.Export,  label: 'Export current as PDF',       hint: '⌘E' },
    ],
  },
  {
    label: 'AI · ask Claude',
    items: [
      { icon: Icons.Sparkle, label: 'Quantify all my bullet points',  hint: '↵' },
      { icon: Icons.Sparkle, label: 'Rewrite headline for SaaS roles', hint: '↵' },
      { icon: Icons.Lang,    label: 'Translate to en-US',             hint: '↵' },
    ],
  },
  {
    label: 'Jump to',
    items: [
      { icon: Icons.Docs, label: 'Senior Frontend Engineer · v2.4', hint: '↵' },
      { icon: Icons.Docs, label: 'Full-Stack · Stripe',             hint: '↵' },
      { icon: Icons.Pipe, label: 'Pipeline · 12 applications',      hint: '↵' },
      { icon: Icons.Clock,label: 'Commit log',                      hint: '↵' },
    ],
  },
];

function Cmdk({ open, onClose }) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(1);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const flat = CMDK_GROUPS.flatMap(g => g.items);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => (s + 1) % flat.length); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setSel((s) => (s - 1 + flat.length) % flat.length); }
      else if (e.key === 'Enter')     { onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  let cursor = 0;
  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk__head">
          <span className="prompt">›</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search résumés, run a command, or ask Claude…"
          />
          <span className="esc">ESC</span>
        </div>

        <div className="cmdk__body">
          {CMDK_GROUPS.map((g, gi) => (
            <div key={gi} className="cmdk__group">
              <div className="label">{g.label}</div>
              {g.items.map((it, i) => {
                const idx = cursor++;
                return (
                  <div key={i} className={'cmdk__item' + (idx === sel ? ' on' : '')} onMouseEnter={() => setSel(idx)} onClick={onClose}>
                    <span className="icon"><it.icon size={14} /></span>
                    <span>{it.label}</span>
                    <span className="hint">{it.hint}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="cmdk__foot">
          <div className="hints">
            <span><kbd>↑↓</kbd>navigate</span>
            <span><kbd>↵</kbd>select</span>
            <span><kbd>⌘↵</kbd>ask Claude</span>
          </div>
          <span>résumé-studio · v0.4.2</span>
        </div>
      </div>
    </div>
  );
}
