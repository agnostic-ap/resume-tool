/* Hero — current/pinned document with mini-preview */

function Hero() {
  return (
    <div className="hero">
      <div className="hero__left">
        <div className="hero__eyebrow">
          <span className="dot"></span>
          <span>Pinned · currently editing</span>
          <span style={{ marginLeft: 'auto', color: 'var(--ink-4)' }}>main · v2.4</span>
        </div>

        <h1 className="hero__title">
          Senior Frontend <em>Engineer</em>
        </h1>
        <div className="hero__sub">
          <span className="pill">zh-CN</span>
          <span>simplified · serif template</span>
          <span style={{ color: 'var(--ink-5)' }}>·</span>
          <span>last saved 4 min ago</span>
        </div>

        <div className="hero__stats">
          <div className="hero__stat">
            <div className="k">Versions</div>
            <div className="v">23<small>commits</small></div>
          </div>
          <div className="hero__stat">
            <div className="k">Tailored</div>
            <div className="v">4<small>branches</small></div>
          </div>
          <div className="hero__stat">
            <div className="k">Views</div>
            <div className="v">142<small>shares</small></div>
          </div>
          <div className="hero__stat">
            <div className="k">Match · avg</div>
            <div className="v">87<small>/100</small></div>
          </div>
        </div>

        <div className="hero__actions">
          <a href="editor.html" className="btn btn--primary" style={{ textDecoration: 'none' }}>
            <Icons.Open size={14} />
            Open editor
            <kbd>E</kbd>
          </a>
          <button className="btn">
            <Icons.Wand size={14} />
            Tailor with AI
          </button>
          <button className="btn btn--ghost">
            <Icons.Export size={14} />
            Export PDF
          </button>
          <button className="btn btn--ghost">
            <Icons.Diff size={14} />
            View diff
          </button>
        </div>
      </div>

      <div className="hero__right">
        <div className="preview__bar">
          <div className="tabs">
            <span className="on">preview.pdf</span>
            <span>header.mdx</span>
            <span>experience.mdx</span>
          </div>
          <span>A4 · 1 / 1</span>
        </div>
        <div className="preview">
          <div className="preview__paper">
            <h1>林 默 · Lin Mo</h1>
            <div className="role">Senior Frontend Engineer · Shanghai</div>
            <div className="rule"></div>

            <h3>Summary</h3>
            <p>
              Full-stack engineer with 7 years building developer tools, design
              systems and editor-class web apps. Shipped at Stripe, Linear and a
              YC-backed dev-infra startup. Open-source maintainer (12k★).
            </p>

            <h3>Experience</h3>
            <div className="row"><strong>Linear · Staff Engineer</strong><span>2023 — Now</span></div>
            <p style={{ fontSize: 8.5, color: 'var(--ink-3)' }}>
              Owned the collaborative document engine. Reduced sync latency by 38%,
              led the migration to OT-CRDT hybrid. Mentored 4 ICs.
            </p>
            <div className="row"><strong>Stripe · Senior Engineer</strong><span>2021 — 2023</span></div>
            <p style={{ fontSize: 8.5, color: 'var(--ink-3)' }}>
              Built Payments Dashboard's plugin runtime. Migrated 11M LOC from
              React 16 → 18 with zero regressions. Shipped Codeblocks SDK.
            </p>

            <h3>Open Source</h3>
            <div className="row"><strong>résumé-studio</strong><span>12.4k ★</span></div>
            <div className="row"><strong>plex-md</strong><span>3.1k ★</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
