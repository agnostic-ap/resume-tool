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
