/* Documents grid */

function Documents() {
  return (
    <section className="section">
      <div className="section__head">
        <div>
          <div className="num">02 · Documents</div>
          <h2>Your <em>résumés</em></h2>
        </div>
        <div className="meta">
          <a href="#all">View all 5 →</a>
          <a href="#import">Import .pdf · .docx</a>
        </div>
      </div>

      <div className="docs">
        {DOCUMENTS.slice(0, 5).map((d) => (
          <article key={d.id} className="doc" data-screen-label={d.title} onClick={() => window.location.href = 'editor.html'}>
            <div className="doc__head">
              <span className="lang">{d.lang}</span>
              <span className="menu">···</span>
            </div>
            <div>
              <div className="doc__title">{d.title}</div>
              <div className="doc__role">{d.role}</div>
            </div>
            <div className="doc__sig">{d.sig}</div>
            <div className="doc__meta">
              {d.live && <span className="dot live"></span>}
              {!d.live && <span className="dot"></span>}
              <span>{d.versions} commits</span>
              <span style={{ color: 'var(--ink-5)' }}>·</span>
              <span>{d.views} views</span>
              <span style={{ marginLeft: 'auto' }}>{d.updated}</span>
            </div>
          </article>
        ))}

        <article className="doc doc--new">
          <div className="plus"><Icons.Plus size={16} stroke={1.4} /></div>
          <strong>New résumé</strong>
          <span>blank · import · ask AI</span>
        </article>
      </div>
    </section>
  );
}
