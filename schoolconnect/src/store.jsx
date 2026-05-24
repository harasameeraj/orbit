import { createContext, useContext, useState } from 'react'

// ─── Mock Data ───────────────────────────────────────────────────────────────

export const MOCK_USERS = [
  { id: 'admin1', email: 'admin@stxaviers.edu.in', password: 'admin123', role: 'admin', name: 'Sarah Johnson', school: 'St. Xavier\'s International Academy' },
  { id: 'teacher1', email: 'teacher@stxaviers.edu.in', password: 'teacher123', role: 'teacher', name: 'Mr. Rajesh Iyer', class: '10-A', subject: 'Mathematics' },
  { id: 'parent1', email: 'parent@example.com', password: 'parent123', role: 'parent', name: 'Mr. Sunil Sharma', studentId: 'stu1' },
]

export const MOCK_STUDENTS = [
  { id: 'stu1', name: 'Arjun Sharma', rollNo: '10A01', class: '10-A', section: 'A', dob: '15 Aug 2008', fatherName: 'Mr. Sunil Sharma', email: 'arjun.sharma@school.edu.in', phone: '+91 98765 43210', attendance: 94, avgScore: 81.2, rank: 4 },
  { id: 'stu2', name: 'Priya Iyer', rollNo: '10A02', class: '10-A', section: 'A', dob: '3 Mar 2008', fatherName: 'Mr. Ravi Iyer', email: 'priya.iyer@school.edu.in', phone: '+91 87654 32109', attendance: 98, avgScore: 91, rank: 1 },
  { id: 'stu3', name: 'Rohan Verma', rollNo: '10A03', class: '10-A', section: 'A', dob: '22 Nov 2008', fatherName: 'Mr. Anil Verma', email: 'rohan.v@school.edu.in', phone: '+91 76543 21098', attendance: 72, avgScore: 65, rank: 32 },
  { id: 'stu4', name: 'Aditi Sharma', rollNo: '10A01', class: '10-A', section: 'A', dob: '8 Jan 2008', fatherName: 'Mr. Vijay Sharma', email: 'aditi.s@school.edu.in', phone: '+91 65432 10987', attendance: 91, avgScore: 78, rank: 8 },
  { id: 'stu5', name: 'Arjun Malhotra', rollNo: '10A02', class: '10-A', section: 'A', dob: '15 Sep 2008', fatherName: 'Mr. Rajan Malhotra', email: 'arjun.m@school.edu.in', phone: '+91 54321 09876', attendance: 85, avgScore: 72, rank: 15 },
]

export const MOCK_ATTENDANCE = {
  'stu1': [
    { date: '2023-10-24', status: 'present', time: '8:15 AM' },
    { date: '2023-10-23', status: 'present', time: '8:20 AM' },
    { date: '2023-10-20', status: 'absent', reason: 'Sick leave (Medical provided)' },
    { date: '2023-10-19', status: 'present', time: '8:10 AM' },
    { date: '2023-10-18', status: 'present', time: '8:30 AM' },
    { date: '2023-10-17', status: 'present', time: '8:18 AM' },
    { date: '2023-10-16', status: 'present', time: '8:22 AM' },
  ]
}

export const MOCK_MARKS = {
  'stu1': [
    { subject: 'Mathematics', icon: 'Σ', exams: [{ name: 'Unit Test 1', score: 72, max: 100 }, { name: 'Unit Test 2', score: 80, max: 100 }, { name: 'Unit Test 3', score: 85, max: 100 }], trend: 'up', current: 85 },
    { subject: 'Science', icon: '⚗', exams: [{ name: 'Unit Test 1', score: 75, max: 100 }, { name: 'Unit Test 2', score: 77, max: 100 }, { name: 'Unit Test 3', score: 78, max: 100 }], trend: 'stable', current: 78 },
    { subject: 'English', icon: 'A', exams: [{ name: 'Unit Test 1', score: 85, max: 100 }, { name: 'Unit Test 2', score: 88, max: 100 }, { name: 'Unit Test 3', score: 92, max: 100 }], trend: 'up', current: 92 },
    { subject: 'Social Studies', icon: '🌍', exams: [{ name: 'Unit Test 1', score: 80, max: 100 }, { name: 'Unit Test 2', score: 75, max: 100 }, { name: 'Unit Test 3', score: 70, max: 100 }], trend: 'down', current: 70 },
  ]
}

export const MOCK_HOMEWORK = [
  { id: 'hw1', subject: 'Mathematics', title: 'Quadratic Equations Practice', description: 'Complete exercises 5.1 to 5.4 from NCERT textbook. Show all working steps.', dueDate: '2023-10-25', postedBy: 'Mr. Rajesh Iyer', status: 'pending' },
  { id: 'hw2', subject: 'Science', title: 'Chapter 11 Diagram', description: 'Draw and label the human nervous system diagram from Chapter 11.', dueDate: '2023-10-27', postedBy: 'Ms. Priya Nair', status: 'pending' },
  { id: 'hw3', subject: 'English', title: 'Essay: My Favourite Season', description: 'Write a 300-word essay on your favourite season with proper paragraphs.', dueDate: '2023-10-26', postedBy: 'Mr. Samuel', status: 'completed' },
]

export const MOCK_ANNOUNCEMENTS = [
  { id: 'ann1', title: 'Sports Day scheduled for next Friday', body: 'Annual Sports Day will be held on 3rd November 2023 at the school grounds. Parents are invited.', time: '2 hours ago', urgent: true },
  { id: 'ann2', title: 'PTM Rescheduled', body: 'The Parent-Teacher Meeting for Class X has been moved to next Saturday, 28th October.', time: '1 day ago', urgent: false },
  { id: 'ann3', title: 'Monsoon Break Holiday', body: 'School will remain closed on 25th October due to heavy rainfall advisory.', time: '2 days ago', urgent: false },
]

export const MOCK_TIMETABLE = {
  Monday: [
    { time: '09:00 AM', subject: 'Mathematics', topic: 'Trigonometry - Part 3', status: 'active' },
    { time: '10:30 AM', subject: 'Physics', topic: 'Light Reflection & Refraction', status: 'upcoming' },
    { time: '12:15 PM', subject: 'History', topic: 'The French Revolution', status: 'upcoming' },
    { time: '02:00 PM', subject: 'English', topic: 'Poetry Analysis', status: 'upcoming' },
  ],
  Tuesday: [
    { time: '09:00 AM', subject: 'Chemistry', topic: 'Acids & Bases', status: 'upcoming' },
    { time: '10:30 AM', subject: 'Mathematics', topic: 'Quadratic Equations', status: 'upcoming' },
    { time: '12:15 PM', subject: 'Geography', topic: 'Indian Rivers', status: 'upcoming' },
  ],
  Wednesday: [
    { time: '09:00 AM', subject: 'English', topic: 'Grammar Review', status: 'upcoming' },
    { time: '10:30 AM', subject: 'Biology', topic: 'Cell Division', status: 'upcoming' },
    { time: '12:15 PM', subject: 'Mathematics', topic: 'Statistics', status: 'upcoming' },
  ],
  Thursday: [
    { time: '09:00 AM', subject: 'History', topic: 'World War II', status: 'upcoming' },
    { time: '10:30 AM', subject: 'Physics', topic: 'Electricity', status: 'upcoming' },
    { time: '02:00 PM', subject: 'Chemistry', topic: 'Carbon Compounds', status: 'upcoming' },
  ],
  Friday: [
    { time: '09:00 AM', subject: 'Mathematics', topic: 'Probability', status: 'upcoming' },
    { time: '10:30 AM', subject: 'English', topic: 'Essay Writing', status: 'upcoming' },
    { time: '12:15 PM', subject: 'Geography', topic: 'Climate Zones', status: 'upcoming' },
  ],
}

export const MOCK_BEHAVIOUR_LOGS = [
  { id: 'bl1', studentId: 'stu1', date: '2023-10-24', note: 'Arjun has been showing great progress in Mathematics. His participation in class discussions has significantly improved this week.', teacher: 'Mr. Rajesh Iyer', type: 'positive' },
  { id: 'bl2', studentId: 'stu1', date: '2023-10-23', note: 'Completed homework on time and helped classmates understand the concept.', teacher: 'Ms. Priya Nair', type: 'positive' },
  { id: 'bl3', studentId: 'stu2', date: '2023-10-24', note: 'Excellent work on the science project. Showed great creativity.', teacher: 'Mr. Rajesh Iyer', type: 'positive' },
]

export const MOCK_NOTICES = [
  { id: 'n1', title: 'Summer Enrichment Program Registration Open', category: 'ACADEMICS', body: 'Registration for the 2024 Summer Enrichment Program is now open for all students. Enroll before April 30.', date: 'May 16, 2024', visible: true, attachment: 'program_guide.pdf' },
  { id: 'n2', title: 'Revised School Timings for Monsoon Season', category: 'ADMINISTRATIVE', body: 'Due to the early onset of monsoon, school timings for the morning shift will be adjusted to 7:30 AM - 1:30 PM.', date: 'May 16, 2024', visible: false },
  { id: 'n3', title: 'Grade 12 Graduation Ceremony Details', category: 'EVENTS', body: 'The Grade 12 Graduation Ceremony is scheduled for May 28. Guest passes, dress code, and schedule are attached.', date: 'May 12, 2024', visible: true },
  { id: 'n4', title: 'Sports Uniform Update', category: 'ADMINISTRATIVE', body: 'New sports kits are now available at the school store for collection by Grade 10-12 students.', date: 'Yesterday', visible: true },
]

export const MOCK_EVENT_PHOTOS = [
  { id: 'ep1', title: 'Annual Excellence Awards 2024', photos: 142, date: '2 days ago', featured: true },
  { id: 'ep2', title: 'Inter-School Sports Meet', photos: 83, date: 'Yesterday', featured: false },
  { id: 'ep3', title: 'Science & Innovation Fair', photos: 96, date: '3 days ago', featured: false },
  { id: 'ep4', title: 'Parent-Teacher Orientation', photos: 24, date: 'May 10, 2024', featured: false },
]

export const MOCK_MESSAGES = [
  { id: 'msg1', from: 'parent1', to: 'teacher1', studentId: 'stu1', messages: [
    { sender: 'parent', text: 'Hello Mr. Rajesh, I wanted to check on Arjun\'s progress.', time: '10:30 AM', date: 'Oct 23' },
    { sender: 'teacher', text: 'Hello! Arjun is doing very well. His marks have improved significantly in Unit Test 3.', time: '11:15 AM', date: 'Oct 23' },
    { sender: 'parent', text: 'That\'s wonderful news! He has been studying hard. Thank you.', time: '11:20 AM', date: 'Oct 23' },
    { sender: 'teacher', text: 'Keep encouraging him. He has great potential. I\'ll share more detailed feedback at the PTM.', time: '02:30 PM', date: 'Oct 23' },
  ]}
]

// ─── Auth Context ─────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = async (email, password) => {
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 800))
    const found = MOCK_USERS.find(u => u.email === email && u.password === password)
    if (found) {
      setUser(found)
      setLoading(false)
      return found
    } else {
      setError('Invalid email or password')
      setLoading(false)
      return null
    }
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

// ─── App Data Context ─────────────────────────────────────────────────────────

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [students, setStudents] = useState(MOCK_STUDENTS)
  const [attendance, setAttendance] = useState(MOCK_ATTENDANCE)
  const [homework, setHomework] = useState(MOCK_HOMEWORK)
  const [announcements, setAnnouncements] = useState(MOCK_ANNOUNCEMENTS)
  const [behaviourLogs, setBehaviourLogs] = useState(MOCK_BEHAVIOUR_LOGS)
  const [notices, setNotices] = useState(MOCK_NOTICES)
  const [messages, setMessages] = useState(MOCK_MESSAGES)

  const markAttendance = (classAttendance, date) => {
    const newAttendance = { ...attendance }
    classAttendance.forEach(({ studentId, status }) => {
      if (!newAttendance[studentId]) newAttendance[studentId] = []
      newAttendance[studentId] = [{ date, status, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }, ...newAttendance[studentId].filter(a => a.date !== date)]
    })
    setAttendance(newAttendance)
  }

  const addHomework = (hw) => setHomework(prev => [{ id: 'hw' + Date.now(), ...hw, status: 'pending' }, ...prev])
  const addAnnouncement = (ann) => setAnnouncements(prev => [{ id: 'ann' + Date.now(), ...ann, time: 'Just now' }, ...prev])
  const addBehaviourLog = (log) => setBehaviourLogs(prev => [{ id: 'bl' + Date.now(), ...log, date: new Date().toISOString().split('T')[0] }, ...prev])
  const addNotice = (notice) => setNotices(prev => [{ id: 'n' + Date.now(), ...notice, date: 'Just now', visible: true }, ...prev])
  const toggleNotice = (id) => setNotices(prev => prev.map(n => n.id === id ? { ...n, visible: !n.visible } : n))
  const sendMessage = (threadId, text, sender) => {
    setMessages(prev => prev.map(t => t.id === threadId ? { ...t, messages: [...t.messages, { sender, text, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), date: 'Today' }] } : t))
  }
  const addStudent = (student) => setStudents(prev => [...prev, { id: 'stu' + Date.now(), ...student }])

  return (
    <DataContext.Provider value={{
      students, attendance, homework, announcements, behaviourLogs, notices, messages,
      markAttendance, addHomework, addAnnouncement, addBehaviourLog, addNotice, toggleNotice, sendMessage, addStudent,
      marks: MOCK_MARKS, timetable: MOCK_TIMETABLE, eventPhotos: MOCK_EVENT_PHOTOS
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
