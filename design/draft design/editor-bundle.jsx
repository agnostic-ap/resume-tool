
/* =============== editor-1-chrome.jsx =============== */
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


/* =============== editor-2-edit.jsx =============== */
/* ============================================================
   File tree — sections of the résumé
   ============================================================ */

const TREE_GROUPS = [
  {
    label: 'Frontmatter',
    items: [
      { id: 'meta',    name: 'meta.yaml',     ic: '⌘', meta: 'frontmatter' },
      { id: 'header',  name: 'header.mdx',    ic: '§', meta: '12 lines' },
    ],
  },
  {
    label: 'Body',
    items: [
      { id: 'summary',    name: 'summary.mdx',     ic: '¶', metaKind: 'ai', meta: 'AI' },
      { id: 'experience', name: 'experience.mdx',  ic: '¶', meta: 'editing', mark: true },
      { id: 'projects',   name: 'projects.mdx',    ic: '¶', meta: '· 4' },
      { id: 'skills',     name: 'skills.mdx',      ic: '¶', meta: '· 22' },
      { id: 'education',  name: 'education.mdx',   ic: '¶', meta: '· 2' },
      { id: 'opensource', name: 'open-source.mdx', ic: '¶', metaKind: 'good', meta: '+ 1' },
    ],
  },
  {
    label: 'Layout',
    items: [
      { id: 'theme', name: 'theme.css',     ic: '⊟', meta: 'serif' },
      { id: 'page',  name: 'page.config.ts', ic: '⊟', meta: 'A4 · 1pg' },
    ],
  },
  {
    label: 'Job context',
    items: [
      { id: 'jd',    name: 'stripe.jd.md',  ic: '↪', metaKind: 'warn', meta: 'live' },
    ],
  },
];

function FileTree({ active, onSelect }) {
  return (
    <aside className="tree">
      <div className="tree__head">
        <span>Sections</span>
        <span className="branch">stripe-tailor</span>
      </div>
      <div className="tree__list">
        {TREE_GROUPS.map((g) => (
          <div key={g.label} className="tree__group">
            <div className="glabel">{g.label}</div>
            {g.items.map((it) => (
              <div
                key={it.id}
                className={'tree__item' + (active === it.id ? ' on' : '')}
                onClick={() => onSelect(it.id)}
              >
                <span className="ic">{it.ic}</span>
                <span>{it.name}</span>
                <span className={'meta ' + (it.metaKind || '')}>{it.meta}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="tree__foot">
        <div className="score-row">
          <span>Match · Stripe JD</span>
          <b>91<small>/100</small></b>
        </div>
        <div className="meter"><i style={{ width: '91%' }}></i></div>
        <div className="jd">
          <span>↪</span>
          <span className="co">Stripe</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>· Payments API</span>
          <a href="#jd">open JD</a>
        </div>
      </div>
    </aside>
  );
}

/* ============================================================
   Editor pane — mdx source with line numbers + selection chip
   ============================================================ */

/* lines are mini AST entries: type + content */
const LINES = [
  { n: 1,  cls: 'fm',   html: '---' },
  { n: 2,  cls: '',     html: '<span class="fmk">section:</span> <span class="str">experience</span>' },
  { n: 3,  cls: '',     html: '<span class="fmk">role-match:</span> <span class="str">stripe / payments-api</span>' },
  { n: 4,  cls: '',     html: '<span class="fmk">priority:</span> <span class="str">high</span>' },
  { n: 5,  cls: 'fm',   html: '---' },
  { n: 6,  cls: '',     html: '' },
  { n: 7,  cls: '',     html: '<span class="h1">## Experience</span>' },
  { n: 8,  cls: '',     html: '' },
  { n: 9,  cls: '',     html: '<span class="h2">### Linear</span> · <span class="tag">Staff Engineer</span> · <span class="com">2023 — Now</span>' },
  { n: 10, cls: '',     html: '<span class="com">&lt;!-- focus: sync engine, OT-CRDT, mentorship --&gt;</span>' },
  { n: 11, cls: '',     html: '' },
  { n: 12, cls: '',     html: '- Owned the collaborative document engine across <span class="bold">3 product surfaces</span>.' },
  { n: 13, cls: '',     html: '- Reduced sync latency by <span class="dgt">38%</span>; led migration to OT-CRDT hybrid.' },
  { n: 14, cls: '',     html: '- Mentored <span class="dgt">4</span> ICs; ran the editor-team interview loop.' },
  { n: 15, cls: '',     html: '' },
  { n: 16, cls: '',     html: '<span class="h2">### Stripe</span> · <span class="tag">Senior Engineer</span> · <span class="com">2021 — 2023</span>' },
  { n: 17, cls: 'cur',  html: '<span class="com">&lt;!-- @ai: tighten for payments-api JD --&gt;</span>' },
  { n: 18, cls: 'cur',  html: '' },
  { n: 19, cls: 'removed', html: '- Built the Payments Dashboard plugin runtime used by <span class="bold">11M LOC</span> of internal code.' },
  { n: 20, cls: 'added',   html: 'Designed the <span class="bold">Payments API plugin runtime</span> (TypeScript, gRPC) — adopted by <span class="dgt">14</span> internal teams and <span class="dgt">300+</span> merchants.' },
  { n: 21, cls: 'added',   html: 'Migrated 11M LOC from React 16 → 18 with <span class="bold">zero</span> regressions; authored the codemod RFC.' },
  { n: 22, cls: 'added',   html: 'Shipped <span class="lk">Codeblocks SDK</span> — public-API surface used by <span class="dgt">8</span> partner integrations.' },
  { n: 23, cls: '',     html: '' },
  { n: 24, cls: '',     html: '<span class="h2">### Atlas Labs</span> · <span class="tag">Founding Engineer</span> · <span class="com">2018 — 2021</span>' },
  { n: 25, cls: '',     html: '' },
  { n: 26, cls: '',     html: '- Built dev-infra: CLI, plugin SDK, multi-tenant runtime.' },
  { n: 27, cls: '',     html: '- Grew engineering from <span class="dgt">2</span> → <span class="dgt">14</span> ICs.' },
  { n: 28, cls: '',     html: '- Closed <span class="dgt">$8M</span> Series A based on demo I shipped.' },
];

function EditorPane({ tab, setTab }) {
  return (
    <section className="ed">
      <div className="ed__tabs">
        {[
          { id: 'experience', name: 'experience.mdx' },
          { id: 'summary',    name: 'summary.mdx' },
          { id: 'header',     name: 'header.mdx' },
        ].map((t) => (
          <div key={t.id} className={'ed__tab' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>
            <span className="dot"></span>
            <span>{t.name}</span>
            <span className="x">×</span>
          </div>
        ))}
        <div className="ed__tab spacer"></div>
        <div className="modes">
          <div className="seg">
            <button className="on">Source</button>
            <button>Outline</button>
            <button>Diff</button>
          </div>
        </div>
      </div>

      <div className="ed__body">
        <div className="ed__gutter">
          {LINES.map((l) => (
            <span key={l.n} className={'ln ' + (l.cls.includes('cur') ? 'cur' : '') + (l.cls.includes('added') ? ' added' : '')}>
              {l.n}
            </span>
          ))}
        </div>
        <div className="ed__lines">
          {/* selection chip floating above current line */}
          <div className="ed__selection" style={{ top: 314, left: 80 }}>
            <button>Rewrite<span className="kbd">⌘J</span></button>
            <button>Quantify</button>
            <button>Translate</button>
            <button>Ask…</button>
          </div>

          {LINES.map((l) => (
            <span
              key={l.n}
              className={'line ' + l.cls}
              dangerouslySetInnerHTML={{ __html: l.html || '&nbsp;' }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


/* =============== editor-3-prev-ai.jsx =============== */
/* ============================================================
   Preview pane — typeset paper
   ============================================================ */

function Preview() {
  return (
    <section className="prev">
      <div className="prev__bar">
        <div className="left">
          <span className="pill">A4 · serif · 1 of 1</span>
          <span>preview.pdf</span>
        </div>
        <div className="right">
          <div className="zoom">
            <button>−</button>
            <span className="lvl">100%</span>
            <button>+</button>
          </div>
          <span style={{ color: 'var(--ink-4)' }}>autosync</span>
        </div>
      </div>

      <div className="prev__body">
        <article className="paper">
          <h1>林 默 <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic' }}>·</span> Lin Mo</h1>
          <div className="role-line">Senior Frontend Engineer — Shanghai · Remote</div>
          <div className="contact">
            <span>lin@studio.dev</span>
            <span>+86 138 ····</span>
            <span>github.com/linmo</span>
            <span>linmo.dev</span>
          </div>
          <div className="rule"></div>

          <h2>
            Summary
            <small>Editor on call.</small>
          </h2>
          <p>
            Full-stack engineer with <b>7 years</b> building developer tools,
            design systems and editor-class web apps. Shipped at Stripe, Linear
            and a YC-backed dev-infra startup. Maintains <b className="num-strong">12.4k★</b> open-source.
          </p>

          <h2>
            Experience
            <small>Selected roles.</small>
          </h2>

          <div className="job">
            <div className="job-head">
              <span className="co">Linear</span>
              <span className="when">2023 — Now</span>
            </div>
            <p className="job-role">Staff Engineer · Sync Engine</p>
            <ul className="bullets">
              <li>Owned the collaborative document engine across <b>3 product surfaces</b>.</li>
              <li>Reduced sync latency by <b className="num-strong">38%</b>; led migration to OT-CRDT hybrid.</li>
              <li>Mentored <b className="num-strong">4</b> ICs; ran the editor-team interview loop.</li>
            </ul>
          </div>

          <div className="job focus-block">
            <div className="job-head">
              <span className="co">Stripe</span>
              <span className="when">2021 — 2023</span>
            </div>
            <p className="job-role">Senior Engineer · Payments Dashboard</p>
            <div className="ai-rewrite">
              <p style={{ margin: 0 }}>
                Designed the <b>Payments API plugin runtime</b> (TypeScript, gRPC) — adopted by <b className="num-strong">14</b> internal teams and <b className="num-strong">300+</b> merchants.
              </p>
              <p style={{ margin: '4px 0 0' }}>
                Migrated 11M LOC from React 16 → 18 with <b>zero</b> regressions; authored the codemod RFC.
              </p>
              <p style={{ margin: '4px 0 0' }}>
                Shipped <b>Codeblocks SDK</b> — public-API surface used by <b className="num-strong">8</b> partner integrations.
              </p>
              <div className="actions">
                <button className="accept">Accept all</button>
                <button>Accept one-by-one</button>
                <button className="reject">Reject</button>
              </div>
            </div>
          </div>

          <div className="job">
            <div className="job-head">
              <span className="co">Atlas Labs</span>
              <span className="when">2018 — 2021</span>
            </div>
            <p className="job-role">Founding Engineer · Developer infrastructure</p>
            <ul className="bullets">
              <li>Built dev-infra: CLI, plugin SDK, multi-tenant runtime.</li>
              <li>Grew engineering from <b className="num-strong">2</b> → <b className="num-strong">14</b> ICs.</li>
              <li>Closed <b className="num-strong">$8M</b> Series A based on demo I shipped.</li>
            </ul>
          </div>

          <h2>
            Open Source
            <small>Maintained.</small>
          </h2>
          <ul className="bullets">
            <li><b>résumé-studio</b> — markdown-first résumé tool with AI co-editor. <b className="num-strong">12.4k★</b></li>
            <li><b>plex-md</b> — minimal mdx renderer for typesetting. <b className="num-strong">3.1k★</b></li>
          </ul>
        </article>
      </div>
    </section>
  );
}

/* ============================================================
   AI dock — marginalia + composer
   ============================================================ */

function AIDock() {
  const [tab, setTab] = React.useState('margin');
  return (
    <aside className="ai">
      <div className="ai__head">
        <div className="title">Co-editor<small>Claude</small></div>
        <div className="live-dot">Live</div>
      </div>
      <div className="ai__tabs">
        <button className={tab === 'margin' ? 'on' : ''} onClick={() => setTab('margin')}>Marginalia · 6</button>
        <button className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>Chat</button>
        <button className={tab === 'tools' ? 'on' : ''} onClick={() => setTab('tools')}>Tools · 4</button>
      </div>

      <div className="ai__scroll">
        <div className="marginalia">
          <div className="note">
            <div className="note__head">
              <span className="note__kind">▍ Rewrite · L19–22</span>
              <span className="note__anchor">jump →</span>
            </div>
            <div className="note__body">
              Tightened your <b>Stripe</b> block for the Payments API JD.
              Quantified runtime adoption and removed vague impact verbs.
            </div>
            <div className="note__diff">
              <div className="row del"><span>−</span><span>Built the Payments Dashboard plugin runtime…</span></div>
              <div className="row add"><span>+</span><span>Designed the Payments API plugin runtime — 14 teams, 300+ merchants.</span></div>
            </div>
            <div className="note__actions">
              <button className="primary">Accept</button>
              <button>See alternatives · 3</button>
              <button>Dismiss</button>
            </div>
          </div>

          <div className="note note--gold">
            <div className="note__head">
              <span className="note__kind">▍ Gap · skills</span>
              <span className="note__anchor">L42 →</span>
            </div>
            <div className="note__body">
              JD mentions <b>Rust</b> and <b>gRPC</b>; you have gRPC at Stripe
              but no Rust signal. Want me to add a <span className="ins">"Currently learning Rust"</span> line under skills, or omit?
            </div>
            <div className="note__actions">
              <button className="primary">Add line</button>
              <button>Omit</button>
            </div>
          </div>

          <div className="divider">tool call</div>

          <div className="note note--ink">
            <div className="note__head">
              <span className="note__kind">▍ match_job() · 1.2s</span>
              <span className="note__anchor">trace →</span>
            </div>
            <div className="note__body" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
              <div>→ score · <b style={{ color: 'var(--moss)' }}>91 / 100</b> &nbsp;<span style={{ color: 'var(--ink-4)' }}>(+7 from v2.3)</span></div>
              <div>→ matched · <span style={{ color: 'var(--ink-2)' }}>TS, React 18, plugin SDK, payments infra</span></div>
              <div>→ gaps · <span style={{ color: 'var(--vermillion)' }}>Rust, gRPC</span></div>
            </div>
          </div>

          <div className="note note--moss">
            <div className="note__head">
              <span className="note__kind">▍ Translate · ready</span>
              <span className="note__anchor">preview →</span>
            </div>
            <div className="note__body">
              en-US version is prepared on branch <b>stripe-tailor-en</b>.
              Same 91 score, slightly different bullet ordering.
            </div>
            <div className="note__actions">
              <button>Open en-US</button>
              <button>Sync both</button>
            </div>
          </div>

          <div className="note">
            <div className="note__head">
              <span className="note__kind">▍ Style · L9</span>
              <span className="note__anchor">jump →</span>
            </div>
            <div className="note__body">
              Linear bullet uses passive voice. <span className="strike">Owned the collaborative document engine</span> → <span className="ins">Led the collaborative document engine</span>. Stronger verb for a Staff title.
            </div>
            <div className="note__actions">
              <button className="primary">Apply</button>
              <button>Keep</button>
            </div>
          </div>
        </div>
      </div>

      <div className="ai__compose-2">
        <div className="field">
          <span className="pre">Ask · ⌘L</span>
          <div className="body">
            translate selection to en-US, keep one-page<span className="cursor"></span>
          </div>
        </div>
        <div className="toolbar">
          <span className="chip on">@selection</span>
          <span className="chip">@jd</span>
          <span className="chip">@resume</span>
          <span className="chip">tools</span>
          <span className="chip send">↵ Send</span>
        </div>
      </div>
    </aside>
  );
}

/* ============================================================
   Status bar — IDE-style
   ============================================================ */

function StatusBar() {
  return (
    <footer className="status">
      <div className="seg"><span className="dot"></span><span>main ⎇ <b>stripe-tailor</b></span></div>
      <div className="seg"><b>↑ 6</b><span> commits</span></div>
      <div className="seg"><span>UTF-8</span></div>
      <div className="seg"><span>experience.mdx · ln <b>17</b>, col <b>23</b></span></div>
      <div className="seg accent"><span>JD match · <b>91</b> / 100</span></div>
      <div className="seg"><span>1 page · <b>312</b> words</span></div>
      <div className="seg right"><span className="dot live"></span><span>Claude · <b>Sonnet 4.5</b></span></div>
      <div className="seg right"><span>auto-save · <b>on</b></span></div>
      <div className="seg right"><span>v0.4.2</span></div>
    </footer>
  );
}


/* =============== editor-4-tweaks-app.jsx =============== */
/* ============================================================
   Tweaks panel
   ============================================================ */

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "accent": "vermillion",
  "paper": "cream",
  "density": "cozy",
  "fontScale": 100,
  "showAI": true,
  "showTree": true,
  "ruleLines": false,
  "marginaliaMode": "notes",
  "aiTone": "editor"
}/*EDITMODE-END*/;

const ACCENTS = [
  { id: 'vermillion', hex: '#B73E1B', label: 'Vermillion' },
  { id: 'moss',       hex: '#4A5D2F', label: 'Moss' },
  { id: 'prussian',   hex: '#1F4068', label: 'Prussian' },
  { id: 'ink-only',   hex: '#0E0E0C', label: 'Ink only' },
];
const PAPERS = [
  { id: 'cream',      hex: '#FAF8F2', label: 'Cream' },
  { id: 'snow',       hex: '#FFFFFF', label: 'Snow' },
  { id: 'newsprint',  hex: '#F1ECDF', label: 'Newsprint' },
];

function TweaksPanel({ tweaks, setTweak, onClose }) {
  return (
    <>
      <div className="tweaks-backdrop" onClick={onClose}></div>
      <aside className="tweaks">
        <div className="tweaks__head">
          <h3>Tweaks<small>workspace · live</small></h3>
          <button className="tweaks__close" onClick={onClose}>×</button>
        </div>

        <div className="tweaks__scroll">
          <div className="tweak-section">
            <div className="tweak-section__label">— Palette</div>
            <div className="tweak-row">
              <div className="lbl">
                Accent
                <small>red-pen / annotations</small>
              </div>
              <div className="swatches">
                {ACCENTS.map((a) => (
                  <div
                    key={a.id}
                    className={'sw' + (tweaks.accent === a.id ? ' on' : '')}
                    style={{ background: a.hex }}
                    onClick={() => setTweak('accent', a.id)}
                    title={a.label}
                  ></div>
                ))}
              </div>
            </div>
            <div className="tweak-row">
              <div className="lbl">
                Paper
                <small>page surface</small>
              </div>
              <div className="swatches">
                {PAPERS.map((p) => (
                  <div
                    key={p.id}
                    className={'sw' + (tweaks.paper === p.id ? ' on' : '')}
                    style={{ background: p.hex }}
                    onClick={() => setTweak('paper', p.id)}
                    title={p.label}
                  ></div>
                ))}
              </div>
            </div>
            <div className="tweak-row">
              <div className="lbl">
                Rule lines
                <small>paper-style horizontals</small>
              </div>
              <div
                className={'tgl' + (tweaks.ruleLines ? ' on' : '')}
                onClick={() => setTweak('ruleLines', !tweaks.ruleLines)}
              ></div>
            </div>
          </div>

          <div className="tweak-section">
            <div className="tweak-section__label">— Typography</div>
            <div
              className={'font-swatch serif-stack' + (tweaks.font === 'serif' ? ' on' : '')}
              onClick={() => setTweak('font', 'serif')}
            >
              <div>
                <div className="name">Plex Serif</div>
                <div className="meta" style={{ marginTop: 2 }}>print · editorial</div>
              </div>
              <div className="meta">Aa</div>
            </div>
            <div
              className={'font-swatch sans-stack' + (tweaks.font === 'sans' ? ' on' : '')}
              onClick={() => setTweak('font', 'sans')}
            >
              <div>
                <div className="name">Plex Sans</div>
                <div className="meta" style={{ marginTop: 2 }}>modern · neutral</div>
              </div>
              <div className="meta">Aa</div>
            </div>
            <div
              className={'font-swatch mono-stack' + (tweaks.font === 'mono' ? ' on' : '')}
              onClick={() => setTweak('font', 'mono')}
            >
              <div>
                <div className="name">Plex Mono</div>
                <div className="meta" style={{ marginTop: 2 }}>terminal · indie</div>
              </div>
              <div className="meta">Aa</div>
            </div>
          </div>

          <div className="tweak-section">
            <div className="tweak-section__label">— Density</div>
            <div className="tweak-row">
              <div className="lbl">UI density</div>
              <div className="seg-radio">
                {['tight', 'cozy', 'loose'].map((d) => (
                  <button
                    key={d}
                    className={tweaks.density === d ? 'on' : ''}
                    onClick={() => setTweak('density', d)}
                  >{d}</button>
                ))}
              </div>
            </div>
            <div className="tweak-row">
              <div className="lbl">
                Font scale
                <small>editor + preview</small>
              </div>
              <div className="slider-wrap">
                <input
                  className="slider"
                  type="range"
                  min="80"
                  max="130"
                  step="5"
                  value={tweaks.fontScale}
                  onChange={(e) => setTweak('fontScale', parseInt(e.target.value))}
                />
                <span className="val">{tweaks.fontScale}%</span>
              </div>
            </div>
          </div>

          <div className="tweak-section">
            <div className="tweak-section__label">— Layout</div>
            <div className="tweak-row">
              <div className="lbl">
                File tree
                <small>left section panel</small>
              </div>
              <div
                className={'tgl' + (tweaks.showTree ? ' on' : '')}
                onClick={() => setTweak('showTree', !tweaks.showTree)}
              ></div>
            </div>
            <div className="tweak-row">
              <div className="lbl">
                AI dock
                <small>right marginalia</small>
              </div>
              <div
                className={'tgl' + (tweaks.showAI ? ' on' : '')}
                onClick={() => setTweak('showAI', !tweaks.showAI)}
              ></div>
            </div>
          </div>

          <div className="tweak-section">
            <div className="tweak-section__label">— AI behaviour</div>
            <div className="tweak-row">
              <div className="lbl">
                Marginalia
                <small>how AI surfaces edits</small>
              </div>
              <div className="seg-radio">
                {[
                  { id: 'notes',  label: 'Notes' },
                  { id: 'inline', label: 'Inline' },
                  { id: 'off',    label: 'Off' },
                ].map((m) => (
                  <button
                    key={m.id}
                    className={tweaks.marginaliaMode === m.id ? 'on' : ''}
                    onClick={() => setTweak('marginaliaMode', m.id)}
                  >{m.label}</button>
                ))}
              </div>
            </div>
            <div className="tweak-row">
              <div className="lbl">
                Tone
                <small>copy-editing voice</small>
              </div>
              <div className="seg-radio">
                {[
                  { id: 'editor',  label: 'Editor' },
                  { id: 'coach',   label: 'Coach' },
                  { id: 'minimal', label: 'Minimal' },
                ].map((m) => (
                  <button
                    key={m.id}
                    className={tweaks.aiTone === m.id ? 'on' : ''}
                    onClick={() => setTweak('aiTone', m.id)}
                  >{m.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="tweaks__foot">
          <span>changes apply live</span>
          <button onClick={() => Object.entries(DEFAULT_TWEAKS).forEach(([k, v]) => setTweak(k, v))}>
            reset to defaults
          </button>
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   App root
   ============================================================ */

function useTweaks() {
  const [t, setT] = React.useState({ font: 'serif', ...DEFAULT_TWEAKS });
  const setTweak = React.useCallback((key, val) => {
    setT((prev) => ({ ...prev, [key]: val }));
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
    } catch (e) {}
  }, []);
  return [t, setTweak];
}

function App() {
  const [tab, setTab] = React.useState('experience');
  const [tweaks, setTweak] = useTweaks();
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  // listen for host toolbar
  React.useEffect(() => {
    const onMsg = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const handleClose = () => {
    setTweaksOpen(false);
    try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
  };

  // compose class names from tweaks
  const cls = [
    'editor-app',
    'theme-' + tweaks.accent,
    'paper-' + tweaks.paper,
    'density-' + tweaks.density,
    tweaks.ruleLines ? 'lines-on' : '',
  ].filter(Boolean).join(' ');

  const cols = [
    'var(--rail-w)',
    tweaks.showTree ? '220px' : '0px',
    'minmax(320px, 1fr)',
    'minmax(320px, 1fr)',
    tweaks.showAI ? '320px' : '0px',
  ];
  const gridStyle = {
    gridTemplateColumns: cols.join(' '),
    fontSize: (tweaks.fontScale / 100) + 'rem',
  };

  return (
    <div className="editor-shell">
    <div className={cls} style={gridStyle}>
      <Topbar onTweaks={() => setTweaksOpen(true)} />
      <Rail />
      {tweaks.showTree
        ? <FileTree active={tab} onSelect={setTab} />
        : <div className="tree" style={{ display: 'none' }}></div>}
      <EditorPane tab={tab} setTab={setTab} />
      <Preview />
      {tweaks.showAI
        ? <AIDock />
        : <div className="ai" style={{ display: 'none' }}></div>}
      <StatusBar />

      <button className="tweaks-fab" onClick={() => setTweaksOpen(true)} aria-label="Open Tweaks">
        Tw
        <span className="ind"></span>
      </button>

      {tweaksOpen && (
        <TweaksPanel
          tweaks={tweaks}
          setTweak={setTweak}
          onClose={handleClose}
        />
      )}
    </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

