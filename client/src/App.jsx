import React, { useState } from "react";
import { Search, AlertTriangle, CheckCircle2, RotateCcw, Copy, ChevronRight } from "lucide-react";

const FIELD_ORDER = [
  ["instrument", "Instrument"],
  ["timeframe", "Timeframe"],
  ["entry_condition", "Entry Condition"],
  ["exit_condition", "Exit Condition"],
  ["holding_period", "Holding Period"],
  ["test_period", "Test Period"],
];

const EXAMPLES = [
  "Does buying NIFTY after a 1% fall work better during high-volatility periods?",
  "Does buying NIFTY after a sharp fall work?",
  "Is there an edge in shorting BANKNIFTY after it gaps up more than 2%?",
];

export default function App() {
  // In production (Vercel), set VITE_API_URL to your deployed server's URL
  // (e.g. https://your-app.up.railway.app). Locally, this stays empty and
  // Vite's dev-server proxy in vite.config.js handles /api requests instead.
  const API_BASE = import.meta.env.VITE_API_URL || "";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | clarify | final | error
  const [experiment, setExperiment] = useState(null);
  const [missing, setMissing] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [errMsg, setErrMsg] = useState("");
  const [copied, setCopied] = useState(false);

  async function analyze(q) {
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/parse-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error("Request failed");
      const parsed = await res.json();
      setExperiment(parsed);
      const m = parsed.missing_required || [];
      setMissing(m);
      const initialDrafts = {};
      m.forEach((k) => {
        const note = parsed[k]?.note || "";
        const suggested = note.startsWith("Suggested:")
          ? note.replace("Suggested:", "").trim()
          : parsed[k]?.value || "";
        initialDrafts[k] = suggested;
      });
      setDrafts(initialDrafts);
      setStatus(m.length > 0 ? "clarify" : "final");
    } catch (e) {
      setErrMsg("Could not parse the question right now. Try rephrasing, or try again.");
      setStatus("error");
    }
  }

  function confirmAll() {
    const updated = { ...experiment };
    missing.forEach((k) => {
      updated[k] = { value: drafts[k], note: "Confirmed by user" };
    });
    setExperiment(updated);
    setMissing([]);
    setStatus("final");
  }

  function reset() {
    setQuery("");
    setExperiment(null);
    setMissing([]);
    setDrafts({});
    setStatus("idle");
  }

  function copyJson() {
    navigator.clipboard.writeText(JSON.stringify(experiment, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={styles.page}>
      <style>{`
        input:focus, textarea:focus { outline: none; }
        .field-row:hover { border-color: #3a4352; }
        .chip:hover { border-color: #d99a3d; color: #d99a3d; }
        .btn-primary:hover { background: #c98a30; }
        .btn-ghost:hover { border-color: #4a5362; }
      `}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerTop}>
            <span style={styles.dot} />
            <span style={styles.kicker}>AI TRADING RESEARCH ASSISTANT </span>
          </div>
          <h1 style={styles.h1}>Turn a trading question into a testable experiment.</h1>
          <p style={styles.sub}>
            Type a question the way you'd ask a colleague. The system extracts a structured
            experiment and asks for anything it can't safely infer.
          </p>
        </header>

        {status === "idle" && (
          <div style={styles.inputCard}>
            <div style={styles.inputRow}>
              <Search size={18} color="#6b7484" style={{ flexShrink: 0 }} />
              <textarea
                style={styles.textarea}
                rows={2}
                placeholder="e.g. Does buying NIFTY after a 1% fall work better during high-volatility periods?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && query.trim()) {
                    e.preventDefault();
                    analyze(query.trim());
                  }
                }}
              />
            </div>
            <div style={styles.inputFooter}>
              <div style={styles.chips}>
                {EXAMPLES.map((ex) => (
                  <button key={ex} className="chip" style={styles.chip} onClick={() => setQuery(ex)}>
                    {ex.length > 42 ? ex.slice(0, 42) + "…" : ex}
                  </button>
                ))}
              </div>
              <button
                className="btn-primary"
                style={{ ...styles.btnPrimary, opacity: query.trim() ? 1 : 0.4 }}
                disabled={!query.trim()}
                onClick={() => analyze(query.trim())}
              >
                Analyze <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div style={styles.loadingCard}>
            <div style={styles.spinner} />
            <span style={{ color: "#8b93a3", fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>
              Parsing question into experiment fields…
            </span>
          </div>
        )}

        {status === "error" && (
          <div style={styles.errorCard}>
            <AlertTriangle size={16} color="#e0864b" />
            <span style={{ color: "#e0864b", fontSize: 13.5 }}>{errMsg}</span>
            <button className="btn-ghost" style={styles.btnGhost} onClick={reset}>
              Try again
            </button>
          </div>
        )}

        {(status === "clarify" || status === "final") && experiment && (
          <div>
            <div style={styles.questionBar}>
              <span style={styles.questionLabel}>QUESTION</span>
              <span style={styles.questionText}>{query}</span>
            </div>

            <div style={styles.summaryBox}>{experiment.summary}</div>

            <div style={styles.expCard}>
              <div style={styles.expHeader}>
                <span>EXPERIMENT</span>
                {status === "final" && (
                  <span style={styles.readyBadge}>
                    <CheckCircle2 size={13} /> Ready
                  </span>
                )}
              </div>

              {FIELD_ORDER.map(([key, label]) => {
                const field = experiment[key] || {};
                const isMissing = missing.includes(key);
                return (
                  <div key={key} className="field-row" style={styles.fieldRow}>
                    <div style={styles.fieldLabel}>{label}</div>
                    {isMissing ? (
                      <div style={styles.fieldMissingWrap}>
                        <div style={styles.askNote}>
                          <AlertTriangle size={12} color="#d99a3d" style={{ marginRight: 5, flexShrink: 0 }} />
                          {field.note?.replace("Suggested:", "Suggested —") || "Needs clarification"}
                        </div>
                        <input
                          style={styles.draftInput}
                          value={drafts[key] || ""}
                          onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })}
                          placeholder={`Confirm ${label.toLowerCase()}…`}
                        />
                      </div>
                    ) : (
                      <div style={styles.fieldValue}>
                        {field.value || <span style={{ color: "#4a5362" }}>—</span>}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="field-row" style={styles.fieldRow}>
                <div style={styles.fieldLabel}>Filters</div>
                <div style={styles.fieldValue}>
                  {experiment.filters && experiment.filters.length > 0 ? (
                    experiment.filters.map((f) => (
                      <span key={f} style={styles.filterTag}>
                        {f}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "#4a5362" }}>None specified</span>
                  )}
                </div>
              </div>

              <div className="field-row" style={{ ...styles.fieldRow, borderBottom: "none" }}>
                <div style={styles.fieldLabel}>Question</div>
                <div style={styles.fieldValue}>{experiment.hypothesis_question}</div>
              </div>
            </div>

            <div style={styles.actionRow}>
              {status === "clarify" && (
                <button className="btn-primary" style={styles.btnPrimary} onClick={confirmAll}>
                  Confirm & finalize experiment <ChevronRight size={15} />
                </button>
              )}
              {status === "final" && (
                <button className="btn-ghost" style={styles.btnGhost} onClick={copyJson}>
                  <Copy size={13} /> {copied ? "Copied" : "Copy as JSON"}
                </button>
              )}
              <button className="btn-ghost" style={styles.btnGhost} onClick={reset}>
                <RotateCcw size={13} /> New question
              </button>
            </div>

            {status === "final" && (
              <div style={styles.futureNote}>
                Next step (not built here): this JSON is the exact shape a backtesting engine would
                consume — instrument, timeframe, entry, exit, holding period, test period, filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100%",
    background: "#0B0E11",
    fontFamily: "Inter, sans-serif",
    padding: "36px 20px",
    color: "#E8E6DE",
  },
  container: { maxWidth: 640, margin: "0 auto" },
  header: { marginBottom: 28 },
  headerTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 },
  dot: { width: 7, height: 7, borderRadius: "50%", background: "#d99a3d" },
  kicker: {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 11,
    letterSpacing: 1,
    color: "#8b93a3",
  },
  h1: { fontSize: 26, fontWeight: 600, lineHeight: 1.3, margin: "0 0 10px 0", color: "#F2F0EA" },
  sub: { fontSize: 14.5, color: "#8b93a3", lineHeight: 1.6, margin: 0, maxWidth: 540 },
  inputCard: {
    background: "#141920",
    border: "1px solid #262D38",
    borderRadius: 10,
    padding: 16,
  },
  inputRow: { display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 4px" },
  textarea: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#E8E6DE",
    fontFamily: "Inter, sans-serif",
    fontSize: 15,
    resize: "none",
    lineHeight: 1.5,
  },
  inputFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 12,
    borderTop: "1px solid #1e2530",
    gap: 12,
    flexWrap: "wrap",
  },
  chips: { display: "flex", gap: 8, flexWrap: "wrap" },
  chip: {
    background: "transparent",
    border: "1px solid #262D38",
    color: "#6b7484",
    fontSize: 11.5,
    padding: "5px 10px",
    borderRadius: 20,
    cursor: "pointer",
    fontFamily: "IBM Plex Mono, monospace",
  },
  btnPrimary: {
    background: "#d99a3d",
    color: "#141920",
    border: "none",
    borderRadius: 7,
    padding: "9px 16px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap",
  },
  btnGhost: {
    background: "transparent",
    border: "1px solid #262D38",
    color: "#8b93a3",
    borderRadius: 7,
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  loadingCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "20px 4px",
  },
  spinner: {
    width: 16,
    height: 16,
    border: "2px solid #262D38",
    borderTopColor: "#d99a3d",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 16px",
    background: "#1c1611",
    border: "1px solid #3a2a17",
    borderRadius: 8,
  },
  questionBar: {
    display: "flex",
    gap: 10,
    alignItems: "baseline",
    marginBottom: 14,
    flexWrap: "wrap",
  },
  questionLabel: {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 10.5,
    color: "#4a5362",
    letterSpacing: 1,
  },
  questionText: { fontSize: 14, color: "#8b93a3", fontStyle: "italic" },
  summaryBox: {
    fontSize: 15,
    color: "#E8E6DE",
    marginBottom: 18,
    lineHeight: 1.5,
    paddingLeft: 12,
    borderLeft: "2px solid #d99a3d",
  },
  expCard: {
    background: "#141920",
    border: "1px solid #262D38",
    borderRadius: 10,
    overflow: "hidden",
  },
  expHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 11,
    letterSpacing: 1,
    color: "#6b7484",
    background: "#10141b",
    borderBottom: "1px solid #262D38",
  },
  readyBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    color: "#6fcf97",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  fieldRow: {
    display: "grid",
    gridTemplateColumns: "150px 1fr",
    gap: 12,
    padding: "13px 16px",
    borderBottom: "1px solid #1a1f28",
    alignItems: "start",
  },
  fieldLabel: {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 12.5,
    color: "#6b7484",
    paddingTop: 2,
  },
  fieldValue: { fontSize: 14, color: "#E8E6DE", lineHeight: 1.5 },
  fieldMissingWrap: { display: "flex", flexDirection: "column", gap: 6 },
  askNote: {
    display: "flex",
    alignItems: "flex-start",
    fontSize: 12.5,
    color: "#d99a3d",
    lineHeight: 1.4,
  },
  draftInput: {
    background: "#0B0E11",
    border: "1px solid #3a3020",
    borderRadius: 6,
    padding: "7px 10px",
    color: "#E8E6DE",
    fontSize: 13.5,
    fontFamily: "Inter, sans-serif",
  },
  filterTag: {
    display: "inline-block",
    background: "#1a2620",
    color: "#6fcf97",
    fontSize: 12,
    padding: "3px 9px",
    borderRadius: 5,
    marginRight: 6,
    fontFamily: "IBM Plex Mono, monospace",
  },
  actionRow: { display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" },
  futureNote: {
    marginTop: 16,
    fontSize: 12.5,
    color: "#4a5362",
    lineHeight: 1.6,
    borderTop: "1px solid #1a1f28",
    paddingTop: 14,
  },
};
