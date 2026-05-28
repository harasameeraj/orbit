import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  getStudentsByClass,
  getStudentAttendance, submitClassAttendance,
  getMarksByStudent,
  getHomeworkByClass, createHomework,
  getBehaviourLogs, addBehaviourLog,
  getAnnouncements, createAnnouncement,
  getMessages, getOrCreateThread, sendMessage as dbSendMessage, subscribeToMessages,
  getTimetable,
  supabase,
} from '../lib/supabase';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user, profile } = useAuth();

  const [students, setStudents] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [homework, setHomework] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [behaviourLogs, setBehaviourLogs] = useState([]);
  const [notices, setNotices] = useState([]);
  const [timetable, setTimetable] = useState({});
  const [marks, setMarks] = useState({});
  const [messages, setMessages] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [switchingChild, setSwitchingChild] = useState(false);

  const schoolId = profile?.school_id;
  const activeChannelRef = useRef(null);

  // Resolve teacher class
  const teacherClasses = profile?.teacher_classes || [];
  const primaryClass = teacherClasses.find(tc => tc.is_class_teacher) || teacherClasses[0];
  const classId = primaryClass?.class_id || null;

  useEffect(() => {
    if (!profile) return;
    loadInitialData();
  }, [profile?.id]);

  useEffect(() => {
    return () => {
      if (activeChannelRef.current) {
        supabase.removeChannel(activeChannelRef.current);
      }
    };
  }, []);

  // Realtime subscriptions for announcements
  useEffect(() => {
    if (!schoolId) return;

    const annChannel = supabase
      .channel('realtime:announcements:mobile')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements',
        filter: `school_id=eq.${schoolId}`
      }, (payload) => {
        const newAnn = payload.new;
        if (profile?.role === 'parent') {
          const firstStudent = students[0];
          if (newAnn.class_id && firstStudent && newAnn.class_id !== firstStudent.class_id) return;
        } else if (profile?.role === 'teacher') {
          if (newAnn.class_id && newAnn.class_id !== classId) return;
        }
        supabase.from('profiles').select('name').eq('id', newAnn.teacher_id).maybeSingle().then(({ data }) => {
          const record = { ...newAnn, profiles: { name: data?.name || 'School Administration' } };
          setAnnouncements(prev => {
            if (prev.some(a => a.id === record.id)) return prev;
            return [record, ...prev];
          });
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(annChannel);
    };
  }, [schoolId, profile?.role, classId, students]);

  async function loadInitialData() {
    if (!schoolId) return;
    setLoadingData(true);
    try {
      if (profile.role === 'teacher') {
        if (!classId) {
          setLoadingData(false);
          return;
        }
        const [studs, hw, anns, tt] = await Promise.all([
          getStudentsByClass(classId),
          getHomeworkByClass(classId),
          getAnnouncements(classId),
          getTimetable(classId),
        ]);
        setStudents(studs || []);
        setHomework(hw || []);
        setAnnouncements(anns || []);
        setTimetable(groupTimetableByDay(tt || []));

      } else if (profile.role === 'parent') {
        const { data: links } = await supabase
          .from('parent_students')
          .select('student_id, students(*, classes(name))')
          .eq('parent_id', user.id);

        const studs = (links || []).map(l => l.students).filter(Boolean);
        setStudents(studs);

        if (studs[0]) {
          setActiveStudent(studs[0]);
          await loadParentData(studs[0].id, studs[0].class_id);
        }
      }
    } catch (_e) {
      // silent
    }
    setLoadingData(false);
  }

  async function loadParentData(studentId, studentClassId) {
    const today = new Date().toISOString().split('T')[0];
    const rangeStart = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];

    const [att, mks, hw, anns, beh, tt] = await Promise.all([
      getStudentAttendance(studentId, rangeStart, today),
      getMarksByStudent(studentId),
      studentClassId ? getHomeworkByClass(studentClassId) : Promise.resolve([]),
      studentClassId ? getAnnouncements(studentClassId) : Promise.resolve([]),
      getBehaviourLogs(studentId, today),
      studentClassId ? getTimetable(studentClassId) : Promise.resolve([]),
    ]);

    setAttendance({ [studentId]: att || [] });
    setMarks(groupMarksBySubject(mks || [], studentId));
    setHomework(hw || []);
    setAnnouncements(anns || []);
    setBehaviourLogs(beh || []);
    setTimetable(groupTimetableByDay(tt || []));
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  const markAttendanceAction = async (classAttendanceArray, date) => {
    const records = classAttendanceArray.map(({ studentId, status }) => ({
      school_id: schoolId,
      student_id: studentId,
      class_id: classId,
      teacher_id: user.id,
      date,
      status,
    }));
    await submitClassAttendance(records);
    const updated = { ...attendance };
    classAttendanceArray.forEach(({ studentId, status }) => {
      if (!updated[studentId]) updated[studentId] = [];
      updated[studentId] = [
        { date, status, marked_at: new Date().toISOString() },
        ...updated[studentId].filter(a => a.date !== date),
      ];
    });
    setAttendance(updated);
  };

  const addHomeworkAction = async (hw) => {
    const created = await createHomework({
      ...hw,
      school_id: schoolId,
      class_id: classId,
      teacher_id: user.id,
    });
    setHomework(prev => [created, ...prev]);
    return created;
  };

  const addAnnouncementAction = async (ann) => {
    const created = await createAnnouncement({
      ...ann,
      school_id: schoolId,
      class_id: classId,
      teacher_id: user.id,
    });
    supabase.functions.invoke('send-notification', {
      body: { type: 'announcement', title: ann.title, body: ann.body, school_id: schoolId, class_id: classId }
    }).catch(() => {});
    setAnnouncements(prev => [created, ...prev]);
    return created;
  };

  const addBehaviourLogAction = async (log) => {
    const created = await addBehaviourLog({
      student_id: log.studentId,
      note: log.note,
      type: log.type || 'positive',
      school_id: schoolId,
      teacher_id: user.id,
      date: new Date().toISOString().split('T')[0],
    });
    setBehaviourLogs(prev => [created, ...prev]);
    return created;
  };

  const sendMessageAction = async (threadId, text) => {
    const msg = await dbSendMessage(threadId, user.id, text, schoolId);
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const loadMessagesAction = async (parentId, teacherId, studentId) => {
    if (activeChannelRef.current) {
      supabase.removeChannel(activeChannelRef.current);
      activeChannelRef.current = null;
    }

    const thread = await getOrCreateThread(parentId, teacherId, studentId, schoolId);
    const msgs = await getMessages(thread.id);
    setMessages(msgs || []);

    const channel = subscribeToMessages(thread.id, (newMsg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    activeChannelRef.current = channel;

    return thread;
  };

  const switchStudent = async (student) => {
    if (!student || student.id === activeStudent?.id) return;
    setSwitchingChild(true);
    setActiveStudent(student);
    setMessages([]);
    await loadParentData(student.id, student.class_id);
    setSwitchingChild(false);
  };

  return (
    <DataContext.Provider value={{
      students, activeStudent, attendance, homework, announcements, behaviourLogs,
      notices, timetable, marks, messages, loadingData, switchingChild,
      classId, schoolId,
      markAttendance: markAttendanceAction,
      addHomework: addHomeworkAction,
      addAnnouncement: addAnnouncementAction,
      addBehaviourLog: addBehaviourLogAction,
      sendMessage: sendMessageAction,
      loadMessages: loadMessagesAction,
      reloadData: loadInitialData,
      switchStudent,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupTimetableByDay(rows) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const grouped = {};
  days.forEach(d => { grouped[d] = []; });
  rows.forEach(row => {
    if (grouped[row.day_of_week]) {
      grouped[row.day_of_week].push({
        time: row.start_time ? row.start_time.slice(0, 5) : '',
        subject: row.subject,
        topic: row.topic || '',
        status: 'upcoming',
      });
    }
  });
  return grouped;
}

function groupMarksBySubject(rows, studentId) {
  const bySubject = {};
  rows.forEach(r => {
    if (!bySubject[r.subject]) {
      bySubject[r.subject] = { subject: r.subject, exams: [], current: 0, trend: 'stable' };
    }
    bySubject[r.subject].exams.push({ name: r.exam_type, score: r.score, max: r.max_score });
    bySubject[r.subject].current = r.score;
  });
  Object.values(bySubject).forEach(s => {
    const scores = s.exams.map(e => e.score);
    if (scores.length >= 2) {
      const diff = scores[scores.length - 1] - scores[0];
      s.trend = diff > 5 ? 'up' : diff < -5 ? 'down' : 'stable';
    }
  });
  return { [studentId]: Object.values(bySubject) };
}
