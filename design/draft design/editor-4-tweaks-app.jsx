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
