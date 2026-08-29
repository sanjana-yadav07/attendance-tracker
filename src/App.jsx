import React, { useState, useEffect, useMemo } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const FULL_DAY = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };
const JS_DAY_TO_KEY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STORAGE_KEY = "attendance-tracker-v3";

const COLORS = {
  bg: "#14161B",
  surface1: "#1C1F26",
  surface2: "#242833",
  border: "#33384433",
  borderStrong: "#3E4552",
  text: "#ECE9E3",
  textMuted: "#8D93A1",
  textFaint: "#5D6472",
  accent: "#E5A94A",
  accentDim: "#E5A94A22",
  present: "#6FCB9B",
  presentDim: "#6FCB9B22",
  danger: "#E2677C",
  dangerDim: "#E2677C22",
};

const uid = () => Math.random().toString(36).slice(2, 10);
const pad2 = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayKey = () => dateKey(new Date());

function emptyData() {
  const template = {};
  DAYS.forEach((d) => (template[d] = []));
  const subjects = Array.from({ length: 6 }).map((_, i) => ({
    id: uid(),
    name: `Subject ${i + 1}`,
    todos: [],
  }));
  return { template, assignments: [], subjects, records: {} };
}

function FontStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      .att-app * { box-sizing: border-box; }
      .att-app input, .att-app select {
        background: ${COLORS.surface2};
        border: 1px solid ${COLORS.border};
        color: ${COLORS.text};
        font-family: 'Inter', sans-serif;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 13px;
        outline: none;
      }
      .att-app input::placeholder { color: ${COLORS.textFaint}; }
      .att-app input:focus, .att-app select:focus { border-color: ${COLORS.accent}; }
      .att-app button { font-family: 'Inter', sans-serif; cursor: pointer; }
      .att-checkbox {
        width: 20px; height: 20px; border-radius: 6px;
        border: 1.5px solid ${COLORS.borderStrong};
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; flex-shrink: 0; transition: all 0.15s ease;
        background: transparent;
      }
      .att-checkbox.checked { background: ${COLORS.present}; border-color: ${COLORS.present}; }
      .att-row:hover .att-del { opacity: 1; }
      .att-del { opacity: 0; transition: opacity 0.15s ease; }
      .att-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
      .att-scroll::-webkit-scrollbar-thumb { background: ${COLORS.borderStrong}; border-radius: 4px; }
      .att-bar-track { height: 6px; border-radius: 4px; background: ${COLORS.surface2}; overflow: hidden; }
      .att-bar-fill { height: 100%; border-radius: 4px; transition: width 0.25s ease; }
      .cal-cell { aspect-ratio: 1; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; border: 1px solid transparent; }
      .cal-cell:hover { border-color: ${COLORS.borderStrong}; }
      @media (max-width: 640px) {
        .att-navlabel { display: none; }
      }
    `}</style>
  );
}

function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke={COLORS.bg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTrash({ color = COLORS.textFaint }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPlus({ color = COLORS.bg }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function IconChevron({ dir = "left" }) {
  const d = dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d={d} stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Checkbox({ checked, onClick }) {
  return (
    <div className={`att-checkbox${checked ? " checked" : ""}`} onClick={onClick}>
      {checked && <IconCheck />}
    </div>
  );
}

function Highlight({ children }) {
  return (
    <span style={{ background: `linear-gradient(180deg, transparent 60%, ${COLORS.accentDim} 60%)`, padding: "0 2px" }}>
      {children}
    </span>
  );
}

function getEntriesForDate(data, key) {
  if (data.records[key]) return data.records[key].entries;
  const d = new Date(key + "T00:00:00");
  const dayKey = JS_DAY_TO_KEY[d.getDay()];
  if (!DAYS.includes(dayKey)) return [];
  const template = data.template[dayKey] || [];
  return template.map((t) => ({ id: uid(), templateId: t.id, time: t.time, subject: t.subject, attended: false }));
}

export default function App() {
  const [data, setData] = useState(emptyData());
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("overview");
  const [templateDay, setTemplateDay] = useState("Mon");
  const [selectedDate, setSelectedDate] = useState(todayKey());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = emptyData();
        if (parsed.template) DAYS.forEach((d) => (merged.template[d] = parsed.template[d] || []));
        if (Array.isArray(parsed.subjects) && parsed.subjects.length) merged.subjects = parsed.subjects;
        if (Array.isArray(parsed.assignments)) {
          merged.assignments = parsed.assignments.map((a) => {
            if (a.subjectId) return a;
            if (a.subject) {
              const match = merged.subjects.find((s) => s.name.trim().toLowerCase() === String(a.subject).trim().toLowerCase());
              return { ...a, subjectId: match ? match.id : null };
            }
            return { ...a, subjectId: null };
          });
        }
        if (parsed.records) merged.records = parsed.records;
        setData(merged);
      }
    } catch (e) {
      // fresh start
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("save failed", e);
    }
  }, [data, loaded]);

  const addTemplateClass = (day, time, subject) => {
    if (!subject.trim()) return;
    setData((d) => ({ ...d, template: { ...d.template, [day]: [...d.template[day], { id: uid(), time: time || "9:00 - 10:00", subject: subject.trim() }] } }));
  };
  const deleteTemplateClass = (day, id) => {
    setData((d) => ({ ...d, template: { ...d.template, [day]: d.template[day].filter((c) => c.id !== id) } }));
  };

  const ensureRecord = (d, key) => {
    if (d.records[key]) return d.records;
    return { ...d.records, [key]: { entries: getEntriesForDate(d, key) } };
  };
  const toggleEntry = (key, entryId) => {
    setData((d) => {
      const records = ensureRecord(d, key);
      const entries = records[key].entries.map((e) => (e.id === entryId ? { ...e, attended: !e.attended } : e));
      return { ...d, records: { ...records, [key]: { entries } } };
    });
  };
  const addEntry = (key, time, subject) => {
    if (!subject.trim()) return;
    setData((d) => {
      const records = ensureRecord(d, key);
      const entries = [...records[key].entries, { id: uid(), templateId: null, time: time || "9:00 - 10:00", subject: subject.trim(), attended: false }];
      return { ...d, records: { ...records, [key]: { entries } } };
    });
  };
  const deleteEntry = (key, entryId) => {
    setData((d) => {
      const records = ensureRecord(d, key);
      const entries = records[key].entries.filter((e) => e.id !== entryId);
      return { ...d, records: { ...records, [key]: { entries } } };
    });
  };

  const addAssignment = (title, subjectId, due) => {
    if (!title.trim()) return;
    setData((d) => ({ ...d, assignments: [...d.assignments, { id: uid(), title: title.trim(), subjectId, due, done: false }] }));
  };
  const toggleAssignment = (id) => {
    setData((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === id ? { ...a, done: !a.done } : a)) }));
  };
  const deleteAssignment = (id) => {
    setData((d) => ({ ...d, assignments: d.assignments.filter((a) => a.id !== id) }));
  };

  const renameSubject = (id, name) => {
    setData((d) => ({ ...d, subjects: d.subjects.map((s) => (s.id === id ? { ...s, name } : s)) }));
  };
  const addTodo = (subjectId, text) => {
    if (!text.trim()) return;
    setData((d) => ({ ...d, subjects: d.subjects.map((s) => (s.id === subjectId ? { ...s, todos: [...s.todos, { id: uid(), text: text.trim(), done: false }] } : s)) }));
  };
  const toggleTodo = (subjectId, todoId) => {
    setData((d) => ({ ...d, subjects: d.subjects.map((s) => (s.id === subjectId ? { ...s, todos: s.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)) } : s)) }));
  };
  const deleteTodo = (subjectId, todoId) => {
    setData((d) => ({ ...d, subjects: d.subjects.map((s) => (s.id === subjectId ? { ...s, todos: s.todos.filter((t) => t.id !== todoId) } : s)) }));
  };

  const allRecordedEntries = useMemo(() => Object.values(data.records).flatMap((r) => r.entries), [data.records]);
  const overallTotal = allRecordedEntries.length;
  const overallAttended = allRecordedEntries.filter((e) => e.attended).length;
  const overallPct = overallTotal ? Math.round((overallAttended / overallTotal) * 100) : 0;

  const pendingAssignments = data.assignments.filter((a) => !a.done).length;
  const totalTodos = data.subjects.reduce((s, sub) => s + sub.todos.length, 0);
  const doneTodos = data.subjects.reduce((s, sub) => s + sub.todos.filter((t) => t.done).length, 0);

  const subjectStats = data.subjects.map((s) => {
    const nameLower = s.name.trim().toLowerCase();
    const entries = allRecordedEntries.filter((e) => e.subject.trim().toLowerCase() === nameLower);
    const attended = entries.filter((e) => e.attended).length;
    const total = entries.length;
    const pct = total ? Math.round((attended / total) * 100) : null;
    const assignments = data.assignments.filter((a) => a.subjectId === s.id);
    const pendingA = assignments.filter((a) => !a.done).length;
    const doneA = assignments.filter((a) => a.done).length;
    return { subject: s, total, attended, pct, pendingA, doneA, totalA: assignments.length, todosDone: s.todos.filter((t) => t.done).length, todosTotal: s.todos.length };
  });

  const selectedEntries = data.records[selectedDate] ? data.records[selectedDate].entries : getEntriesForDate(data, selectedDate);

  return (
    <div className="att-app" style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: COLORS.text, padding: "0 0 60px" }}>
      <FontStyles />

      <div style={{ padding: "28px 20px 8px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 28, margin: 0, letterSpacing: "-0.01em" }}>
            <Highlight>Class tracker</Highlight>
          </h1>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>
            overall attendance <span style={{ color: overallPct >= 75 ? COLORS.present : COLORS.danger, fontWeight: 500 }}>{overallPct}%</span>
          </div>
        </div>
      </div>

      <div style={{ position: "sticky", top: 0, zIndex: 10, background: `${COLORS.bg}f2`, backdropFilter: "blur(6px)", borderBottom: `1px solid ${COLORS.border}`, marginTop: 12 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", gap: 4, padding: "0 20px", overflowX: "auto" }}>
          <NavTab active={tab === "overview"} onClick={() => setTab("overview")} label="Overview" />
          <NavTab active={tab === "calendar"} onClick={() => setTab("calendar")} label="Calendar" badge={`${overallAttended}/${overallTotal}`} />
          <NavTab active={tab === "template"} onClick={() => setTab("template")} label="Weekly setup" />
          <NavTab active={tab === "assignments"} onClick={() => setTab("assignments")} label="Assignments" badge={pendingAssignments ? String(pendingAssignments) : null} />
          <NavTab active={tab === "subjects"} onClick={() => setTab("subjects")} label="Subject todos" badge={`${doneTodos}/${totalTodos}`} />
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 0" }}>
        {tab === "overview" && (
          <OverviewTab
            overallPct={overallPct}
            overallAttended={overallAttended}
            overallTotal={overallTotal}
            pendingAssignments={pendingAssignments}
            totalAssignments={data.assignments.length}
            doneTodos={doneTodos}
            totalTodos={totalTodos}
            subjectStats={subjectStats}
          />
        )}
        {tab === "calendar" && (
          <CalendarTab
            data={data}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            entries={selectedEntries}
            onToggle={(id) => toggleEntry(selectedDate, id)}
            onAdd={(time, subject) => addEntry(selectedDate, time, subject)}
            onDelete={(id) => deleteEntry(selectedDate, id)}
          />
        )}
        {tab === "template" && (
          <TemplateTab
            days={DAYS}
            activeDay={templateDay}
            setActiveDay={setTemplateDay}
            classes={data.template[templateDay]}
            onAdd={(time, subject) => addTemplateClass(templateDay, time, subject)}
            onDelete={(id) => deleteTemplateClass(templateDay, id)}
          />
        )}
        {tab === "assignments" && (
          <AssignmentsTab subjects={data.subjects} assignments={data.assignments} onAdd={addAssignment} onToggle={toggleAssignment} onDelete={deleteAssignment} />
        )}
        {tab === "subjects" && (
          <SubjectsTab subjects={data.subjects} onRename={renameSubject} onAddTodo={addTodo} onToggleTodo={toggleTodo} onDeleteTodo={deleteTodo} />
        )}
      </div>
    </div>
  );
}

function NavTab({ active, onClick, label, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        padding: "14px 4px",
        marginRight: 22,
        color: active ? COLORS.text : COLORS.textMuted,
        fontSize: 14,
        fontWeight: 500,
        borderBottom: active ? `2px solid ${COLORS.accent}` : "2px solid transparent",
        display: "flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
        transition: "color 0.15s ease",
      }}
    >
      <span className="att-navlabel">{label}</span>
      {badge && (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, background: active ? COLORS.accentDim : COLORS.surface2, color: active ? COLORS.accent : COLORS.textFaint, padding: "1px 7px", borderRadius: 999 }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Card({ children, style }) {
  return <div style={{ background: COLORS.surface1, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 18px", ...style }}>{children}</div>;
}

function MetricCard({ label, value, sub }) {
  return (
    <div style={{ background: COLORS.surface1, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 24 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function StatBit({ label, value }) {
  return (
    <div>
      <div style={{ color: COLORS.textFaint, marginBottom: 2 }}>{label}</div>
      <div style={{ color: COLORS.text, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.textFaint, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>{children}</div>;
}

function OverviewTab({ overallPct, overallAttended, overallTotal, pendingAssignments, totalAssignments, doneTodos, totalTodos, subjectStats }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 24 }}>
        <MetricCard label="Overall attendance" value={`${overallPct}%`} sub={`${overallAttended}/${overallTotal} classes`} />
        <MetricCard label="Assignments pending" value={pendingAssignments} sub={`${totalAssignments} total`} />
        <MetricCard label="Todos done" value={`${doneTodos}/${totalTodos}`} sub="across all subjects" />
      </div>

      <SectionLabel>Subject-wise breakdown</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {subjectStats.map((s) => {
          const pctColor = s.pct === null ? COLORS.textFaint : s.pct >= 75 ? COLORS.present : COLORS.danger;
          return (
            <Card key={s.subject.id} style={{ borderLeft: `3px solid ${pctColor}`, borderRadius: "6px 14px 14px 6px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, margin: 0 }}><Highlight>{s.subject.name}</Highlight></h3>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 500, color: pctColor }}>{s.pct === null ? "no classes yet" : `${s.pct}%`}</span>
              </div>
              {s.total > 0 && (
                <div className="att-bar-track" style={{ marginBottom: 12 }}>
                  <div className="att-bar-fill" style={{ width: `${s.pct}%`, background: pctColor }} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, fontSize: 12.5 }}>
                <StatBit label="Classes" value={`${s.attended}/${s.total} attended`} />
                <StatBit label="Assignments" value={s.totalA ? `${s.doneA}/${s.totalA} done` : "none"} />
                <StatBit label="Todos" value={s.todosTotal ? `${s.todosDone}/${s.todosTotal} done` : "none"} />
              </div>
            </Card>
          );
        })}
      </div>
      <div style={{ color: COLORS.textFaint, fontSize: 12, marginTop: 14 }}>
        Tip: mark attendance from the Calendar tab, date by date. Assignments stay linked to their subject even if you rename it.
      </div>
    </div>
  );
}

function CalendarTab({ data, selectedDate, setSelectedDate, entries, onToggle, onAdd, onDelete }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(selectedDate + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [time, setTime] = useState("");
  const [subject, setSubject] = useState("");

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const pctForKey = (key) => {
    const rec = data.records[key];
    const list = rec ? rec.entries : getEntriesForDate(data, key);
    if (!list.length) return null;
    const att = list.filter((e) => e.attended).length;
    return { pct: Math.round((att / list.length) * 100), total: list.length, hasRecord: !!rec };
  };

  const changeMonth = (delta) => {
    let m = cursor.month + delta;
    let y = cursor.year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCursor({ year: y, month: m });
  };

  const submit = () => {
    onAdd(time, subject);
    setTime("");
    setSubject("");
  };

  const dayAttended = entries.filter((e) => e.attended).length;
  const selectedD = new Date(selectedDate + "T00:00:00");
  const selectedLabel = selectedD.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={() => changeMonth(-1)} style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconChevron dir="left" />
          </button>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, margin: 0 }}>{monthLabel}</h2>
          <button onClick={() => changeMonth(1)} style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconChevron dir="right" />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 11, color: COLORS.textFaint, fontFamily: "'IBM Plex Mono', monospace" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const key = `${cursor.year}-${pad2(cursor.month + 1)}-${pad2(day)}`;
            const isSelected = key === selectedDate;
            const isToday = key === todayKey();
            const info = pctForKey(key);
            let bg = "transparent";
            let textColor = COLORS.text;
            if (isSelected) { bg = COLORS.accent; textColor = "#2B1D08"; }
            else if (info && info.hasRecord) { bg = info.pct >= 75 ? COLORS.presentDim : COLORS.dangerDim; }
            return (
              <div key={i} className="cal-cell" onClick={() => setSelectedDate(key)} style={{ background: bg, border: isToday && !isSelected ? `1px solid ${COLORS.accent}` : undefined }}>
                <span style={{ fontSize: 13, color: textColor, fontWeight: isSelected || isToday ? 600 : 400 }}>{day}</span>
                {info && !isSelected && <span style={{ fontSize: 8, color: info.pct >= 75 ? COLORS.present : COLORS.danger, fontFamily: "'IBM Plex Mono', monospace" }}>{info.pct}%</span>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card style={{ borderLeft: `3px solid ${COLORS.accent}`, borderRadius: "6px 14px 14px 6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 6 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 18, margin: 0 }}><Highlight>{selectedLabel}</Highlight></h2>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>{dayAttended}/{entries.length} attended</span>
        </div>

        {entries.length === 0 && (
          <div style={{ color: COLORS.textFaint, fontSize: 13, padding: "8px 0 18px" }}>
            No classes on this date yet — set up your weekly schedule in "Weekly setup" so it auto-fills here, or add a one-off class below.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: entries.length ? 18 : 0 }}>
          {entries.map((e) => (
            <div key={e.id} className="att-row" style={{ display: "flex", alignItems: "center", gap: 12, background: e.attended ? COLORS.presentDim : COLORS.surface2, border: `1px solid ${e.attended ? COLORS.present + "55" : COLORS.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <Checkbox checked={e.attended} onClick={() => onToggle(e.id)} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted, minWidth: 96 }}>{e.time}</span>
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{e.subject}</span>
              <button className="att-del" onClick={() => onDelete(e.id)} style={{ background: "transparent", border: "none", padding: 4, display: "flex" }} aria-label="Remove">
                <IconTrash />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: entries.length ? 14 : 0, borderTop: entries.length ? `1px solid ${COLORS.border}` : "none" }}>
          <input placeholder="9:00 - 10:00" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: 130 }} />
          <input placeholder="Add a class for this date" value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ flex: 1, minWidth: 160 }} />
          <button onClick={submit} style={{ background: COLORS.accent, border: "none", borderRadius: 8, padding: "0 14px", display: "flex", alignItems: "center", gap: 6, color: "#2B1D08", fontSize: 13, fontWeight: 600 }}>
            <IconPlus /> Add
          </button>
        </div>
      </Card>
    </div>
  );
}

function TemplateTab({ days, activeDay, setActiveDay, classes, onAdd, onDelete }) {
  const [time, setTime] = useState("");
  const [subject, setSubject] = useState("");

  const submit = () => {
    onAdd(time, subject);
    setTime("");
    setSubject("");
  };

  return (
    <div>
      <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 16 }}>
        Set your regular Mon–Fri schedule once here — it'll auto-fill into the Calendar for every matching date, and you can still tweak any specific day there.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDay(d)}
            style={{ background: activeDay === d ? COLORS.accent : COLORS.surface2, color: activeDay === d ? "#2B1D08" : COLORS.textMuted, border: `1px solid ${activeDay === d ? COLORS.accent : COLORS.border}`, borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 500 }}
          >
            {d}
          </button>
        ))}
      </div>

      <Card style={{ borderLeft: `3px solid ${COLORS.accent}`, borderRadius: "6px 14px 14px 6px" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, margin: "0 0 16px" }}><Highlight>{FULL_DAY[activeDay]}</Highlight></h2>

        {classes.length === 0 && <div style={{ color: COLORS.textFaint, fontSize: 13, padding: "12px 0 20px" }}>No classes set for {FULL_DAY[activeDay]} yet.</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: classes.length ? 18 : 0 }}>
          {classes.map((c) => (
            <div key={c.id} className="att-row" style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted, minWidth: 96 }}>{c.time}</span>
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{c.subject}</span>
              <button className="att-del" onClick={() => onDelete(c.id)} style={{ background: "transparent", border: "none", padding: 4, display: "flex" }} aria-label="Delete">
                <IconTrash />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: classes.length ? 14 : 0, borderTop: classes.length ? `1px solid ${COLORS.border}` : "none" }}>
          <input placeholder="9:00 - 10:00" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: 130 }} />
          <input placeholder="Add a class, e.g. Data Structures" value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ flex: 1, minWidth: 160 }} />
          <button onClick={submit} style={{ background: COLORS.accent, border: "none", borderRadius: 8, padding: "0 14px", display: "flex", alignItems: "center", gap: 6, color: "#2B1D08", fontSize: 13, fontWeight: 600 }}>
            <IconPlus /> Add
          </button>
        </div>
      </Card>
    </div>
  );
}

function AssignmentsTab({ subjects, assignments, onAdd, onToggle, onDelete }) {
  const total = assignments.length;
  const pending = assignments.filter((a) => !a.done).length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 22 }}>
        <MetricCard label="Total assignments" value={total} />
        <MetricCard label="Pending" value={pending} />
        <MetricCard label="Done" value={total - pending} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, paddingBottom: 20 }}>
        {subjects.map((s) => (
          <SubjectAssignmentCard key={s.id} subject={s} assignments={assignments.filter((a) => a.subjectId === s.id)} onAdd={(title, due) => onAdd(title, s.id, due)} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function SubjectAssignmentCard({ subject, assignments, onAdd, onToggle, onDelete }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    onAdd(title, due);
    setTitle("");
    setDue("");
  };

  const pending = assignments.filter((a) => !a.done);
  const done = assignments.filter((a) => a.done);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, margin: 0 }}><Highlight>{subject.name}</Highlight></h3>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textFaint }}>{done.length}/{assignments.length}</span>
      </div>

      <div className="att-scroll" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
        {assignments.length === 0 && <div style={{ color: COLORS.textFaint, fontSize: 12.5 }}>No assignments yet.</div>}
        {pending.map((a) => <AssignmentRow key={a.id} a={a} onToggle={onToggle} onDelete={onDelete} />)}
        {done.map((a) => <AssignmentRow key={a.id} a={a} onToggle={onToggle} onDelete={onDelete} />)}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input placeholder="Add assignment" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ flex: 1, minWidth: 110 }} />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: 130 }} />
        <button onClick={submit} style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "0 12px", color: COLORS.accent, display: "flex", alignItems: "center" }} aria-label="Add assignment">
          <IconPlus color={COLORS.accent} />
        </button>
      </div>
    </Card>
  );
}

function AssignmentRow({ a, onToggle, onDelete }) {
  return (
    <div className="att-row" style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px" }}>
      <Checkbox checked={a.done} onClick={() => onToggle(a.id)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: a.done ? COLORS.textFaint : COLORS.text, textDecoration: a.done ? "line-through" : "none" }}>{a.title}</div>
        {a.due && <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1, fontFamily: "'IBM Plex Mono', monospace" }}>due {a.due}</div>}
      </div>
      <button className="att-del" onClick={() => onDelete(a.id)} style={{ background: "transparent", border: "none", padding: 4, display: "flex" }} aria-label="Delete assignment">
        <IconTrash />
      </button>
    </div>
  );
}

function SubjectsTab({ subjects, onRename, onAddTodo, onToggleTodo, onDeleteTodo }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, paddingBottom: 20 }}>
      {subjects.map((s) => (
        <SubjectCard key={s.id} subject={s} onRename={(name) => onRename(s.id, name)} onAddTodo={(text) => onAddTodo(s.id, text)} onToggleTodo={(tid) => onToggleTodo(s.id, tid)} onDeleteTodo={(tid) => onDeleteTodo(s.id, tid)} />
      ))}
    </div>
  );
}

function SubjectCard({ subject, onRename, onAddTodo, onToggleTodo, onDeleteTodo }) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(subject.name);
  const [text, setText] = useState("");

  const commitName = () => {
    onRename(nameVal.trim() || subject.name);
    setEditing(false);
  };
  const submitTodo = () => {
    onAddTodo(text);
    setText("");
  };

  const done = subject.todos.filter((t) => t.done).length;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {editing ? (
          <input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)} onBlur={commitName} onKeyDown={(e) => e.key === "Enter" && commitName()} style={{ flex: 1, fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15 }} />
        ) : (
          <h3 onClick={() => setEditing(true)} style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, margin: 0, cursor: "text", flex: 1 }} title="Click to rename">
            <Highlight>{subject.name}</Highlight>
          </h3>
        )}
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textFaint }}>{done}/{subject.todos.length}</span>
      </div>

      <div className="att-scroll" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
        {subject.todos.length === 0 && <div style={{ color: COLORS.textFaint, fontSize: 12.5 }}>No to-dos yet.</div>}
        {subject.todos.map((t) => (
          <div key={t.id} className="att-row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Checkbox checked={t.done} onClick={() => onToggleTodo(t.id)} />
            <span style={{ fontSize: 13, flex: 1, color: t.done ? COLORS.textFaint : COLORS.text, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
            <button className="att-del" onClick={() => onDeleteTodo(t.id)} style={{ background: "transparent", border: "none", padding: 2, display: "flex" }} aria-label="Delete todo">
              <IconTrash />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <input placeholder="Add a to-do" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitTodo()} style={{ flex: 1 }} />
        <button onClick={submitTodo} style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "0 12px", color: COLORS.accent, display: "flex", alignItems: "center" }} aria-label="Add todo">
          <IconPlus color={COLORS.accent} />
        </button>
      </div>
    </Card>
  );
}