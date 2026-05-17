/* App root */

function App() {
  const [cmdkOpen, setCmdkOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <Topbar onOpenCmdk={() => setCmdkOpen(true)} />
      <Rail />
      <main className="main" data-screen-label="Workspace · Overview">
        <div className="main__inner">
          <section className="section">
            <div className="section__head">
              <div>
                <div className="num">01 · Now editing</div>
                <h2>Pick up where you <em>left off</em></h2>
              </div>
              <div className="meta">
                <span>Last session · 4 minutes ago</span>
                <a href="#open">Open all tabs →</a>
              </div>
            </div>
            <Hero />
          </section>

          <Documents />
          <Applications />
          <Activity />
        </div>
      </main>

      <Cmdk open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
