/* Applications table — typeset row style */

function Applications() {
  const [filter, setFilter] = React.useState('all');
  const filters = [
    { id: 'all',      label: 'All',       count: 12 },
    { id: 'applied',  label: 'Applied',   count: 4 },
    { id: 'screen',   label: 'Screening', count: 2 },
    { id: 'onsite',   label: 'On-site',   count: 3 },
    { id: 'offer',    label: 'Offer',     count: 1 },
    { id: 'rejected', label: 'Closed',    count: 2 },
  ];

  const matchClass = (m) => m >= 85 ? 'bar--match-hi' : m >= 70 ? 'bar--match-md' : 'bar--match-lo';

  return (
    <section className="section">
      <div className="section__head section__head--double">
        <div>
          <div className="num">03 · Pipeline</div>
          <h2>Where you've <em>applied</em></h2>
        </div>
        <div className="meta">
          <span>1 offer · 5 active · 6 closed</span>
          <a href="#new">+ Log application</a>
        </div>
      </div>

      <div className="apps">
        <div className="apps__toolbar">
          <div className="apps__filters">
            {filters.map((f) => (
              <button
                key={f.id}
                className={filter === f.id ? 'on' : ''}
                onClick={() => setFilter(f.id)}
              >
                {f.label}<span className="count">{f.count}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
            <span>sorted by · most recent</span>
            <Icons.ArrowR size={12} />
          </div>
        </div>

        <table className="apps__table">
          <thead>
            <tr>
              <th style={{ width: '26%' }}>Company</th>
              <th style={{ width: '24%' }}>Role</th>
              <th style={{ width: '18%' }}>Résumé used</th>
              <th style={{ width: '12%' }}>Stage</th>
              <th style={{ width: '12%' }}>Match</th>
              <th style={{ width: '8%' }}>Applied</th>
            </tr>
          </thead>
          <tbody>
            {APPLICATIONS.map((a, i) => (
              <tr key={i}>
                <td>
                  <div className="co">
                    <div className="co__logo">{a.mono}</div>
                    <div>
                      <div className="co__name">{a.co}</div>
                      <div className="co__loc">{a.loc}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="role-cell">
                    {a.role}
                    <small>{a.dept}</small>
                  </div>
                </td>
                <td>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {a.resume}
                  </span>
                </td>
                <td>
                  <span className={'stage stage--' + a.stage}>{a.stageLabel}</span>
                </td>
                <td>
                  <div className="match-cell">
                    <div className={'bar ' + matchClass(a.match)}>
                      <i style={{ width: a.match + '%' }}></i>
                    </div>
                    <span>{a.match}</span>
                  </div>
                </td>
                <td>
                  <div className="applied-when">
                    {a.when}
                    <small>{a.ago}</small>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
