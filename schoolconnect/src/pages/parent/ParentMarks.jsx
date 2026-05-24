import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SKILLS = [
  { label: 'Critical Thinking', level: 'Advanced', pct: 85 },
  { label: 'Collaboration', level: 'Expert', pct: 92 },
  { label: 'Communication', level: 'Mastery', pct: 96 },
  { label: 'Leadership', level: 'Intermediate', pct: 60 },
]

export default function ParentMarks() {
  const { marks, students } = useData()
  const studentId = students?.[0]?.id
  const studentName = students?.[0]?.name
  const studentMarks = (studentId ? marks[studentId] : null) || marks['stu1'] || []

  // Chart data from maths exams
  const mathMarks = studentMarks[0]
  const chartData = mathMarks?.exams.map(e => ({ name: e.name, score: e.score })) || []

  const avgScore = studentMarks.reduce((acc, s) => acc + s.current, 0) / (studentMarks.length || 1)

  return (
    <div className="animate-fade-in">
      <PageHeader title="Marks & Grades" />
      <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

        {/* Academic Overview */}
        <div className="card-lg" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Academic Overview</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Arjun is showing consistent growth in core languages while maintaining a steady pace in scientific concepts.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Average Score', value: `${avgScore.toFixed(1)}%` },
              { label: 'Class Rank', value: '5th' },
              { label: 'Attendance', value: '94%' },
              { label: 'Unit Tests', value: '03/06' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Analytics CTA */}
        <div style={{ background: 'var(--brand)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Performance Analytics</div>
            <div style={{ fontSize: 13, opacity: .8 }}>Access deep insights, teacher feedback, and comparative class metrics.</div>
          </div>
          <button style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 10, padding: '10px 18px', color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
            View Detailed Report Card →
          </button>
        </div>

        {/* Subject-wise Performance */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Subject-wise Performance</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {studentMarks.map(s => (
            <div key={s.subject} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, background: 'var(--brand-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: 'var(--brand)' }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.subject}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand)' }}>{s.current}/100</div>
                </div>
              </div>
              <TrendBadge trend={s.trend} />
            </div>
          ))}
        </div>

        {/* Grade Trend Chart */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Grade Trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                formatter={(v) => [`${v}/100`, 'Score']}
              />
              <Bar dataKey="score" fill="var(--brand)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px', marginTop: 12, display: 'flex', gap: 8 }}>
            <TrendingUp size={16} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Arjun's overall grade has improved by 13% since Unit 1, moving from a B+ to an A- profile.</p>
          </div>
        </div>

        {/* Soft Skills */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Class Participation & Soft Skills</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {SKILLS.map(skill => (
              <div key={skill.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{skill.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>{skill.level}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill progress-brand" style={{ width: `${skill.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TrendBadge({ trend }) {
  if (trend === 'up') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent-green-light)', color: 'var(--accent-green)', padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
      <TrendingUp size={14} /> Trending Up
    </div>
  )
  if (trend === 'down') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent-red-light)', color: 'var(--accent-red)', padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
      <TrendingDown size={14} /> Trending Down
    </div>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface-2)', color: 'var(--text-muted)', padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
      <Minus size={14} /> Stable
    </div>
  )
}
