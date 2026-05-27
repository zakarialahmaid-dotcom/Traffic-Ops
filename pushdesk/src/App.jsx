import { useState, useCallback, useMemo, useEffect } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/a/macros/jumia.com/s/AKfycbyT-1IR5BHuIjOMnJJUDws23l3-8YRdDcyfPpErq7a3TYc2I8yb0-F59tQcp2nrpg43/exec";

const ORANGE = "#F68B1E";

const PRIO_CFG = {
  "1":       { label: "P1",  bg: "#7f1d1d", text: "#fca5a5", border: "#dc2626" },
  "2":       { label: "P2",  bg: "#431407", text: "#fdba74", border: "#ea580c" },
  "3":       { label: "P3",  bg: "#1c1917", text: "#78716c", border: "#44403c" },
  "Cat Day": { label: "CAT", bg: "#2e1065", text: "#c4b5fd", border: "#7c3aed" },
};

const CAT_HUE = {
  "Appliances":             ORANGE,
  "TVs & Video":            "#3b82f6",
  "Computing":              "#10b981",
  "Gaming":                 "#a855f7",
  "Home":                   "#ec4899",
  "Beauty & Personal Care": "#eab308",
  "Fashion & Apparel":      "#ef4444",
  "Phones":                 "#06b6d4",
};
const catColor = (c) => CAT_HUE[c] || "#6b7280";

const TODAY = new Date();

function parseDate(s) {
  if (!s) return null;
  const d = new Date(String(s).replace(/-/g, "/"));
  return isNaN(d) ? null : d;
}

function parseRows(data2d) {
  return data2d
    .slice(3)
    .filter((r) => r[0] && /^\d+$/.test(String(r[0]).trim()))
    .map((r, i) => ({
      id: i,
      week:        parseInt(r[0]),
      startDate:   String(r[1]  || "").trim(),
      endDate:     String(r[2]  || "").trim(),
      kam:         String(r[3]  || "").trim(),
      category:    String(r[4]  || "").trim(),
      offerType:   String(r[5]  || "").trim(),
      push:        String(r[6]  || "").trim(),
      landing:     String(r[7]  || "").trim(),
      comment:     String(r[8]  || "").trim(),
      prio:        String(r[9]  || "").trim(),
      placement:   String(r[12] || "").trim(),
      link:        String(r[24] || "").trim(),
      cpDecision:  String(r[26] || "").trim(),
      mktDecision: String(r[27] || "").trim(),
      chSlider:    String(r[29] || "").trim(),
      chCRM:       String(r[31] || "").trim(),
      chSOME:      String(r[33] || "").trim(),
      chKOL:       String(r[37] || "").trim(),
    }));
}

function detectCurrentWeek(rows) {
  for (const r of rows) {
    const s = parseDate(r.startDate);
    const e = parseDate(r.endDate);
    if (s && e && TODAY >= s && TODAY <= e) return r.week;
  }
  return Math.max(...rows.map((r) => r.week));
}

const SLIDER_SLOTS = 3;
const PF_SLOTS     = 13;
const TOTAL_SLOTS  = SLIDER_SLOTS + PF_SLOTS;

const sel = {
  background: "#111", border: "1px solid #2a2a2a", color: "#888",
  padding: "5px 8px", borderRadius: 4, fontSize: 12, cursor: "pointer",
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [urlInput, setUrlInput]   = useState("");
  const [activeUrl, setActiveUrl] = useState(APPS_SCRIPT_URL);
  const [rows, setRows]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [lastSync, setLastSync]   = useState(null);
  const [week, setWeek]           = useState(null);
  const [tab, setTab]             = useState("week");
  const [pFilter, setPFilter]     = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [kamFilter, setKamFilter] = useState("all");
  const [slots, setSlots]         = useState(Array(TOTAL_SLOTS).fill(null));
  const [dragId, setDragId]       = useState(null);
  const [dragOver, setDragOver]   = useState(null);
  const [copied, setCopied]       = useState(false);

  const fetchData = useCallback(async (url) => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} — check your Apps Script deployment`);
      const json = await res.json();
      const data2d = json.data || json;
      const parsed = parseRows(data2d);
      if (!parsed.length) throw new Error("No data found — check the sheet tab name in Apps Script");
      setRows(parsed);
      setWeek(detectCurrentWeek(parsed));
      setSlots(Array(TOTAL_SLOTS).fill(null));
      setLastSync(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch if URL is set via env var
  useEffect(() => { if (APPS_SCRIPT_URL) fetchData(APPS_SCRIPT_URL); }, []);

  const handleConnect = () => {
    const url = urlInput.trim();
    if (!url) return;
    setActiveUrl(url);
    fetchData(url);
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const weeks    = useMemo(() => rows ? [...new Set(rows.map((r) => r.week))].sort((a, b) => a - b) : [], [rows]);
  const weekRows = useMemo(() => rows ? rows.filter((r) => r.week === week) : [], [rows, week]);
  const weekInfo = weekRows[0] || null;
  const cats     = useMemo(() => [...new Set(weekRows.map((r) => r.category))].filter(Boolean).sort(), [weekRows]);
  const kams     = useMemo(() => [...new Set(weekRows.map((r) => r.kam))].filter(Boolean).sort(), [weekRows]);

  const filtered = useMemo(() => weekRows.filter((r) => {
    if (pFilter  !== "all" && r.prio     !== pFilter)  return false;
    if (catFilter !== "all" && r.category !== catFilter) return false;
    if (kamFilter !== "all" && r.kam      !== kamFilter) return false;
    return true;
  }), [weekRows, pFilter, catFilter, kamFilter]);

  const assignedSet  = useMemo(() => new Set(slots.filter((s) => s !== null)), [slots]);
  const getRow       = (id) => rows?.find((r) => r.id === id);
  const filled       = slots.filter((s) => s !== null).length;

  const balanceMap = useMemo(() => {
    const m = {};
    slots.forEach((id) => {
      if (id === null) return;
      const r = getRow(id);
      if (r) m[r.category] = (m[r.category] || 0) + 1;
    });
    return m;
  }, [slots, rows]);

  const addToSlot  = (row) => {
    if (assignedSet.has(row.id)) return;
    const idx = slots.findIndex((s) => s === null);
    if (idx === -1) return;
    const n = [...slots]; n[idx] = row.id; setSlots(n);
  };
  const removeSlot = (idx) => { const n = [...slots]; n[idx] = null; setSlots(n); };

  const dropIntoSlot = (idx) => {
    if (dragId === null) return;
    const n = [...slots]; n[idx] = dragId; setSlots(n);
    setDragId(null); setDragOver(null);
  };

  const copySummary = () => {
    const lines = [`WEEK ${week} HOMEPAGE PLAN  —  ${weekInfo?.startDate} → ${weekInfo?.endDate}`, ""];
    lines.push("SLIDER");
    slots.slice(0, SLIDER_SLOTS).forEach((id, i) => {
      const r = id !== null ? getRow(id) : null;
      lines.push(`  Slider ${i + 1}: ${r ? `[P${r.prio}] ${r.push} (${r.category})` : "—"}`);
    });
    lines.push("", "PRODUCT FLOOR");
    slots.slice(SLIDER_SLOTS).forEach((id, i) => {
      const r = id !== null ? getRow(id) : null;
      lines.push(`  PF ${i + 1}: ${r ? `[P${r.prio}] ${r.push} (${r.category})` : "—"}`);
    });
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Setup screen (no URL configured) ───────────────────────────────────────
  if (!rows && !loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Logo size={38} mb={4} />
        <Sub>Weekly Push Command Center</Sub>

        <Step n={1} title="Add the Apps Script to your Google Sheet">
          <p style={hint}>Open your sheet → <b style={{ color: "#aaa" }}>Extensions → Apps Script</b> → paste the code below → click <b style={{ color: "#aaa" }}>Deploy → New deployment</b> (type: Web App, Execute as: Me, Who has access: Anyone within Jumia)</p>
          <Code>{`function doGet() {
  var ss = SpreadsheetApp.openById(
    "1_cR32Owor2_at23OvNnL9ETlPlJDbfKM7ispp9VvmWs"
  );
  // Gets the tab by GID 781126454
  var sheets = ss.getSheets();
  var sheet  = sheets.find(function(s) {
    return s.getSheetId() === 781126454;
  }) || ss.getActiveSheet();

  var data = sheet.getDataRange().getValues();
  return ContentService
    .createTextOutput(JSON.stringify({ data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}`}</Code>
          <p style={{ ...hint, marginTop: 8 }}>After deploying, copy the <b style={{ color: "#aaa" }}>Web App URL</b> that looks like <code style={{ color: "#666" }}>https://script.google.com/macros/s/AKfy…/exec</code></p>
        </Step>

        <Step n={2} title="Connect the app">
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              placeholder="https://script.google.com/macros/s/AKfy.../exec"
              style={{ flex: 1, background: "#0d0d0d", border: "1px solid #2a2a2a", color: "#f0f0f0", padding: "9px 12px", borderRadius: 4, fontFamily: "monospace", fontSize: 12, outline: "none" }}
            />
            <button
              onClick={handleConnect}
              disabled={!urlInput.trim()}
              style={{ padding: "9px 20px", background: ORANGE, border: "none", color: "#000", borderRadius: 4, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: urlInput.trim() ? 1 : 0.4 }}
            >
              Connect →
            </button>
          </div>
          {error && <ErrorBanner msg={error} onClose={() => setError(null)} />}
          <p style={{ ...hint, marginTop: 8 }}>For the permanent Vercel deploy, set <code style={{ color: "#666" }}>VITE_APPS_SCRIPT_URL</code> as an environment variable — this setup screen won't appear.</p>
        </Step>
      </div>
    );
  }

  // ── Loading splash ──────────────────────────────────────────────────────────
  if (loading && !rows) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Logo size={28} mb={0} />
        <p style={{ fontFamily: "monospace", fontSize: 12, color: "#444" }}>Fetching sheet data…</p>
      </div>
    );
  }

  // ── Main app ────────────────────────────────────────────────────────────────
  const p1     = weekRows.filter((r) => r.prio === "1").length;
  const p2     = weekRows.filter((r) => r.prio === "2").length;
  const p3     = weekRows.filter((r) => r.prio === "3").length;
  const catDay = weekRows.filter((r) => r.prio === "Cat Day").length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f5f5f5", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: "#0f0f0f", borderBottom: "1px solid #1f1f1f", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 20 }}>
        <Logo size={18} mb={0} inline />
        <span style={{ color: "#222" }}>|</span>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: ORANGE, fontWeight: 700 }}>W{week}</span>
        {weekInfo && <span style={{ fontFamily: "monospace", fontSize: 11, color: "#444" }}>{weekInfo.startDate} → {weekInfo.endDate}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {lastSync && <span style={{ fontFamily: "monospace", fontSize: 10, color: "#2a2a2a" }}>synced {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          <button
            onClick={() => fetchData(activeUrl)}
            disabled={loading}
            style={{ padding: "5px 12px", background: "transparent", border: "1px solid #2a2a2a", color: loading ? "#333" : "#666", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
          >
            {loading ? "Syncing…" : "↻ Refresh"}
          </button>
          <select value={week} onChange={(e) => { setWeek(+e.target.value); setSlots(Array(TOTAL_SLOTS).fill(null)); }} style={sel}>
            {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
          </select>
        </div>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError(null)} />}

      {/* ── Stats bar ── */}
      <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a", background: "#0d0d0d", flexWrap: "wrap" }}>
        {[
          { label: "proposals", value: weekRows.length, color: "#f5f5f5" },
          { label: "prio 1",    value: p1,              color: "#ef4444"  },
          { label: "prio 2",    value: p2,              color: ORANGE     },
          { label: "prio 3",    value: p3,              color: "#555"     },
          ...(catDay > 0 ? [{ label: "cat day", value: catDay, color: "#a855f7" }] : []),
          { label: "categories", value: cats.length, color: "#f5f5f5" },
          { label: "kams",       value: kams.length, color: "#f5f5f5" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "10px 20px", borderRight: "1px solid #1a1a1a" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1, fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#444", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a", background: "#0d0d0d", padding: "0 20px" }}>
        {[["week", "This week"], ["planner", "Homepage planner"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: "11px 16px", background: "none", border: "none", borderBottom: `2px solid ${tab === key ? ORANGE : "transparent"}`, color: tab === key ? "#f5f5f5" : "#555", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 20px" }}>

        {/* ── This Week ── */}
        {tab === "week" && (
          <>
            {/* Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, alignItems: "center" }}>
              {["all", "1", "2", "3", "Cat Day"].map((p) => {
                const cfg    = PRIO_CFG[p];
                const active = pFilter === p;
                return (
                  <button key={p} onClick={() => setPFilter(p)} style={{ padding: "4px 12px", borderRadius: 4, border: `1px solid ${active && cfg ? cfg.border : active ? ORANGE : "#2a2a2a"}`, background: active && cfg ? cfg.bg : active ? "#2a1500" : "#111", color: active && cfg ? cfg.text : active ? ORANGE : "#555", cursor: "pointer", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>
                    {p === "all" ? "ALL" : cfg?.label}
                  </button>
                );
              })}
              <span style={{ width: 1, height: 18, background: "#222", margin: "0 4px" }} />
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={sel}>
                <option value="all">All categories</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={kamFilter} onChange={(e) => setKamFilter(e.target.value)} style={sel}>
                <option value="all">All KAMs</option>
                {kams.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 11, color: "#333" }}>{filtered.length} / {weekRows.length}</span>
            </div>

            {/* Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {filtered.length === 0 && <div style={{ color: "#333", textAlign: "center", padding: 40, fontFamily: "monospace" }}>No results</div>}
              {filtered.map((r) => (
                <PushCard key={r.id} row={r} assigned={assignedSet.has(r.id)} onAssign={() => addToSlot(r)} onDragStart={() => setDragId(r.id)} />
              ))}
            </div>
          </>
        )}

        {/* ── Homepage Planner ── */}
        {tab === "planner" && (
          <div style={{ display: "flex", gap: 16 }}>

            {/* Pool */}
            <div style={{ width: 280, minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#444", letterSpacing: 1.5, textTransform: "uppercase" }}>Proposals — drag or click +</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {["all", "1", "2", "3", "Cat Day"].map((p) => {
                  const cfg = PRIO_CFG[p]; const active = pFilter === p;
                  return <button key={p} onClick={() => setPFilter(p)} style={{ padding: "3px 8px", borderRadius: 3, border: `1px solid ${active && cfg ? cfg.border : active ? ORANGE : "#222"}`, background: active && cfg ? cfg.bg : active ? "#2a1500" : "#111", color: active && cfg ? cfg.text : active ? ORANGE : "#555", cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{p === "all" ? "ALL" : cfg?.label}</button>;
                })}
              </div>
              <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 240px)", display: "flex", flexDirection: "column", gap: 4 }}>
                {filtered.map((r) => (
                  <div key={r.id} draggable onDragStart={() => setDragId(r.id)} onClick={() => addToSlot(r)} style={{ background: "#111", border: "1px solid #1e1e1e", borderLeft: `3px solid ${catColor(r.category)}`, borderRadius: 4, padding: "7px 9px", cursor: assignedSet.has(r.id) ? "default" : "grab", opacity: assignedSet.has(r.id) ? 0.35 : 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <PrioBadge prio={r.prio} />
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: catColor(r.category), textTransform: "uppercase", flex: 1 }}>{r.category}</span>
                      {assignedSet.has(r.id) ? <span style={{ fontSize: 9, color: "#10b981", fontFamily: "monospace" }}>✓</span> : <span style={{ color: "#444", fontSize: 12 }}>+</span>}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", lineHeight: 1.2 }}>{r.push || "—"}</div>
                    {r.offerType && <div style={{ fontSize: 10, color: "#444" }}>{r.offerType}{r.placement ? ` · ${r.placement}` : ""}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Slot grid */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: "#444", letterSpacing: 1.5, textTransform: "uppercase" }}>Homepage layout — {filled}/{TOTAL_SLOTS} filled</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={copySummary} style={{ padding: "6px 14px", background: copied ? "#10b981" : ORANGE, border: "none", color: "#000", borderRadius: 4, fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "background 0.2s" }}>{copied ? "✓ Copied!" : "Copy summary"}</button>
                  <button onClick={() => setSlots(Array(TOTAL_SLOTS).fill(null))} style={{ padding: "6px 14px", background: "transparent", border: "1px solid #2a2a2a", color: "#555", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>Clear all</button>
                </div>
              </div>

              {/* Category balance */}
              {Object.keys(balanceMap).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px", background: "#111", borderRadius: 6, border: "1px solid #1e1e1e", marginBottom: 14 }}>
                  {Object.entries(balanceMap).map(([cat, count]) => (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", background: "#1a1a1a", borderRadius: 3 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: catColor(cat), display: "inline-block" }} />
                      <span style={{ fontSize: 11, color: "#aaa" }}>{cat}</span>
                      <span style={{ fontSize: 11, color: ORANGE, fontFamily: "monospace", fontWeight: 700 }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Slider */}
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Slider</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {slots.slice(0, SLIDER_SLOTS).map((id, i) => (
                    <SlotCard key={i} label={`Slider ${i + 1}`} row={id !== null ? getRow(id) : null} onRemove={() => removeSlot(i)} highlighted={dragOver === i}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(i); }} onDragLeave={() => setDragOver(null)} onDrop={() => dropIntoSlot(i)} />
                  ))}
                </div>
              </div>

              {/* Product Floor */}
              <div>
                <SectionLabel>Product floor</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {slots.slice(SLIDER_SLOTS).map((id, i) => (
                    <SlotCard key={i + SLIDER_SLOTS} label={`PF ${i + 1}`} row={id !== null ? getRow(id) : null} onRemove={() => removeSlot(i + SLIDER_SLOTS)} highlighted={dragOver === i + SLIDER_SLOTS} small
                      onDragOver={(e) => { e.preventDefault(); setDragOver(i + SLIDER_SLOTS); }} onDragLeave={() => setDragOver(null)} onDrop={() => dropIntoSlot(i + SLIDER_SLOTS)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Logo({ size, mb, inline }) {
  return (
    <span style={{ fontWeight: 800, fontSize: size, letterSpacing: inline ? 2 : 5, color: "#f5f5f5", marginBottom: mb, display: "block" }}>
      PUSH<span style={{ color: ORANGE }}>DESK</span>
    </span>
  );
}

function Sub({ children }) {
  return <p style={{ fontFamily: "monospace", fontSize: 11, color: "#333", letterSpacing: 3, textTransform: "uppercase", marginBottom: 40 }}>{children}</p>;
}

function Step({ n, title, children }) {
  return (
    <div style={{ width: "100%", maxWidth: 560, background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "20px 24px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 24, height: 24, borderRadius: "50%", background: ORANGE, color: "#000", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

const hint = { margin: "0 0 10px", fontSize: 12, color: "#555", lineHeight: 1.7 };

function Code({ children }) {
  return (
    <pre style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 5, padding: "12px 14px", fontFamily: "monospace", fontSize: 11, color: "#10b981", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
      {children}
    </pre>
  );
}

function ErrorBanner({ msg, onClose }) {
  return (
    <div style={{ background: "#7f1d1d20", borderBottom: "1px solid #dc262640", padding: "8px 20px", fontFamily: "monospace", fontSize: 11, color: "#fca5a5", display: "flex", alignItems: "center", gap: 8 }}>
      <span>⚠ {msg}</span>
      <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 14 }}>✕</button>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontFamily: "monospace", fontSize: 10, color: "#333", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
}

function PushCard({ row, assigned, onAssign, onDragStart }) {
  const cc       = catColor(row.category);
  const channels = [row.chSlider && "Slider", row.chCRM && "CRM", row.chSOME && "SOME", row.chKOL && "KOL"].filter(Boolean);
  return (
    <div draggable onDragStart={onDragStart} style={{ background: "#111", border: "1px solid #1e1e1e", borderLeft: `4px solid ${cc}`, borderRadius: 5, padding: "9px 12px", display: "flex", flexDirection: "column", gap: 5, opacity: assigned ? 0.5 : 1, cursor: "grab" }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <PrioBadge prio={row.prio} />
        <span style={{ fontFamily: "monospace", fontSize: 9, color: cc, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{row.category}</span>
        {row.offerType && <span style={{ fontSize: 10, color: "#555", background: "#1a1a1a", padding: "2px 6px", borderRadius: 3 }}>{row.offerType}</span>}
        {row.placement && <span style={{ fontFamily: "monospace", fontSize: 9, color: "#3b82f6", background: "#1e293b", padding: "2px 5px", borderRadius: 3 }}>{row.placement}</span>}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
          {channels.map((ch) => <ChBadge key={ch} label={ch} />)}
          {assigned
            ? <span style={{ fontFamily: "monospace", fontSize: 9, color: "#10b981" }}>✓ Planned</span>
            : <button onClick={(e) => { e.stopPropagation(); onAssign(); }} style={{ width: 20, height: 20, borderRadius: "50%", background: ORANGE, border: "none", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>}
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f0f0", lineHeight: 1.25 }}>{row.push || "—"}</div>
      {row.comment && <div style={{ fontSize: 11, color: "#555", fontStyle: "italic" }}>{row.comment}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: "#333" }}>{row.kam}</span>
        {row.cpDecision  && <span style={{ fontFamily: "monospace", fontSize: 9, color: "#10b981", background: "#10b98110", padding: "1px 5px", borderRadius: 3 }}>CP: {row.cpDecision}</span>}
        {row.mktDecision && <span style={{ fontFamily: "monospace", fontSize: 9, color: "#a855f7", background: "#a855f710", padding: "1px 5px", borderRadius: 3 }}>MKT: {row.mktDecision}</span>}
        {row.link && <a href={row.link} target="_blank" rel="noreferrer" style={{ fontFamily: "monospace", fontSize: 9, color: ORANGE, textDecoration: "none" }}>↗ Landing</a>}
      </div>
    </div>
  );
}

const CH_COLOR = { Slider: "#3b82f6", CRM: "#10b981", SOME: "#eab308", KOL: "#ec4899" };
function ChBadge({ label }) {
  const c = CH_COLOR[label] || "#555";
  return <span style={{ fontSize: 9, fontFamily: "monospace", padding: "2px 5px", borderRadius: 2, background: c + "18", color: c, border: `1px solid ${c}30` }}>{label}</span>;
}

function PrioBadge({ prio }) {
  const cfg = PRIO_CFG[prio] || PRIO_CFG["3"];
  return <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}50`, letterSpacing: 1 }}>{cfg.label}</span>;
}

function SlotCard({ label, row, onRemove, highlighted, small, onDragOver, onDragLeave, onDrop }) {
  const cc = row ? catColor(row.category) : null;
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} style={{ background: highlighted ? "#F68B1E08" : row ? "#141414" : "#0d0d0d", border: `1px dashed ${highlighted ? ORANGE : row ? cc + "50" : "#1e1e1e"}`, borderRadius: 5, padding: small ? 8 : 10, minHeight: small ? 68 : 88, display: "flex", flexDirection: "column", gap: 3, position: "relative", transition: "all 0.15s" }}>
      <div style={{ fontFamily: "monospace", fontSize: 9, color: "#2a2a2a", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      {row ? (
        <>
          <PrioBadge prio={row.prio} />
          <div style={{ fontSize: 12, fontWeight: 600, color: cc, lineHeight: 1.2, marginTop: 2 }}>{row.push}</div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: "#444" }}>{row.category}</div>
          <button onClick={onRemove} style={{ position: "absolute", top: 5, right: 6, background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 11, padding: 2 }}>✕</button>
        </>
      ) : (
        <div style={{ color: "#1e1e1e", fontFamily: "monospace", fontSize: 10, textAlign: "center", margin: "auto 0" }}>Drop here</div>
      )}
    </div>
  );
}
