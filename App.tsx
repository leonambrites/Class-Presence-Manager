import React, { useState, useCallback, useEffect } from 'react';
import { View, Student, Volunteer, ScheduleEntry, Topic, StudentType, Attendance as AttendanceType } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AttendanceComponent from './components/Attendance';
import Students from './components/Students';
import Schedule from './components/Schedule';
import Topics from './components/Topics';
import Dismissal from './components/Dismissal';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.Dashboard);
  const [students, setStudents] = useState<Student[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('All');

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error('Failed to fetch data from server.');
      }
      const data = await response.json();
      setStudents(data.students || []);
      setVolunteers(data.volunteers || []);
      setSchedule(data.schedule || []);
      setTopics(data.topics || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleMarkPresence = useCallback(async (studentId: string, date: string) => {
    const dayOfWeek = getDayOfWeek(date);
    if (!dayOfWeek) {
      showNotification("A presença só pode ser marcada em Domingos ou Quartas-feiras.");
      return;
    }

    try {
        const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, date, present: true, day: dayOfWeek })
        });
        if (!res.ok) throw new Error('API error on marking presence');
        const student = students.find(s => s.id === studentId);
        showNotification(`Presença de ${student?.name} marcada!`);
        fetchData();
    } catch (e) {
        console.error(e);
        showNotification('Erro ao marcar presença.');
    }
  }, [students, fetchData]);

  const handleUnmarkPresence = useCallback(async (studentId: string, date: string) => {
    const dayOfWeek = getDayOfWeek(date);
    try {
        const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, date, present: false, day: dayOfWeek })
        });
        if (!res.ok) throw new Error('API error on unmarking presence');
        const student = students.find(s => s.id === studentId);
        showNotification(`Presença de ${student?.name} desmarcada.`);
        fetchData();
    } catch (e) {
        console.error(e);
        showNotification('Erro ao desmarcar presença.');
    }
  }, [students, fetchData]);
  
  const handleAddMember = async (formData: { name: string; class: string; age: number; motherName: string; phone: string }) => {
    const newStudent = { id: String(Date.now()), ...formData, type: StudentType.Membro };
    try {
        const res = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newStudent)
        });
        if (!res.ok) throw new Error('API error on adding member');
        showNotification(`${formData.name} foi adicionado como Membro.`);
        fetchData();
    } catch (e) {
        console.error(e);
        showNotification('Erro ao adicionar membro.');
    }
  };
  
  const handleAddVisitor = async (formData: { name: string; class: string; age: number; motherName: string; phone: string }, date: string) => {
      const dayOfWeek = getDayOfWeek(date);
      if (!dayOfWeek) {
        showNotification("Novos visitantes só podem ser adicionados em dias de aula (Domingo ou Quarta).");
        return;
      }
      const newId = String(Date.now());
      const newStudentData = { id: newId, ...formData, type: StudentType.Visitante };
      
      try {
        const createRes = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newStudentData),
        });
        if (!createRes.ok) throw new Error('Failed to add visitor');

        await handleMarkPresence(newId, date);
        showNotification(`${formData.name} foi adicionado como Visitante e sua presença foi marcada.`);
        // fetchData is called inside handleMarkPresence
    } catch (err) {
        showNotification('Erro ao adicionar visitante.');
        console.error(err);
    }
  };

  const handleEditStudent = useCallback(async (updatedStudent: Student) => {
    try {
        const res = await fetch(`/api/students/${updatedStudent.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedStudent)
        });
        if (!res.ok) throw new Error('API error on editing student');
        showNotification(`${updatedStudent.name} foi atualizado com sucesso.`);
        fetchData();
    } catch (e) {
        console.error(e);
        showNotification('Erro ao editar aluno.');
    }
  }, [fetchData]);

  const handleDeleteStudent = useCallback(async (studentId: string) => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Aluno';
    try {
        const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('API error on deleting student');
        showNotification(`${studentName} foi excluído.`);
        fetchData();
    } catch (e) {
        console.error(e);
        showNotification('Erro ao excluir aluno.');
    }
  }, [students, fetchData]);

  const handleMakeMember = useCallback(async (studentId: string) => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Visitante';
    try {
        const res = await fetch(`/api/students/${studentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: StudentType.Membro })
        });
        if (!res.ok) throw new Error('API error on making member');
        showNotification(`${studentName} agora é um membro!`);
        fetchData();
    } catch (e) {
        console.error(e);
        showNotification('Erro ao tornar membro.');
    }
  }, [students, fetchData]);

  const handleAddTopic = useCallback(async (date: string, title: string, description: string) => {
    try {
        const res = await fetch('/api/topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, title, description })
        });
        if (!res.ok) throw new Error('API error on adding topic');
        showNotification(`Assunto "${title}" registrado com sucesso.`);
        fetchData();
    } catch (e) {
        console.error(e);
        showNotification('Erro ao registrar assunto.');
    }
  }, [fetchData]);

  const handleDismiss = useCallback(async (studentId: string, responsibleName: string, date: string) => {
    try {
        const res = await fetch('/api/dismissal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, responsibleName, date })
        });
        if (!res.ok) throw new Error('API error on dismissal');
        const student = students.find(s => s.id === studentId);
        showNotification(`Saída de ${student?.name} registrada para ${responsibleName}.`);
        fetchData();
    } catch (e) {
        console.error(e);
        showNotification('Erro ao registrar saída.');
    }
  }, [students, fetchData]);

  const renderView = () => {
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><div className="text-xl font-semibold text-gray-600">Carregando dados...</div></div>;
    }
    if (error) {
        return <div className="flex justify-center items-center h-64"><div className="text-xl font-semibold text-red-600">Erro: {error}</div></div>;
    }

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
