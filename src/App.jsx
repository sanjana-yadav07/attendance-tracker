import React, { useState, useEffect } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const FULL_DAY = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };
const WEEKDAY_INDEX_TO_KEY = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" }; // JS getDay(): 0=Sun
const STORAGE_KEY = "attendance-tracker-v2";

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

// local YYYY-MM-DD (avoids UTC offset issues from toISOString)
function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function todayKey() {
  return toDateKey(new Date());
}

function emptyData() {
  const timetable = {};
  DAYS.forEach((d) => (timetable[d] = []));
  const subjects = Array.from({ length: 6 }).map((_, i) => ({
    id: uid(),
    name: `Subject ${i + 1}`,
    todos: [],
  }));
  return { timetable, assignments: [], subjects, calendarLog: {} };
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
      .att-cal-cell {
        aspect-ratio: 1;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px;
        font-size: 12.5px;
        cursor: pointer;
        border: 1px solid transparent;
        position: relative;
      }
      .att-cal-cell:hover { border-color: ${COLORS.borderStrong}; }
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
function IconChevronLeft({ color = COLORS.textMuted }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconChevronRight({ color = COLORS.textMuted }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
    <span
      style={{
        background: `linear-gradient(180deg, transparent 60%, ${COLORS.accentDim} 60%)`,
        padding: "0 2px",
      }}
    >
      {children}
    </span>
  );
}

export default function App() {
  const [data, setData] = useState(emptyData());
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("overview");
  const [activeDay, setActiveDay] = useState("Mon");
  const [selectedDate, setSelectedDate] = useState(todayKey());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = emptyData();
        if (parsed.timetable) DAYS.forEach((d) => (merged.timetable[d] = parsed.timetable[d] || []));
        if (Array.isArray(parsed.assignments)) {
          const subjList = Array.isArray(parsed.subjects) && parsed.subjects.length ? parsed.subjects : merged.subjects;
          merged.assignments = parsed.assignments.map((a) => {
            if (a.subjectId) return a;
            if (a.subject) {
              const match = subjList.find((s) => s.name.trim().toLowerCase() === String(a.subject).trim().toLowerCase());
              return { ...a, subjectId: match ? match.id : null };
            }
            return { ...a, subjectId: null };
          });
        }
        if (Array.isArray(parsed.subjects) && parsed.subjects.length) merged.subjects = parsed.subjects;
        if (parsed.calendarLog && typeof parsed.calendarLog === "object") merged.calendarLog = parsed.calendarLog;
        setData(merged);
      }
    } catch (e) {
      // nothing saved yet
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

  // ---- timetable ops ----
  const addClass = (day, time, subject) => {
    if (!subject.trim()) return;
    setData((d) => ({
      ...d,
      timetable: {
        ...d.timetable,
        [day]: [...d.timetable[day], { id: uid(), time: time || "9:00 - 10:00", subject: subject.trim(), attended: false }],
      },
    }));
  };
  const toggleClass = (day, id) => {
    setData((d) => ({
      ...d,
      timetable: {
        ...d.timetable,
        [day]: d.timetable[day].map((c) => (c.id === id ? { ...c, attended: !c.attended } : c)),
      },
    }));
  };
  const deleteClass = (day, id) => {
    setData((d) => ({
      ...d,
      timetable: { ...d.timetable, [day]: d.timetable[day].filter((c) => c.id !== id) },
    }));
  };

  // ---- calendar ops (per-date overrides, independent of the weekly toggle) ----
  const toggleCalendarClass = (dateKey, classId) => {
    setData((d) => {
      const dayLog = { ...(d.calendarLog[dateKey] || {}) };
      dayLog[classId] = !dayLog[classId];
      return { ...d, calendarLog: { ...d.calendarLog, [dateKey]: dayLog } };
    });
  };

  // ---- assignment ops ----
  const addAssignment = (title, subjectId, due) => {
    if (!title.trim()) return;
    setData((d) => ({
      ...d,
      assignments: [...d.assignments, { id: uid(), title: title.trim(), subjectId, due, done: false }],
    }));
  };
  const toggleAssignment = (id) => {
    setData((d) => ({
      ...d,
      assignments: d.assignments.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
    }));
  };
  const deleteAssignment = (id) => {
    setData((d) => ({ ...d, assignments: d.assignments.filter((a) => a.id !== id) }));
  };

  // ---- subject todo ops ----
  const renameSubject = (id, name) => {
    setData((d) => ({ ...d, subjects: d.subjects.map((s) => (s.id === id ? { ...s, name } : s)) }));
  };
  const addTodo = (subjectId, text) => {
    if (!text.trim()) return;
    setData((d) => ({
      ...d,
      subjects: d.subjects.map((s) =>
        s.id === subjectId ? { ...s, todos: [...s.todos, { id: uid(), text: text.trim(), done: false }] } : s
      ),
    }));
  };
  const toggleTodo = (subjectId, todoId) => {
    setData((d) => ({
      ...d,
      subjects: d.subjects.map((s) =>
        s.id === subjectId
          ? { ...s, todos: s.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)) }
          : s
      ),
    }));
  };
  const deleteTodo = (subjectId, todoId) => {
    setData((d) => ({
      ...d,
      subjects: d.subjects.map((s) =>
        s.id === subjectId ? { ...s, todos: s.todos.filter((t) => t.id !== todoId) } : s
      ),
    }));
  };

  const dayClasses = data.timetable[activeDay] || [];
  const dayTotal = dayClasses.length;
  const dayAttended = dayClasses.filter((c) => c.attended).length;

  const allClasses = DAYS.flatMap((d) => data.timetable[d]);
  const overallTotal = allClasses.length;
  const overallAttended = allClasses.filter((c) => c.attended).length;
  const overallPct = overallTotal ? Math.round((overallAttended / overallTotal) * 100) : 0;

  const pendingAssignments = data.assignments.filter((a) => !a.done).length;
  const totalTodos = data.subjects.reduce((s, sub) => s + sub.todos.length, 0);
  const doneTodos = data.subjects.reduce((s, sub) => s + sub.todos.filter((t) => t.done).length, 0);

  const subjectStats = data.subjects.map((s) => {
    const nameLower = s.name.trim().toLowerCase();
    const classes = allClasses.filter((c) => c.subject.trim().toLowerCase() === nameLower);
    const attended = classes.filter((c) => c.attended).length;
    const total = classes.length;
    const pct = total ? Math.round((attended / total) * 100) : null;
    const assignments = data.assignments.filter((a) => a.subjectId === s.id);
    const pendingA = assignments.filter((a) => !a.done).length;
    const doneA = assignments.filter((a) => a.done).length;
    const todosDone = s.todos.filter((t) => t.done).length;
    return { subject: s, total, attended, pct, pendingA, doneA, totalA: assignments.length, todosDone, todosTotal: s.todos.length };
  });

  return (
    <div
      className="att-app"
      style={{
        background: COLORS.bg,
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
        color: COLORS.text,
        padding: "0 0 60px",
      }}
    >
      <FontStyles />

      <div style={{ padding: "28px 20px 8px", maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 28, margin: 0, letterSpacing: "-0.01em" }}>
            <Highlight>Class tracker</Highlight>
          </h1>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>
            overall attendance <span style={{ color: overallPct >= 75 ? COLORS.present : COLORS.danger, fontWeight: 500 }}>{overallPct}%</span>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: `${COLORS.bg}f2`,
          backdropFilter: "blur(6px)",
          borderBottom: `1px solid ${COLORS.border}`,
          marginTop: 12,
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", gap: 4, padding: "0 20px", overflowX: "auto" }}>
          <NavTab active={tab === "overview"} onClick={() => setTab("overview")} label="Overview" />
          <NavTab active={tab === "timetable"} onClick={() => setTab("timetable")} label="Timetable" badge={`${overallAttended}/${overallTotal}`} />
          <NavTab active={tab === "calendar"} onClick={() => setTab("calendar")} label="Calendar" />
          <NavTab active={tab === "assignments"} onClick={() => setTab("assignments")} label="Assignments" badge={pendingAssignments ? String(pendingAssignments) : null} />
          <NavTab active={tab === "subjects"} onClick={() => setTab("subjects")} label="Subject todos" badge={`${doneTodos}/${totalTodos}`} />
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 0" }}>
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
        {tab === "timetable" && (
          <TimetableTab
            days={DAYS}
            activeDay={activeDay}
            setActiveDay={setActiveDay}
            classes={dayClasses}
            dayTotal={dayTotal}
            dayAttended={dayAttended}
            onAdd={(time, subject) => addClass(activeDay, time, subject)}
            onToggle={(id) => toggleClass(activeDay, id)}
            onDelete={(id) => deleteClass(activeDay, id)}
          />
        )}
        {tab === "calendar" && (
          <CalendarTab
            timetable={data.timetable}
            calendarLog={data.calendarLog}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onToggleClass={toggleCalendarClass}
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
        marginRight: 24,
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
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            background: active ? COLORS.accentDim : COLORS.surface2,
            color: active ? COLORS.accent : COLORS.textFaint,
            padding: "1px 7px",
            borderRadius: 999,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: COLORS.surface1, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 18px", ...style }}>
      {children}
    </div>
  );
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
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 500, color: pctColor }}>
                  {s.pct === null ? "no classes yet" : `${s.pct}%`}
                </span>
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
        Tip: assignments are linked directly to their subject card, so renaming a subject in Subject todos keeps its assignments attached. Classes in Timetable still match by subject name — type it exactly as the subject card is named for it to count here.
      </div>
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

function TimetableTab({ days, activeDay, setActiveDay, classes, dayTotal, dayAttended, onAdd, onToggle, onDelete }) {
  const [time, setTime] = useState("");
  const [subject, setSubject] = useState("");

  const submit = () => {
    onAdd(time, subject);
    setTime("");
    setSubject("");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDay(d)}
            style={{
              background: activeDay === d ? COLORS.accent : COLORS.surface2,
              color: activeDay === d ? "#2B1D08" : COLORS.textMuted,
              border: `1px solid ${activeDay === d ? COLORS.accent : COLORS.border}`,
              borderRadius: 10,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {d}
          </button>
        ))}
      </div>

      <Card style={{ borderLeft: `3px solid ${COLORS.accent}`, borderRadius: "6px 14px 14px 6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, margin: 0 }}><Highlight>{FULL_DAY[activeDay]}</Highlight></h2>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>{dayAttended}/{dayTotal} attended</span>
        </div>

        {classes.length === 0 && (
          <div style={{ color: COLORS.textFaint, fontSize: 13, padding: "12px 0 20px" }}>
            No classes added for {FULL_DAY[activeDay]} yet. Add your 9–5 schedule below.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: classes.length ? 18 : 0 }}>
          {classes.map((c) => (
            <div
              key={c.id}
              className="att-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: c.attended ? COLORS.presentDim : COLORS.surface2,
                border: `1px solid ${c.attended ? COLORS.present + "55" : COLORS.border}`,
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <Checkbox checked={c.attended} onClick={() => onToggle(c.id)} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted, minWidth: 96 }}>{c.time}</span>
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{c.subject}</span>
              <button className="att-del" onClick={() => onDelete(c.id)} style={{ background: "transparent", border: "none", padding: 4, display: "flex" }} aria-label="Delete class">
                <IconTrash />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: classes.length ? 14 : 0, borderTop: classes.length ? `1px solid ${COLORS.border}` : "none" }}>
          <input placeholder="9:00 - 10:00" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: 130 }} />
          <input
            placeholder="Add a class, e.g. Data Structures"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{ flex: 1, minWidth: 160 }}
          />
          <button
            onClick={submit}
            style={{ background: COLORS.accent, border: "none", borderRadius: 8, padding: "0 14px", display: "flex", alignItems: "center", gap: 6, color: "#2B1D08", fontSize: 13, fontWeight: 600 }}
          >
            <IconPlus /> Add
          </button>
        </div>
      </Card>
    </div>
  );
}

// ---------------- Calendar Tab ----------------

function CalendarTab({ timetable, calendarLog, selectedDate, setSelectedDate, onToggleClass }) {
  // selectedDate is a "YYYY-MM-DD" string. Keep a separate cursor for which month is shown.
  const initial = selectedDate ? new Date(selectedDate + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth()); // 0-indexed

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selDateObj = new Date(selectedDate + "T00:00:00");
  const selWeekdayIdx = selDateObj.getDay();
  const selDayKey = WEEKDAY_INDEX_TO_KEY[selWeekdayIdx]; // undefined for Sat/Sun
  const classesForSelected = selDayKey ? timetable[selDayKey] || [] : [];
  const logForSelected = calendarLog[selectedDate] || {};
  const attendedCount = classesForSelected.filter((c) => logForSelected[c.id]).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 380px) 1fr", gap: 20 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={goPrevMonth} style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 6, display: "flex" }} aria-label="Previous month">
            <IconChevronLeft />
          </button>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15, margin: 0 }}>{monthLabel}</h3>
          <button onClick={goNextMonth} style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 6, display: "flex" }} aria-label="Next month">
            <IconChevronRight />
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
            const dateObj = new Date(viewYear, viewMonth, day);
            const dateKey = toDateKey(dateObj);
            const weekdayIdx = dateObj.getDay();
            const dayKey = WEEKDAY_INDEX_TO_KEY[weekdayIdx];
            const hasClasses = dayKey && (timetable[dayKey] || []).length > 0;
            const log = calendarLog[dateKey] || {};
            const dayClassesCount = hasClasses ? timetable[dayKey].length : 0;
            const dayAttendedCount = hasClasses ? timetable[dayKey].filter((c) => log[c.id]).length : 0;
            const isSelected = dateKey === selectedDate;
            const isToday = dateKey === todayKey();

            let dotColor = null;
            if (hasClasses) {
              dotColor = dayAttendedCount === dayClassesCount ? COLORS.present : dayAttendedCount > 0 ? COLORS.accent : COLORS.textFaint;
            }

            return (
              <div
                key={i}
                className="att-cal-cell"
                onClick={() => setSelectedDate(dateKey)}
                style={{
                  background: isSelected ? COLORS.accentDim : "transparent",
                  border: isSelected ? `1px solid ${COLORS.accent}` : isToday ? `1px solid ${COLORS.borderStrong}` : "1px solid transparent",
                  color: isSelected ? COLORS.accent : COLORS.text,
                  fontWeight: isToday ? 600 : 400,
                }}
              >
                {day}
                {dotColor && (
                  <span style={{ position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: "50%", background: dotColor }} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: 11, color: COLORS.textFaint, flexWrap: "wrap" }}>
          <LegendDot color={COLORS.present} label="fully attended" />
          <LegendDot color={COLORS.accent} label="partial" />
          <LegendDot color={COLORS.textFaint} label="none marked" />
        </div>
      </Card>

      <Card style={{ borderLeft: `3px solid ${COLORS.accent}`, borderRadius: "6px 14px 14px 6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 6 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 18, margin: 0 }}>
            <Highlight>{selDateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</Highlight>
          </h2>
          {classesForSelected.length > 0 && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>{attendedCount}/{classesForSelected.length} attended</span>
          )}
        </div>

        {!selDayKey && (
          <div style={{ color: COLORS.textFaint, fontSize: 13, padding: "16px 0" }}>
            Weekend — no classes scheduled in the timetable.
          </div>
        )}

        {selDayKey && classesForSelected.length === 0 && (
          <div style={{ color: COLORS.textFaint, fontSize: 13, padding: "16px 0" }}>
            No {FULL_DAY[selDayKey]} classes in your timetable yet. Add some in the Timetable tab and they'll show up here for every {FULL_DAY[selDayKey]}.
          </div>
        )}

        {classesForSelected.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {classesForSelected.map((c) => {
              const checked = !!logForSelected[c.id];
              return (
                <div
                  key={c.id}
                  className="att-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: checked ? COLORS.presentDim : COLORS.surface2,
                    border: `1px solid ${checked ? COLORS.present + "55" : COLORS.border}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <Checkbox checked={checked} onClick={() => onToggleClass(selectedDate, c.id)} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted, minWidth: 96 }}>{c.time}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{c.subject}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ color: COLORS.textFaint, fontSize: 11.5, marginTop: 16, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
          This marks attendance just for this specific date — it won't change your weekly Timetable toggle. Great for logging past days or one-off cancellations.
        </div>
      </Card>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {label}
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
          <SubjectAssignmentCard
            key={s.id}
            subject={s}
            assignments={assignments.filter((a) => a.subjectId === s.id)}
            onAdd={(title, due) => onAdd(title, s.id, due)}
            onToggle={onToggle}
            onDelete={onDelete}
          />
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
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textFaint }}>
          {done.length}/{assignments.length}
        </span>
      </div>

      <div className="att-scroll" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
        {assignments.length === 0 && <div style={{ color: COLORS.textFaint, fontSize: 12.5 }}>No assignments yet.</div>}
        {pending.map((a) => (
          <AssignmentRow key={a.id} a={a} onToggle={onToggle} onDelete={onDelete} />
        ))}
        {done.map((a) => (
          <AssignmentRow key={a.id} a={a} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input
          placeholder="Add assignment"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ flex: 1, minWidth: 110 }}
        />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: 130 }} />
        <button
          onClick={submit}
          style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "0 12px", color: COLORS.accent, display: "flex", alignItems: "center" }}
          aria-label="Add assignment"
        >
          <IconPlus color={COLORS.accent} />
        </button>
      </div>
    </Card>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.textFaint, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
      {children}
    </div>
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