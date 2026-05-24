import { useState, useMemo } from 'react'
import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const EXAM_TYPES = ['Unit Test 1', 'Unit Test 2', 'Unit Test 3', 'Mid Term', 'Final Exam', 'Assignment']


export default function ParentMarks() {
  const { marks, students, attendance } = useData()
  const student = students?.[0]
  const studentId = student?.id
  const studentName = student?.name || 'Student'
  const firstName = studentName.split(' ')[0]

  const studentMarks = (studentId ? marks[studentId] : null) || []

  // Ensure standard EXAM_TYPES are always included in the filter options
  const allExams = useMemo(() => {
    const set = new Set(EXAM_TYPES)
    studentMarks.forEach(s => s.exams?.forEach(e => set.add(e.name)))
    return Array.from(set)
  }, [studentMarks])

  const totalExamsCount = useMemo(() => {
    const set = new Set()
    studentMarks.forEach(s => s.exams?.forEach(e => set.add(e.name)))
    return set.size
  }, [studentMarks])

  // Filter state for which exam term's marks to view
  const [selectedExam, setSelectedExam] = useState('Latest')
  // Filter state for which subject to view in the trend chart
  const [selectedChartSubject, setSelectedChartSubject] = useState('')

  // Selected subject for trend chart (default to first subject if not set)
  const activeChartSubjectName = selectedChartSubject || studentMarks[0]?.subject || ''
  const activeChartSubject = useMemo(() => {
    return studentMarks.find(s => s.subject === activeChartSubjectName)
  }, [studentMarks, activeChartSubjectName])

  // Reversely order exams for the chart so they display chronologically (oldest to newest)
  const chartData = useMemo(() => {
    if (!activeChartSubject?.exams) return []
    return [...activeChartSubject.exams].reverse().map(e => ({ name: e.name, score: e.score }))
  }, [activeChartSubject])

  // Helper to fetch the score for the selected exam (or the latest)
  const getDisplayedExamData = (subjectData) => {
    if (!subjectData?.exams || subjectData.exams.length === 0) return null
    if (selectedExam === 'Latest') {
      // Since rows are returned descending, the first exam in the array is the most recently created
      return subjectData.exams[0]
    }
    return subjectData.exams.find(e => e.name === selectedExam) || null
  }

  // Calculate average score dynamically based on the selected exam filter
  const avgScore = useMemo(() => {
    if (studentMarks.length === 0) return 0
    let sum = 0
    let count = 0
    studentMarks.forEach(s => {
      const examData = getDisplayedExamData(s)
      if (examData) {
        sum += examData.score
        count++
      }
    })
    return count > 0 ? sum / count : 0
  }, [studentMarks, selectedExam])

  // Calculate overall attendance pct
  const attRecords = (studentId ? attendance[studentId] : null) || []
  const overallStats = useMemo(() => {
    const total   = attRecords.length
    const present = attRecords.filter(r => r.status === 'present').length
    const late    = attRecords.filter(r => r.status === 'late').length
    return { total, present, late, pct: total > 0 ? Math.round(((present + late) / total) * 100) : null }
  }, [attRecords])

  return (
    <div className="animate-fade-in">
      <PageHeader title="Marks & Grades" />
      <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

        {/* Academic Overview */}
        <div className="card-lg" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Academic Overview</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            {firstName} is showing consistent performance across academic fields. Track details below.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Average Score', value: studentMarks.length > 0 ? `${avgScore.toFixed(1)}%` : '—' },
              { label: 'Total Subjects', value: studentMarks.length.toString() },
              { label: 'Attendance', value: overallStats.pct != null ? `${overallStats.pct}%` : '—' },
              { label: 'Exams Taken', value: totalExamsCount.toString() },
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Subject-wise Performance</h2>
          {allExams.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Exam Term:</span>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font)',
                  fontSize: 13,
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Latest">Latest Published</option>
                {allExams.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {studentMarks.length === 0 ? (
            <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No grades published yet
            </div>
          ) : studentMarks.map(s => {
            const examData = getDisplayedExamData(s)
            return (
              <div key={s.subject} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, background: 'var(--brand-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: 'var(--brand)' }}>
                    {s.icon || 'Σ'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{s.subject}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                      {examData ? `${examData.name} Score:` : 'No marks entered'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--brand)', textAlign: 'right' }}>
                    {examData ? `${examData.score}/${examData.max}` : '—'}
                  </div>
                  <TrendBadge trend={s.trend} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Grade Trend Chart */}
        {chartData.length > 0 && (
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Grade Trend Chart</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Subject:</span>
                <select
                  value={activeChartSubjectName}
                  onChange={(e) => setSelectedChartSubject(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontFamily: 'var(--font)',
                    fontSize: 13,
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {studentMarks.map(s => (
                    <option key={s.subject} value={s.subject}>{s.subject}</option>
                  ))}
                </select>
              </div>
            </div>

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
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {firstName}'s performance in <strong>{activeChartSubjectName}</strong> is shown chronologically from left to right.
              </p>
            </div>
          </div>
        )}

        {/* Soft Skills — Coming Soon */}
        <div className="card" style={{ padding: 24, opacity: 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Class Participation & Soft Skills</div>
            <span className="badge badge-brand" style={{ fontSize: 11 }}>Coming Soon</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Soft skill assessments including Critical Thinking, Collaboration, Communication, and Leadership will be available once teachers submit skill evaluations.
          </p>
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
