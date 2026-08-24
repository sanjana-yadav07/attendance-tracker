import React, { useState, useEffect } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const FULL_DAY = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };
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

function emptyData() {
  const timetable = {};
  DAYS.forEach((d) => (timetable[d] = []));
  const subjects = Array.from({ length: 6 }).map((_, i) => ({
    id: uid(),
    name: `Subject ${i + 1}`,
    todos: [],
  }));
  return { timetable, assignments: [], subjects };
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

  // per-subject breakdown: matches class.subject text (case-insensitive) to subject.name,
  // plus falls back to grouping by raw class subject text if it doesn't match any of the 6 cards
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
