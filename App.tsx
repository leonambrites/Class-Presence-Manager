
import React, { useState, useCallback } from 'react';
import { View, Student, Volunteer, ScheduleEntry, Topic, StudentType, Attendance as AttendanceType } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AttendanceComponent from './components/Attendance';
import Students from './components/Students';
import Schedule from './components/Schedule';
import Topics from './components/Topics';
import Dismissal from './components/Dismissal';
import { INITIAL_STUDENTS, INITIAL_VOLUNTEERS, INITIAL_SCHEDULE, INITIAL_TOPICS } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.Dashboard);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [volunteers, setVolunteers] = useState<Volunteer[]>(INITIAL_VOLUNTEERS);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(INITIAL_SCHEDULE);
  const [topics, setTopics] = useState<Topic[]>(INITIAL_TOPICS);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('All');

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const getDayOfWeek = (dateString: string): 'Sunday' | 'Wednesday' | null => {
    const date = new Date(dateString + 'T00:00:00');
    const dayIndex = date.getDay();
    if (dayIndex === 0) return 'Sunday';
    if (dayIndex === 3) return 'Wednesday';
    return null;
  };

  const handleMarkPresence = useCallback((studentId: string, date: string) => {
    const dayOfWeek = getDayOfWeek(date);
    if (!dayOfWeek) {
      showNotification("A presença só pode ser marcada em Domingos ou Quartas-feiras.");
      return;
    }

    setStudents(prevStudents => {
      return prevStudents.map(student => {
        if (student.id === studentId) {
          const attendanceIndex = student.attendance.findIndex(a => a.date === date);
          const newAttendance: AttendanceType[] = [...student.attendance];
          if (attendanceIndex > -1) {
            newAttendance[attendanceIndex] = { ...newAttendance[attendanceIndex], present: true, day: dayOfWeek };
          } else {
            newAttendance.push({ date: date, present: true, dismissedBy: null, day: dayOfWeek });
          }
          showNotification(`Presença de ${student.name} marcada!`);
          return { ...student, attendance: newAttendance };
        }
        return student;
      });
    });
  }, []);

  const handleUnmarkPresence = useCallback((studentId: string, date: string) => {
    setStudents(prevStudents => {
      return prevStudents.map(student => {
        if (student.id === studentId) {
          const newAttendance = student.attendance.map(att => {
            if (att.date === date) {
              // Also clear dismissal info if unmarking presence
              return { ...att, present: false, dismissedBy: null };
            }
            return att;
          });
          showNotification(`Presença de ${student.name} desmarcada.`);
          return { ...student, attendance: newAttendance };
        }
        return student;
      });
    });
  }, []);

  const handleAddStudent = useCallback((formData: { name: string; class: string; age: number; motherName: string; phone: string }, type: StudentType) => {
    setStudents(prevStudents => {
        const newStudent: Student = {
            id: String(Date.now()),
            ...formData,
            type,
            attendance: []
        };
        showNotification(`${formData.name} foi adicionado como ${type}.`);
        return [...prevStudents, newStudent];
    });
  }, []);

  const handleAddMember = (formData: { name: string; class: string; age: number; motherName: string; phone: string }) => {
    handleAddStudent(formData, StudentType.Membro);
  };
  
  const handleAddVisitor = (formData: { name: string; class: string; age: number; motherName: string; phone: string }, date: string) => {
      if (!getDayOfWeek(date)) {
        showNotification("Novos visitantes só podem ser adicionados em dias de aula (Domingo ou Quarta).");
        return;
      }
      const newId = String(Date.now());
      const newStudent: Student = {
        id: newId,
        ...formData,
        type: StudentType.Visitante,
        attendance: []
    };
    setStudents(prev => [...prev, newStudent]);
    // Automatically mark presence for the new visitor on the selected date
    setTimeout(() => handleMarkPresence(newId, date), 100);
    showNotification(`${formData.name} foi adicionado como Visitante e sua presença foi marcada.`);
  };

  const handleEditStudent = useCallback((updatedStudent: Student) => {
    setStudents(prev => prev.map(s => (s.id === updatedStudent.id ? updatedStudent : s)));
    showNotification(`${updatedStudent.name} foi atualizado com sucesso.`);
  }, []);

  const handleDeleteStudent = useCallback((studentId: string) => {
    let studentName = '';
    setStudents(prev => {
        const studentToDelete = prev.find(s => s.id === studentId);
        if (studentToDelete) {
            studentName = studentToDelete.name;
        }
        return prev.filter(s => s.id !== studentId)
    });
    if (studentName) {
      showNotification(`${studentName} foi excluído.`);
    }
  }, []);

  const handleMakeMember = useCallback((studentId: string) => {
    let studentName = '';
    setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
            studentName = s.name;
            return { ...s, type: StudentType.Membro };
        }
        return s;
    }));
    if (studentName) {
        showNotification(`${studentName} agora é um membro!`);
    }
  }, []);

  const handleAddTopic = useCallback((date: string, title: string, description: string) => {
    const newTopic: Topic = { date, title, description };
    setTopics(prev => [newTopic, ...prev]);
    showNotification(`Assunto "${title}" registrado com sucesso.`);
  }, []);

  const handleDismiss = useCallback((studentId: string, responsibleName: string, date: string) => {
    setStudents(prevStudents => {
        return prevStudents.map(student => {
            if (student.id === studentId) {
                const newAttendance = student.attendance.map(att => {
                    if (att.date === date) {
                        return { ...att, dismissedBy: responsibleName };
                    }
                    return att;
                });
                showNotification(`Saída de ${student.name} registrada para ${responsibleName}.`);
                return { ...student, attendance: newAttendance };
            }
            return student;
        });
    });
  }, []);

  const renderView = () => {
    switch (view) {
      case View.Dashboard:
        return <Dashboard students={students} selectedClass={selectedClass} onClassChange={setSelectedClass} />;
      case View.Attendance:
        return <AttendanceComponent students={students} onMarkPresence={handleMarkPresence} onUnmarkPresence={handleUnmarkPresence} onAddVisitor={handleAddVisitor} selectedClass={selectedClass} onClassChange={setSelectedClass} />;
      case View.Students:
        return <Students students={students} onAddStudent={handleAddMember} onEditStudent={handleEditStudent} onDeleteStudent={handleDeleteStudent} onMakeMember={handleMakeMember} selectedClass={selectedClass} onClassChange={setSelectedClass} />;
      case View.Schedule:
        return <Schedule schedule={schedule} volunteers={volunteers} selectedClass={selectedClass} onClassChange={setSelectedClass} />;
      case View.Topics:
        return <Topics topics={topics} onAddTopic={handleAddTopic} />;
      case View.Dismissal:
        return <Dismissal students={students} onDismiss={handleDismiss} selectedClass={selectedClass} onClassChange={setSelectedClass} />;
      default:
        return <Dashboard students={students} selectedClass={selectedClass} onClassChange={setSelectedClass} />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-light font-sans">
      <Header 
        currentView={view} 
        onNavigate={setView} 
      />
      <main className="container mx-auto">
        {renderView()}
      </main>
      {notification && (
        <div className="fixed bottom-4 right-4 md:bottom-5 md:right-5 bg-brand-dark text-white py-2 px-4 rounded-lg shadow-lg animate-bounce z-50">
            {notification}
        </div>
      )}
    </div>
  );
};

export default App;
