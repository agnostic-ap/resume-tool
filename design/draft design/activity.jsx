/* Lower row: Git-log timeline + AI co-pilot panel with tool calls */

function VersionTimeline() {
  return (
    <div className="panel">
      <div className="panel__head">
        <div className="ttl">04 · <em>Commits</em> &nbsp;<span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>· main</span></div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span>23 total</span>
          <a href="#log" style={{ color: 'var(--ink-3)' }}>full log →</a>
        </div>
      </div>
      <div className="timeline">
        {COMMITS.map((c, i) => (
          <div key={i} className={'commit commit--' + c.type}>
            <div className="commit__graph">
              <span className="commit__dot"></span>
            </div>
            <div className="commit__body">
              <div className="commit__msg">{c.msg}</div>
              <div className="commit__meta">{c.meta}</div>
            </div>
            <div className="commit__sha">
              <div className="hash">{c.hash}</div>
              <div>{c.when}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIPanel() {
  return (
    <div className="panel">
      <div className="panel__head">
        <div className="ttl">05 · <em>Co-editor</em></div>
        <div className="live">SESSION · LIVE</div>
      </div>
      <div className="ai">
        <div className="ai__convo">
          <div className="ai__msg ai__msg--user">
            <div className="gut">›</div>
            <div className="body">
              tailor my résumé for <strong>this Stripe role</strong> — focus on
              payments infra & TS expertise. keep it 1-page.
            </div>
          </div>

          <div className="ai__msg ai__msg--ai">
            <div className="gut">∗</div>
            <div className="body">
              Reading JD. Pulling current résumé v2.4. I'll branch off main as
              <strong> stripe-tailor</strong>, rewrite three sections, and
              compress to one page. You can review the diff before merging.

              <div className="ai__tool">
                <div className="ai__tool__head">
                  <span className="name">read_resume</span>
                  <span className="status">DONE · 84ms</span>
                </div>
                <div className="ai__tool__body">
                  <div className="row"><span className="k">id</span><span className="v"><b>r-001</b> · Senior Frontend v2.4</span></div>
                  <div className="row"><span className="k">returns</span><span className="v">12 blocks · 487 lines</span></div>
                </div>
              </div>

              <div className="ai__tool">
                <div className="ai__tool__head">
                  <span className="name">match_job</span>
                  <span className="status">DONE · 1.2s</span>
                </div>
                <div className="ai__tool__body">
                  <div className="row"><span className="k">jd</span><span className="v">stripe.com/jobs/5837 · Payments API</span></div>
                  <div className="row"><span className="k">score</span><span className="v"><b>84</b> / 100 &nbsp; <span style={{ color: 'var(--ink-4)' }}>gaps: Rust, gRPC</span></span></div>
                </div>
              </div>

              <div className="ai__tool">
                <div className="ai__tool__head">
                  <span className="name">create_branch</span>
                  <span className="status status--running">RUNNING</span>
                </div>
                <div className="ai__tool__body">
                  <div className="row"><span className="k">name</span><span className="v"><b>stripe-tailor</b></span></div>
                  <div className="row"><span className="k">from</span><span className="v">main @ c4f2b1e</span></div>
                </div>
              </div>

              Rewriting Summary + Experience · Stripe relevance now <b>91</b>.
              Want me to drop the Wavelet side-project to fit one page?
            </div>
          </div>
        </div>

        <div className="ai__compose">
          <div className="prompt">
            <span>yes, and translate to en-US</span>
            <span className="cursor"></span>
          </div>
          <div className="actions">
            <button className="chip">@résumé</button>
            <button className="chip">@jd</button>
            <button className="chip">tools</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Activity() {
  return (
    <section className="section">
      <div className="lower">
        <VersionTimeline />
        <AIPanel />
      </div>
    </section>
  );
}
