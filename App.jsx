const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 200,
  "ctaHue": 45,
  "density": 1
}/*EDITMODE-END*/;

const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;

/* ───────────────────── CSS Variables & Styling ───────────────────── */

const globalStyles = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    transition: background-color 0.25s ease, border-color 0.25s ease, color 0.2s ease;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  /* Material Design 3 Theme Tokens */
  .theme-light {
    --primary: oklch(0.55 0.18 var(--ocd-tweak-accent-hue, 200));
    --primary-container: oklch(0.88 0.08 var(--ocd-tweak-accent-hue, 200));
    --on-primary-container: oklch(0.3 0.12 var(--ocd-tweak-accent-hue, 200));
    --surface: #ffffff;
    --surface-variant: #f3f4f8;
    --background: #f9fafc;
    --text: #1b1b1f;
    --text-muted: #5e6066;
    --border: #e1e2ec;
    --success: #1b7b43;
    --success-bg: #e6f6ec;
    --error: #b3261e;
    --error-bg: #fdf0ee;
    --warning: #a05a00;
    --warning-bg: #fff7eb;
    --chart-grid: #eaecef;
    --shadow-color: rgba(0, 0, 0, 0.06);
    --shadow-ambient: rgba(0, 0, 0, 0.04);
    --specular: rgba(255, 255, 255, 0);
  }

  .theme-dark {
    --primary: oklch(0.78 0.12 var(--ocd-tweak-accent-hue, 200));
    --primary-container: oklch(0.35 0.1 var(--ocd-tweak-accent-hue, 200) / 0.5);
    --on-primary-container: oklch(0.85 0.08 var(--ocd-tweak-accent-hue, 200));
    --surface: #121318;
    --surface-variant: #1a1b20;
    --background: #0b0c10;
    --text: #e3e2e6;
    --text-muted: #8e9099;
    --border: #2e3038;
    --success: #34d399;
    --success-bg: rgba(52, 211, 153, 0.1);
    --error: #ff897a;
    --error-bg: rgba(255, 137, 122, 0.1);
    --warning: #ffb951;
    --warning-bg: rgba(255, 185, 81, 0.1);
    --chart-grid: #24262c;
    --shadow-color: rgba(0, 0, 0, 0.4);
    --shadow-ambient: rgba(0, 0, 0, 0.2);
    --specular: rgba(255, 255, 255, 0.03);
  }

  /* Elevation Shadows */
  .shadow-1 {
    box-shadow: 0px 1px 3px 1px var(--shadow-color), 
                0px 1px 2px 0px var(--shadow-ambient), 
                inset 0px 1px 0px var(--specular);
    border: 1px solid var(--border);
  }

  .shadow-2 {
    box-shadow: 0px 2px 6px 2px var(--shadow-color), 
                0px 1px 2px 0px var(--shadow-ambient), 
                inset 0px 1px 0px var(--specular);
    border: 1px solid var(--border);
  }

  .shadow-3 {
    box-shadow: 0px 4px 8px 3px var(--shadow-color), 
                0px 1px 3px 0px var(--shadow-ambient), 
                inset 0px 1px 0px var(--specular);
    border: 1px solid var(--border);
  }

  /* Utility classes */
  .tabular {
    font-variant-numeric: tabular-nums;
  }

  /* Custom Scrollbars */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }
`;

/* ───────────────────── DATASETS ───────────────────── */

const marketChart = {
  nifty: [
    { label: "09:30", value: 23210, score: 58 },
    { label: "10:30", value: 23260, score: 62 },
    { label: "11:30", value: 23180, score: 48 },
    { label: "12:30", value: 23290, score: 67 },
    { label: "13:30", value: 23340, score: 71 },
    { label: "14:30", value: 23280, score: 54 },
    { label: "15:30", value: 23390, score: 78 }
  ],
  sensex: [
    { label: "09:30", value: 76350, score: 55 },
    { label: "10:30", value: 76420, score: 59 },
    { label: "11:30", value: 76210, score: 42 },
    { label: "12:30", value: 76590, score: 64 },
    { label: "13:30", value: 76680, score: 73 },
    { label: "14:30", value: 76490, score: 50 },
    { label: "15:30", value: 76820, score: 81 }
  ]
};

const stockUniverse = [
  { ticker: "RELIANCE", name: "Reliance Industries", price: 2942.50, change: 1.45, score: 74, sector: "Energy", filings: 12 },
  { ticker: "TCS", name: "Tata Consultancy Services", price: 3824.10, change: -0.85, score: 38, sector: "Technology", filings: 8 },
  { ticker: "HDFCBANK", name: "HDFC Bank", price: 1612.30, change: 2.10, score: 82, sector: "Financials", filings: 15 },
  { ticker: "INFY", name: "Infosys Ltd", price: 1544.80, change: -1.25, score: 32, sector: "Technology", filings: 11 },
  { ticker: "ICICIBANK", name: "ICICI Bank", price: 1120.40, change: 0.95, score: 68, sector: "Financials", filings: 9 },
  { ticker: "BHARTIARTL", name: "Bharti Airtel", price: 1385.00, change: 1.12, score: 59, sector: "Telecom", filings: 6 },
  { ticker: "SBIN", name: "State Bank of India", price: 832.60, change: -1.80, score: 28, sector: "Financials", filings: 14 },
  { ticker: "LARTENT", name: "Larsen & Toubro", price: 3512.00, change: 0.40, score: 55, sector: "Industrials", filings: 7 }
];

const liveAnnouncements = [
  {
    id: "ann-1",
    time: "10m ago",
    ticker: "HDFCBANK",
    headline: "HDFC Bank reports 12% YoY growth in Q1 advances, deposits surge 16%",
    source: "NSE Press Release",
    category: "Financial Results",
    score: 84,
    bertSentiment: "Bullish",
    summary: "Strong loan and deposit pipelines highlight persistent credit demand in retail segments, outpacing estimates."
  },
  {
    id: "ann-2",
    time: "24m ago",
    ticker: "SBIN",
    headline: "SBI increases Marginal Cost of Funds Based Lending Rate (MCLR) by 10 bps",
    source: "Regulatory Filing",
    category: "Policy Update",
    score: 35,
    bertSentiment: "Bearish",
    summary: "Lending rates increase could slightly compress retail credit demand, signaling tighter margins on loan books."
  },
  {
    id: "ann-3",
    time: "45m ago",
    ticker: "RELIANCE",
    headline: "Reliance Retail partners with ASOS to launch global fashion hub in India",
    source: "Media Release",
    category: "Partnerships",
    score: 72,
    bertSentiment: "Bullish",
    summary: "Exclusive retail rights for ASOS online and offline markets expand Reliance portfolio coverage."
  },
  {
    id: "ann-4",
    time: "1h ago",
    ticker: "TCS",
    headline: "TCS secure multi-million dollar cloud migration mandate from Eurocorp Bank",
    source: "NSE Announcement",
    category: "Business Updates",
    score: 65,
    bertSentiment: "Neutral",
    summary: "Cloud transition deal spanning 5 years provides steady revenue visibility, offsetting overall tech sector headwinds."
  },
  {
    id: "ann-5",
    time: "2h ago",
    ticker: "INFY",
    headline: "Infosys faces delay in project integration timelines with US retail client",
    source: "Regulatory Filing",
    category: "Disclosures",
    score: 24,
    bertSentiment: "Bearish",
    summary: "Integration delays are likely to push billing cycles to Q3, prompting minor revisions to short-term projections."
  }
];

/* ───────────────────── SVG ICONS ───────────────────── */

const Icons = {
  Dashboard: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Trend: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Alerts: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Settings: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  ThemeToggle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
};

/* ───────────────────── MAIN APP COMPONENT ───────────────────── */

function App() {
  const [theme, setTheme] = useState("dark");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);
  const [timeframe, setTimeframe] = useState("1D");
  const [chartSeries, setChartSeries] = useState("nifty");
  const [activeCompany, setActiveCompany] = useState(stockUniverse[0]);
  const [animatedScore, setAnimatedScore] = useState(0);

  const indices = [
    { name: "NIFTY 50", val: "23,390.15", change: "+135.50", pct: "+0.58%", pos: true },
    { name: "SENSEX", val: "76,820.90", change: "+440.20", pct: "+0.57%", pos: true },
    { name: "NIFTY BANK", val: "49,780.20", change: "-120.40", pct: "-0.24%", pos: false },
    { name: "NIFTY IT", val: "34,890.50", change: "+210.80", pct: "+0.61%", pos: true }
  ];

  // Load stylesheet
  useEffect(() => {
    const styleId = "nse-dashboard-theme";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = globalStyles;
      document.head.appendChild(style);
    }
  }, []);

  // Animate Gauge value on active company change
  useEffect(() => {
    setAnimatedScore(0);
    const target = activeCompany.score;
    const duration = 800;
    const stepTime = 16;
    const steps = duration / stepTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(easeProgress * target));

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedScore(target);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [activeCompany]);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
    triggerToast("Theme Swapped!");
  };

  // Memoized lists for Gainers and Losers
  const gainers = useMemo(() => {
    return [...stockUniverse].sort((a, b) => b.change - a.change).slice(0, 4);
  }, []);

  const losers = useMemo(() => {
    return [...stockUniverse].sort((a, b) => a.change - b.change).slice(0, 4);
  }, []);

  // Filtered live feed announcements
  const filteredAnnouncements = useMemo(() => {
    if (!searchQuery) return liveAnnouncements;
    return liveAnnouncements.filter(ann => 
      ann.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.headline.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className={`theme-${theme}`} style={{ display: 'flex', background: 'var(--background)', color: 'var(--text)', minHeight: '100vh', overflow: 'hidden' }}>
      
      {/* ───── TOAST NOTIFICATION ───── */}
      {toast && (
        <div className="shadow-3" style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: 'var(--surface-variant)', color: 'var(--text)',
          padding: '12px 24px', borderRadius: '8px', zIndex: 1000,
          border: '1px solid var(--border)', fontWeight: 550,
          animation: 'slideUp 0.25s cubic-bezier(0, 0, 0.2, 1)'
        }}>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          {toast}
        </div>
      )}

      {/* ───── SIDEBAR NAVIGATION (72px) ───── */}
      <aside className="shadow-1" style={{
        width: '72px', background: 'var(--surface)', display: 'flex',
        flexDirection: 'column', alignItems: 'center', py: '20px',
        borderRight: '1px solid var(--border)', height: '100vh',
        justifyContent: 'space-between', padding: '16px 0'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', width: '100%' }}>
          {/* Logo badge */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'var(--primary-container)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary)', fontWeight: 800, fontSize: '18px'
          }}>
            NSE
          </div>

          {/* Navigation items (56px) */}
          {[
            { id: "dashboard", icon: <Icons.Dashboard />, label: "Stats" },
            { id: "alerts", icon: <Icons.Alerts />, label: "Alerts" },
            { id: "settings", icon: <Icons.Settings />, label: "Settings" }
          ].map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  triggerToast(`Navigated to ${item.id}`);
                }}
                className="navigation-button"
                style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  border: 'none', background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'var(--background)' : 'var(--text-muted)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', outline: 'none'
                }}
              >
                {item.icon}
                <span style={{ fontSize: '9px', marginTop: '4px', fontWeight: isActive ? 'bold' : 'normal' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Theme Toggle bottom button */}
        <button
          onClick={toggleTheme}
          style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'var(--surface-variant)', border: 'none',
            color: 'var(--text-muted)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', outline: 'none'
          }}
        >
          <Icons.ThemeToggle />
        </button>
      </aside>

      {/* ───── CONTENT CONTAINER ───── */}
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '24px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        
        {/* ───── HEADER ROW ───── */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, trackingTight: '-0.02em' }}>NSE Stock Sentiment Analyzer</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Official filings & FinBERT-driven sentiment analysis</p>
          </div>

          {/* M3 Pill Search Bar (28px radius) */}
          <div className="shadow-1" style={{
            display: 'flex', alignItems: 'center', background: 'var(--surface)',
            borderRadius: '28px', padding: '6px 16px', width: '320px',
            border: '1px solid var(--border)'
          }}>
            <Icons.Search />
            <input
              type="text"
              placeholder="Search stocks or headlines..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: '13px', marginLeft: '8px',
                width: '100%'
              }}
            />
          </div>
        </header>

        {/* ───── INDICES STRIP (Min 160px Columns) ───── */}
        <section style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px', marginBottom: '24px'
        }}>
          {indices.map((idx, i) => (
            <div key={i} className="shadow-1" style={{
              background: 'var(--surface)', padding: '16px', borderRadius: '16px',
              display: 'flex', flexDirection: 'column', gap: '4px',
              cursor: 'pointer'
            }} onClick={() => triggerToast(`Clicked ${idx.name}`)}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{idx.name}</span>
              <span className="tabular" style={{ fontSize: '18px', fontWeight: 800 }}>{idx.val}</span>
              <span className="tabular" style={{
                fontSize: '11px', fontWeight: 650,
                color: idx.pos ? 'var(--success)' : 'var(--error)'
              }}>
                {idx.change} ({idx.pct})
              </span>
            </div>
          ))}
        </section>

        {/* ───── TWO COLUMN SENTIMENT SUMMARY GAUGE & FEED ───── */}
        <section style={{
          display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px',
          marginBottom: '24px'
        }}>
          
          {/* Circular Gauge Card */}
          <div className="shadow-1" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, alignSelf: 'flex-start', marginBottom: '16px' }}>Target Sentiment</h3>
            
            {/* Animated SVG Gauge (180px) */}
            <div style={{ position: 'relative', width: '180px', height: '180px' }}>
              <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="90" cy="90" r="75"
                  fill="none" stroke="var(--border)" strokeWidth="12"
                />
                <circle
                  cx="90" cy="90" r="75"
                  fill="none"
                  stroke={animatedScore > 60 ? 'var(--success)' : animatedScore >= 40 ? 'var(--warning)' : 'var(--error)'}
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 75}`}
                  strokeDashoffset={`${2 * Math.PI * 75 * (1 - animatedScore / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke 0.3s ease' }}
                />
              </svg>
              {/* Score label inside */}
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="tabular" style={{ fontSize: '36px', fontWeight: 900 }}>{animatedScore}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Score</span>
              </div>
            </div>

            {/* Gauge Active Company Selection Details */}
            {(() => {
              const liveCompany = activeCompany;
              return (
                <div style={{ marginTop: '20px', width: '100%', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800 }}>{liveCompany.ticker}</span>
                    <span className="tabular" style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      ₹{liveCompany.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({liveCompany.change >= 0 ? "+" : ""}{liveCompany.change.toFixed(2)}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{liveCompany.name} ({liveCompany.sector})</p>
                    <span style={{
                      padding: '2px 8px', borderRadius: '20px', fontSize: '9px', fontWeight: 'bold',
                      background: liveCompany.score > 60 ? 'var(--success-bg)' : liveCompany.score >= 40 ? 'var(--warning-bg)' : 'var(--error-bg)',
                      color: liveCompany.score > 60 ? 'var(--success)' : liveCompany.score >= 40 ? 'var(--warning)' : 'var(--error)'
                    }}>
                      {liveCompany.score > 60 ? 'Bullish' : liveCompany.score >= 40 ? 'Neutral' : 'Bearish'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sentiment card feed */}
          <div className="shadow-1" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Real-time Sentiment Feed</h3>
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>{filteredAnnouncements.length} Feed Items</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredAnnouncements.map(ann => (
                <div key={ann.id} className="shadow-1" style={{
                  background: 'var(--surface-variant)', padding: '12px', borderRadius: '12px',
                  display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer'
                }} onClick={() => {
                  const companyObj = stockUniverse.find(s => s.ticker === ann.ticker);
                  if (companyObj) setActiveCompany(companyObj);
                  triggerToast(`Selected ${ann.ticker}`);
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '12px' }}>{ann.ticker}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ann.time}</span>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: '20px', fontSize: '9px', fontWeight: 'bold',
                      background: ann.score > 60 ? 'var(--success-bg)' : ann.score >= 40 ? 'var(--warning-bg)' : 'var(--error-bg)',
                      color: ann.score > 60 ? 'var(--success)' : ann.score >= 40 ? 'var(--warning)' : 'var(--error)'
                    }}>
                      {ann.bertSentiment} ({ann.score})
                    </span>
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700 }}>{ann.headline}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ann.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── FULL WIDTH CHART (780px CANVAS) ───── */}
        <section className="shadow-1" style={{
          background: 'var(--surface)', padding: '24px', borderRadius: '16px',
          marginBottom: '24px'
        }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Sentiment Trends</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NIFTY 50 and SENSEX sentiment profiles comparison</p>
            </div>
            
            {/* Control elements */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: 'var(--surface-variant)', padding: '4px', borderRadius: '20px' }}>
                {["nifty", "sensex"].map(series => (
                  <button
                    key={series}
                    onClick={() => setChartSeries(series)}
                    style={{
                      border: 'none', outline: 'none', cursor: 'pointer',
                      padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold',
                      background: chartSeries === series ? 'var(--primary)' : 'transparent',
                      color: chartSeries === series ? 'var(--background)' : 'var(--text-muted)'
                    }}
                  >
                    {series.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                {["1D", "1W", "1M", "1Y"].map(tf => (
                  <button
                    key={tf}
                    onClick={() => {
                      setTimeframe(tf);
                      triggerToast(`Switched to ${tf}`);
                    }}
                    style={{
                      border: 'none', outline: 'none', cursor: 'pointer',
                      padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold',
                      background: timeframe === tf ? 'var(--primary-container)' : 'transparent',
                      color: timeframe === tf ? 'var(--on-primary-container)' : 'var(--text-muted)'
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* SVG Canvas - 780px */}
          <div style={{ width: '100%', height: '240px', background: 'var(--surface-variant)', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
            <svg viewBox="0 0 780 200" width="100%" height="100%">
              {/* Grid Lines */}
              <g stroke="var(--chart-grid)" strokeWidth="1">
                {[0, 1, 2, 3, 4, 5, 6].map(i => (
                  <line key={`x-${i}`} x1={40 + i * 115} y1="10" x2={40 + i * 115} y2="170" />
                ))}
                {[0, 1, 2, 3, 4].map(i => (
                  <line key={`y-${i}`} x1="40" y1={10 + i * 40} x2="730" y2={10 + i * 40} />
                ))}
              </g>

              {/* Area Gradients */}
              <defs>
                <linearGradient id="gradient-nifty" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Sparkline Path */}
              <path
                d={`M 40,${170 - (marketChart[chartSeries][0].score * 1.5)} 
                   C 100,${170 - (marketChart[chartSeries][1].score * 1.5)} 210,${170 - (marketChart[chartSeries][2].score * 1.5)} 270,${170 - (marketChart[chartSeries][3].score * 1.5)}
                   C 380,${170 - (marketChart[chartSeries][4].score * 1.5)} 495,${170 - (marketChart[chartSeries][5].score * 1.5)} 610,${170 - (marketChart[chartSeries][6].score * 1.5)}
                   L 730,${170 - (marketChart[chartSeries][6].score * 1.5)}`}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Gradient Area Fill */}
              <path
                d={`M 40,170 
                   L 40,${170 - (marketChart[chartSeries][0].score * 1.5)} 
                   C 100,${170 - (marketChart[chartSeries][1].score * 1.5)} 210,${170 - (marketChart[chartSeries][2].score * 1.5)} 270,${170 - (marketChart[chartSeries][3].score * 1.5)}
                   C 380,${170 - (marketChart[chartSeries][4].score * 1.5)} 495,${170 - (marketChart[chartSeries][5].score * 1.5)} 610,${170 - (marketChart[chartSeries][6].score * 1.5)}
                   L 730,${170 - (marketChart[chartSeries][6].score * 1.5)} 
                   L 730,170 Z`}
                fill="url(#gradient-nifty)"
              />

              {/* Data points dots */}
              {marketChart[chartSeries].map((pt, i) => (
                <circle
                  key={i}
                  cx={40 + i * 115}
                  cy={170 - (pt.score * 1.5)}
                  r="5"
                  fill="var(--surface)"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  style={{ cursor: 'pointer' }}
                  onClick={() => triggerToast(`Time: ${pt.label} | Score: ${pt.score}`)}
                />
              ))}

              {/* Labels */}
              {marketChart[chartSeries].map((pt, i) => (
                <text
                  key={`lbl-${i}`}
                  x={40 + i * 115}
                  y="190"
                  fill="var(--text-muted)"
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {pt.label}
                </text>
              ))}

              {/* Score Y-axis Labels */}
              {[100, 50, 0].map((scoreVal, i) => (
                <text
                  key={`ylbl-${i}`}
                  x="28"
                  y={170 - (scoreVal * 1.5) + 4}
                  fill="var(--text-muted)"
                  fontSize="9"
                  textAnchor="end"
                  fontWeight="600"
                >
                  {scoreVal}
                </text>
              ))}
            </svg>
          </div>
        </section>

        {/* ───── TWO COLUMN GAINERS/LOSERS TABLES ───── */}
        <section style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'
        }}>
          
          {/* Top Positive Movers */}
          <div className="shadow-1" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--success)' }}>Top Bullish Sentiments</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ fontSize: '11px', color: 'var(--text-muted)', paddingBottom: '8px', fontWeight: 700 }}>TICKER</th>
                  <th style={{ fontSize: '11px', color: 'var(--text-muted)', paddingBottom: '8px', fontWeight: 700 }}>SECTOR</th>
                  <th style={{ fontSize: '11px', color: 'var(--text-muted)', paddingBottom: '8px', fontWeight: 700, textAlign: 'right' }}>SCORE</th>
                  <th style={{ fontSize: '11px', color: 'var(--text-muted)', paddingBottom: '8px', fontWeight: 700, textAlign: 'right' }}>CHANGE</th>
                </tr>
              </thead>
              <tbody>
                {gainers.map((stk, i) => (
                  <tr key={i} style={{ borderBottom: i === gainers.length - 1 ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setActiveCompany(stk)}>
                    <td style={{ padding: '12px 0', fontWeight: 800 }}>{stk.ticker}</td>
                    <td style={{ padding: '12px 0', fontSize: '12px', color: 'var(--text-muted)' }}>{stk.sector}</td>
                    <td className="tabular" style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>{stk.score}</td>
                    <td className="tabular" style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>+{stk.change}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Negative Movers */}
          <div className="shadow-1" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--error)' }}>Top Bearish Sentiments</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ fontSize: '11px', color: 'var(--text-muted)', paddingBottom: '8px', fontWeight: 700 }}>TICKER</th>
                  <th style={{ fontSize: '11px', color: 'var(--text-muted)', paddingBottom: '8px', fontWeight: 700 }}>SECTOR</th>
                  <th style={{ fontSize: '11px', color: 'var(--text-muted)', paddingBottom: '8px', fontWeight: 700, textAlign: 'right' }}>SCORE</th>
                  <th style={{ fontSize: '11px', color: 'var(--text-muted)', paddingBottom: '8px', fontWeight: 700, textAlign: 'right' }}>CHANGE</th>
                </tr>
              </thead>
              <tbody>
                {losers.map((stk, i) => (
                  <tr key={i} style={{ borderBottom: i === losers.length - 1 ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setActiveCompany(stk)}>
                    <td style={{ padding: '12px 0', fontWeight: 800 }}>{stk.ticker}</td>
                    <td style={{ padding: '12px 0', fontSize: '12px', color: 'var(--text-muted)' }}>{stk.sector}</td>
                    <td className="tabular" style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>{stk.score}</td>
                    <td className="tabular" style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--error)' }}>{stk.change}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
