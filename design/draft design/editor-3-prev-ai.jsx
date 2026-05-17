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
