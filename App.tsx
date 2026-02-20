import React, { useState, useCallback, useEffect } from 'react';
import { View, Student, Volunteer, ScheduleEntry, Topic, StudentType } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AttendanceComponent from './components/Attendance';
import Students from './components/Students';
import Schedule from './components/Schedule';
import Volunteers from './components/Volunteers';
import Topics from './components/Topics';
import Dismissal from './components/Dismissal';
import {
    INITIAL_STUDENTS,
    INITIAL_VOLUNTEERS,
    INITIAL_SCHEDULE,
    INITIAL_TOPICS
} from './constants';

const App: React.FC = () => {
    const [view, setView] = useState<View>(View.Dashboard);

    const [students, setStudents] = useState<Student[]>([]);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);

    const [notification, setNotification] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>('All');
    const [loading, setLoading] = useState<boolean>(true);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'syncing' | 'offline'>('syncing');

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    // Helper to save to LS
    const saveDataLocally = (key: string, data: any) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error("Error saving to local storage", e);
        }
    };

    const loadDataLocally = useCallback(() => {
        try {
            const lsStudents = localStorage.getItem('students');
            const lsVolunteers = localStorage.getItem('volunteers');
            const lsSchedule = localStorage.getItem('schedule');
            const lsTopics = localStorage.getItem('topics');

            setStudents(lsStudents ? JSON.parse(lsStudents) : INITIAL_STUDENTS);
            setVolunteers(lsVolunteers ? JSON.parse(lsVolunteers) : INITIAL_VOLUNTEERS);
            setSchedule(lsSchedule ? JSON.parse(lsSchedule) : INITIAL_SCHEDULE);
            setTopics(lsTopics ? JSON.parse(lsTopics) : INITIAL_TOPICS);
        } catch (e) {
            console.error("Error loading local data", e);
            setStudents(INITIAL_STUDENTS);
            setVolunteers(INITIAL_VOLUNTEERS);
            setSchedule(INITIAL_SCHEDULE);
            setTopics(INITIAL_TOPICS);
        }
    }, []);

    // Fetch Data Function
    const fetchData = async (silent = false) => {
        if (!silent && connectionStatus !== 'offline') setConnectionStatus('syncing');

        try {
            const response = await fetch('/api/data');

            // Check if response is valid JSON (backend might return HTML 404 if not running)
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("API unavailable");
            }

            if (!response.ok) throw new Error('Falha na conexão');
            const data = await response.json();

            // If we get here, we are connected
            if (data.students) setStudents(data.students);
            if (data.volunteers) setVolunteers(data.volunteers);
            if (data.schedule) setSchedule(data.schedule);
            if (data.topics) setTopics(data.topics);

            setConnectionStatus('connected');

            // Update local storage as backup
            saveDataLocally('students', data.students);
            saveDataLocally('volunteers', data.volunteers);
            saveDataLocally('schedule', data.schedule);
            saveDataLocally('topics', data.topics);

        } catch (error) {
            // Silently switch to offline mode without alerting the user
            if (connectionStatus !== 'offline') {
                setConnectionStatus('offline');
            }

            // Ensure we have data loaded if we haven't already
            if (students.length === 0) {
                loadDataLocally();
            }
        } finally {
            setLoading(false);
        }
    };

    // Initial Load and Polling
    useEffect(() => {
        loadDataLocally(); // Load local data immediately for instant render
        setLoading(false); // Stop loading spinner immediately

        fetchData(true); // Try to sync in background

        const intervalId = setInterval(() => {
            fetchData(true);
        }, 5000); // Poll every 5s

        return () => clearInterval(intervalId);
    }, [loadDataLocally]);

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

        const updatedStudents = students.map(s => {
            if (s.id === studentId) {
                const exists = s.attendance.find(a => a.date === date);
                if (exists) return { ...s, attendance: s.attendance.map(a => a.date === date ? { ...a, present: true, day: dayOfWeek } : a) };
                return { ...s, attendance: [...s.attendance, { date, present: true, day: dayOfWeek }] };
            }
            return s;
        });

        setStudents(updatedStudents);
        saveDataLocally('students', updatedStudents);

        if (connectionStatus === 'connected') {
            try {
                await fetch('/api/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, date, present: true, day: dayOfWeek })
                });
                showNotification(`Presença marcada!`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente (Servidor offline).");
            }
        } else {
            showNotification("Presença salva (Modo Offline).");
        }
    }, [students, connectionStatus]);

    const handleUnmarkPresence = useCallback(async (studentId: string, date: string) => {
        const dayOfWeek = getDayOfWeek(date);

        const updatedStudents = students.map(s => {
            if (s.id === studentId) {
                return { ...s, attendance: s.attendance.map(a => a.date === date ? { ...a, present: false } : a) };
            }
            return s;
        });

        setStudents(updatedStudents);
        saveDataLocally('students', updatedStudents);

        if (connectionStatus === 'connected') {
            try {
                await fetch('/api/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, date, present: false, day: dayOfWeek })
                });
                showNotification(`Presença desmarcada.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente (Servidor offline).");
            }
        } else {
            showNotification("Alteração salva (Modo Offline).");
        }
    }, [students, connectionStatus]);

    const handleAddMember = async (formData: { name: string; class: string; age: number; motherName: string; phone: string; birthday: string }) => {
        const newStudent = {
            id: String(Date.now()),
            ...formData,
            type: StudentType.Membro,
            attendance: []
        };

        const updatedStudents = [...students, newStudent];
        setStudents(updatedStudents);
        saveDataLocally('students', updatedStudents);

        if (connectionStatus === 'connected') {
            try {
                await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newStudent)
                });
                showNotification(`${formData.name} adicionado.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification(`${formData.name} salvo localmente.`);
        }
    };

    const handleAddVisitor = async (formData: { name: string; class: string; age: number; motherName: string; phone: string; birthday: string }, date: string) => {
        const dayOfWeek = getDayOfWeek(date);
        if (!dayOfWeek) {
            showNotification("Novos visitantes só podem ser adicionados em dias de aula.");
            return;
        }

        const newStudent = {
            id: String(Date.now()),
            ...formData,
            type: StudentType.Visitante,
            attendance: [{ date, present: true, day: dayOfWeek }]
        };

        const updatedStudents = [...students, newStudent];
        setStudents(updatedStudents);
        saveDataLocally('students', updatedStudents);

        if (connectionStatus === 'connected') {
            try {
                await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newStudent)
                });
                showNotification(`${formData.name} adicionado.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Visitante salvo localmente.");
        }
    };

    const handleEditStudent = useCallback(async (updatedStudent: Student) => {
        const updatedList = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
        setStudents(updatedList);
        saveDataLocally('students', updatedList);

        if (connectionStatus === 'connected') {
            try {
                await fetch(`/api/students/${updatedStudent.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedStudent)
                });
                showNotification(`${updatedStudent.name} atualizado.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Edição salva localmente.");
        }
    }, [students, connectionStatus]);

    const handleDeleteStudent = useCallback(async (studentId: string) => {
        const studentName = students.find(s => s.id === studentId)?.name || 'Aluno';
        if (window.confirm(`Tem certeza que deseja excluir ${studentName}?`)) {
            const updatedList = students.filter(s => s.id !== studentId);
            setStudents(updatedList);
            saveDataLocally('students', updatedList);

            if (connectionStatus === 'connected') {
                try {
                    await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
                    showNotification(`${studentName} excluído.`);
                } catch (e) {
                    setConnectionStatus('offline');
                    showNotification("Excluído localmente.");
                }
            } else {
                showNotification("Excluído localmente.");
            }
        }
    }, [students, connectionStatus]);

    const handleMakeMember = useCallback(async (studentId: string) => {
        const updatedList = students.map(s => s.id === studentId ? { ...s, type: StudentType.Membro } : s);
        setStudents(updatedList);
        saveDataLocally('students', updatedList);

        if (connectionStatus === 'connected') {
            try {
                await fetch(`/api/students/${studentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: StudentType.Membro })
                });
                showNotification("Aluno agora é um membro!");
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Status atualizado localmente.");
        }
    }, [students, connectionStatus]);

    const handleAddTopic = useCallback(async (date: string, title: string, description: string) => {
        const newTopic = { date, title, description };
        const updatedTopics = [...topics, newTopic].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTopics(updatedTopics);
        saveDataLocally('topics', updatedTopics);

        if (connectionStatus === 'connected') {
            try {
                await fetch('/api/topics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newTopic)
                });
                showNotification(`Assunto "${title}" registrado.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Assunto salvo localmente.");
        }
    }, [topics, connectionStatus]);

    const handleDismiss = useCallback(async (studentId: string, responsibleName: string, date: string) => {
        const updatedStudents = students.map(s => {
            if (s.id === studentId) {
                return { ...s, attendance: s.attendance.map(a => a.date === date ? { ...a, dismissedBy: responsibleName } : a) };
            }
            return s;
        });

        setStudents(updatedStudents);
        saveDataLocally('students', updatedStudents);

        if (connectionStatus === 'connected') {
            try {
                await fetch('/api/dismissal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, responsibleName, date })
                });
                showNotification(`Saída registrada para ${responsibleName}.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Saída registrada (Offline).");
        }
    }, [students, connectionStatus]);

    const handleAddVolunteer = useCallback(async (name: string) => {
        const newVolunteer = { id: String(Date.now()), name };
        const updatedVolunteers = [...volunteers, newVolunteer];
        setVolunteers(updatedVolunteers);
        saveDataLocally('volunteers', updatedVolunteers);

        if (connectionStatus === 'connected') {
            try {
                await fetch('/api/volunteers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                showNotification(`Professor ${name} registrado.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Professor salvo localmente.");
        }
    }, [volunteers, connectionStatus]);

    const handleEditVolunteer = useCallback(async (id: string, name: string) => {
        const updatedVolunteers = volunteers.map(v => v.id === id ? { ...v, name } : v);
        setVolunteers(updatedVolunteers);
        saveDataLocally('volunteers', updatedVolunteers);

        if (connectionStatus === 'connected') {
            try {
                await fetch(`/api/volunteers/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                showNotification(`Professor ${name} atualizado.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Professor atualizado localmente.");
        }
    }, [volunteers, connectionStatus]);

    const handleDeleteVolunteer = useCallback(async (id: string) => {
        const vName = volunteers.find(v => v.id === id)?.name || 'Professor';
        if (!window.confirm(`Tem certeza que deseja excluir ${vName}?`)) return;

        const updatedVolunteers = volunteers.filter(v => v.id !== id);
        setVolunteers(updatedVolunteers);
        saveDataLocally('volunteers', updatedVolunteers);

        if (connectionStatus === 'connected') {
            try {
                await fetch(`/api/volunteers/${id}`, { method: 'DELETE' });
                showNotification(`${vName} excluído.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Excluído localmente.");
            }
        } else {
            showNotification("Excluído localmente.");
        }
    }, [volunteers, connectionStatus]);

    const handleAddSchedule = useCallback(async (entry: Omit<ScheduleEntry, 'id'>) => {
        const newEntry = { ...entry, id: String(Date.now()) };
        const updatedSchedule = [...schedule, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setSchedule(updatedSchedule);
        saveDataLocally('schedule', updatedSchedule);

        if (connectionStatus === 'connected') {
            try {
                await fetch('/api/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newEntry)
                });
                showNotification(`Escala de ${entry.className} criada.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Escala salva localmente.");
        }
    }, [schedule, connectionStatus]);

    const handleEditSchedule = useCallback(async (entry: ScheduleEntry) => {
        const updatedSchedule = schedule.map(s => s.id === entry.id ? entry : s);
        setSchedule(updatedSchedule);
        saveDataLocally('schedule', updatedSchedule);

        if (connectionStatus === 'connected') {
            try {
                await fetch(`/api/schedule/${entry.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entry)
                });
                showNotification(`Escala atualizada.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Escala atualizada localmente.");
        }
    }, [schedule, connectionStatus]);

    const handleDeleteSchedule = useCallback(async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta escala?')) return;

        const updatedSchedule = schedule.filter(s => s.id !== id);
        setSchedule(updatedSchedule);
        saveDataLocally('schedule', updatedSchedule);

        if (connectionStatus === 'connected') {
            try {
                await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
                showNotification(`Escala excluída.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Excluído localmente.");
            }
        } else {
            showNotification("Excluído localmente.");
        }
    }, [schedule, connectionStatus]);

    const handleSaveData = async () => {
        if (connectionStatus !== 'connected') {
            showNotification("Você precisa estar online para salvar na planilha.");
            return;
        }

        const confirm = window.confirm("Isso enviará TODOS os dados atuais para a planilha, substituindo o que está lá. Use isso ao final da aula para garantir que tudo foi salvo. Deseja continuar?");
        if (!confirm) return;

        showNotification("Salvando dados na planilha...");

        try {
            const response = await fetch('/api/save-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    students,
                    volunteers,
                    schedule,
                    topics
                })
            });

            if (response.ok) {
                showNotification("Dados salvos com sucesso na planilha!");
            } else {
                throw new Error("Falha ao salvar");
            }
        } catch (e) {
            console.error(e);
            showNotification("Erro ao salvar dados na planilha.");
        }
    };

    const renderView = () => {
        if (loading && students.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
                    <p className="mt-4 text-gray-500">Carregando dados...</p>
                </div>
            );
        }

        switch (view) {
            case View.Dashboard:
                return <Dashboard
                    students={students}
                    selectedClass={selectedClass}
                    onClassChange={setSelectedClass}
                    onSaveData={handleSaveData}
                />;
            case View.Attendance:
                return <AttendanceComponent students={students} onMarkPresence={handleMarkPresence} onUnmarkPresence={handleUnmarkPresence} onAddVisitor={handleAddVisitor} selectedClass={selectedClass} onClassChange={setSelectedClass} />;
            case View.Students:
                return <Students students={students} onAddStudent={handleAddMember} onEditStudent={handleEditStudent} onDeleteStudent={handleDeleteStudent} onMakeMember={handleMakeMember} selectedClass={selectedClass} onClassChange={setSelectedClass} />;
            case View.Schedule:
                return <Schedule schedule={schedule} volunteers={volunteers} selectedClass={selectedClass} onClassChange={setSelectedClass} onAddSchedule={handleAddSchedule} onEditSchedule={handleEditSchedule} onDeleteSchedule={handleDeleteSchedule} />;
            case View.Volunteers:
                return <Volunteers volunteers={volunteers} onAddVolunteer={handleAddVolunteer} onEditVolunteer={handleEditVolunteer} onDeleteVolunteer={handleDeleteVolunteer} />;
            case View.Topics:
                return <Topics topics={topics} onAddTopic={handleAddTopic} />;
            case View.Dismissal:
                return <Dismissal students={students} onDismiss={handleDismiss} selectedClass={selectedClass} onClassChange={setSelectedClass} />;
            default:
                return <Dashboard students={students} selectedClass={selectedClass} onClassChange={setSelectedClass} onSaveData={handleSaveData} />;
        }
    };

    return (
        <div className="min-h-screen bg-brand-light font-sans relative">
            <Header
                currentView={view}
                onNavigate={setView}
            />
            {/* Network Status Indicator */}
            <div className={`w-full py-1 text-xs text-center text-white font-semibold transition-colors duration-300 ${connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'syncing' ? 'bg-blue-400' :
                    connectionStatus === 'offline' ? 'bg-blue-500' : 'bg-red-500'
                }`}>
                {connectionStatus === 'connected' ? 'Online - Sincronizado' :
                    connectionStatus === 'syncing' ? 'Sincronizando...' :
                        connectionStatus === 'offline' ? 'Modo Local (Dados salvos no navegador)' : 'Desconectado'}
            </div>

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