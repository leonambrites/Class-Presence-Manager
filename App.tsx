import React, { useState, useCallback, useEffect } from 'react';
import { View, Student, Volunteer, ScheduleEntry, Topic, StudentType, UserRole } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AttendanceComponent from './components/Attendance';
import Students from './components/Students';
import Schedule from './components/Schedule';
import Volunteers from './components/Volunteers';
import Topics from './components/Topics';
import Reports from './components/Reports';
import Admin from './components/Admin';
import { SignedIn, SignedOut, SignIn, useUser, useAuth } from '@clerk/clerk-react';
import {
    INITIAL_STUDENTS,
    INITIAL_VOLUNTEERS,
    INITIAL_SCHEDULE,
    INITIAL_TOPICS,
    LOGO_URL
} from './constants';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const App: React.FC = () => {
    const [view, setView] = useState<View>(View.Home);

    const [students, setStudents] = useState<Student[]>([]);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);

    const [notification, setNotification] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>('All');
    const [loading, setLoading] = useState<boolean>(true);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'syncing' | 'offline'>('syncing');
    const [isSubscribedToPush, setIsSubscribedToPush] = useState<boolean>(false);
    const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

    // Clerk hooks
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();

    // Map the local userRole based on the publicMetadata from Clerk Cloud Session
    const userRole = (user?.publicMetadata?.role as UserRole) || 'Ministra'; // Default fallback

    const fetchWithAuth = async (url: RequestInfo | URL, options: RequestInit = {}) => {
        try {
            const token = await getToken();
            const headers: HeadersInit = {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            };
            if (options.body && typeof options.body === 'string' && !(headers as any)['Content-Type']) {
                (headers as any)['Content-Type'] = 'application/json';
            }
            return fetch(url, {
                ...options,
                headers
            });
        } catch (err) {
            console.error('Error generating Clerk token for request:', err);
            return fetch(url, options);
        }
    };

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
            const response = await fetchWithAuth('/api/data');

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

    // Register Service Worker and check existing subscription / request permission
    useEffect(() => {
        if (!isLoaded) return;

        if ('serviceWorker' in navigator && 'PushManager' in window) {
            let activeReg: ServiceWorkerRegistration;

            const subscribeUser = async (reg: ServiceWorkerRegistration) => {
                try {
                    const response = await fetchWithAuth('/api/push/key');
                    if (!response.ok) return;
                    const { publicKey } = await response.json();
                    const applicationServerKey = urlBase64ToUint8Array(publicKey);
                    const newSub = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey,
                    });
                    await fetchWithAuth('/api/push/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            subscription: newSub,
                            userEmail: user?.primaryEmailAddress?.emailAddress || null,
                            userName: user?.fullName || null,
                            userRole: userRole || null
                        }),
                    });
                    setIsSubscribedToPush(true);
                } catch (error) {
                    console.error("Auto-subscribe error:", error);
                }
            };

            navigator.serviceWorker
                .register(new URL('./sw.js', import.meta.url))
                .then((reg) => {
                    console.log('Service Worker registered successfully:', reg);
                    setSwRegistration(reg);
                    activeReg = reg;
                    return reg.pushManager.getSubscription();
                })
                .then(async (subscription) => {
                    if (subscription) {
                        // Auto-healing: Verify if the subscription's public key matches current server key
                        try {
                            const response = await fetchWithAuth('/api/push/key');
                            if (response.ok) {
                                const { publicKey } = await response.json();
                                const currentServerKey = urlBase64ToUint8Array(publicKey);
                                const existingKey = subscription.options.applicationServerKey 
                                    ? new Uint8Array(subscription.options.applicationServerKey) 
                                    : null;
                                
                                let keysMatch = existingKey !== null && currentServerKey.length === existingKey.length;
                                if (keysMatch && existingKey) {
                                    for (let i = 0; i < currentServerKey.length; i++) {
                                        if (currentServerKey[i] !== existingKey[i]) {
                                            keysMatch = false;
                                            break;
                                        }
                                    }
                                }

                                if (!keysMatch) {
                                    console.log('VAPID key mismatch/change detected. Re-subscribing client...');
                                    await subscription.unsubscribe();
                                    await subscribeUser(activeReg);
                                } else {
                                    // Keys match, always re-register with database to keep metadata (user email, role) synced
                                    console.log('Push keys match. Re-syncing push subscription metadata with backend DB...');
                                    await fetchWithAuth('/api/push/subscribe', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ 
                                            subscription: subscription,
                                            userEmail: user?.primaryEmailAddress?.emailAddress || null,
                                            userName: user?.fullName || null,
                                            userRole: userRole || null
                                        }),
                                    });
                                    setIsSubscribedToPush(true);
                                }
                            } else {
                                setIsSubscribedToPush(true);
                            }
                        } catch (err) {
                            console.error('Error validating existing push subscription, defaulting to true:', err);
                            setIsSubscribedToPush(true);
                        }
                    } else {
                        setIsSubscribedToPush(false);
                        
                        if (Notification.permission === 'default') {
                            const permission = await Notification.requestPermission();
                            if (permission === 'granted') {
                                await subscribeUser(activeReg);
                            }
                        } else if (Notification.permission === 'granted') {
                            await subscribeUser(activeReg);
                        }
                    }
                })
                .catch((err) => {
                    console.error('Service Worker registration failed:', err);
                });
        }
    }, [isLoaded, user, userRole]);

    // Listen to messages from the Service Worker
    useEffect(() => {
        const handleServiceWorkerMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'NAVIGATE') {
                const url = new URL(event.data.url, window.location.origin);
                const viewParam = url.searchParams.get('view');
                if (viewParam === 'Presença') {
                    setView(View.Attendance);
                } else if (viewParam === 'Home') {
                    setView(View.Home);
                }
            }
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        }
        return () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
            }
        };
    }, []);

    // Initial check for URL routing from push notification click
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        if (viewParam === 'Presença') {
            setView(View.Attendance);
        } else if (viewParam === 'Home') {
            setView(View.Home);
        }
        if (viewParam) {
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: newUrl }, '', newUrl);
        }
    }, []);

    const togglePushSubscription = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !swRegistration) {
            showNotification("Este navegador não suporta notificações de alerta.");
            return;
        }

        try {
            if (isSubscribedToPush) {
                const subscription = await swRegistration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();
                    await fetchWithAuth('/api/push/unsubscribe', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ endpoint: subscription.endpoint }),
                    });
                }
                setIsSubscribedToPush(false);
                showNotification("Notificações desativadas com sucesso.");
            } else {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    showNotification("Permissão de notificação negada. Ative nas configurações do navegador.");
                    return;
                }

                const response = await fetchWithAuth('/api/push/key');
                if (!response.ok) {
                    throw new Error("Não foi possível buscar a chave pública do servidor.");
                }
                const { publicKey } = await response.json();

                const applicationServerKey = urlBase64ToUint8Array(publicKey);
                const subscription = await swRegistration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey,
                });

                const subResponse = await fetchWithAuth('/api/push/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        subscription,
                        userEmail: user?.primaryEmailAddress?.emailAddress || null,
                        userName: user?.fullName || null,
                        userRole: userRole || null
                    }),
                });

                if (!subResponse.ok) {
                    throw new Error("Erro ao salvar inscrição no servidor.");
                }

                setIsSubscribedToPush(true);
                showNotification("Notificações ativadas! Você receberá alertas de liberação.");
            }
        } catch (error) {
            console.error("Erro ao gerenciar notificações de push:", error);
            showNotification("Erro ao configurar notificações: " + (error instanceof Error ? error.message : String(error)));
        }
    }, [isSubscribedToPush, swRegistration, user, userRole]);

    const getDayOfWeek = (dateString: string): 'Sunday' | 'Wednesday' | null => {
        const date = new Date(dateString + 'T00:00:00');
        const dayIndex = date.getDay();
        if (dayIndex === 0) return 'Sunday';
        if (dayIndex === 3) return 'Wednesday';
        return null;
    };

    const getBaseCodeForClass = (className: string) => {
        switch (className) {
            case 'Maternal': return 100;
            case '2 a 3 anos': return 200;
            case '4 a 5 anos': return 300;
            case '6 a 7 anos': return 400;
            case '8 a 10 anos': return 500;
            case 'Seeds': return 600;
            default: return 900;
        }
    };

    const calculateDailyCode = (studentId: string | null, studentClass: string, date: string, currentStudents: Student[]) => {
        if (studentId) {
            const st = currentStudents.find(s => s.id === studentId);
            if (st) {
                const existingAtt = st.attendance.find(a => a.date === date && a.dailyCode);
                if (existingAtt && existingAtt.dailyCode) return existingAtt.dailyCode;
            }
        }

        const baseCode = getBaseCodeForClass(studentClass);
        let maxExistingCode = baseCode;

        currentStudents.forEach(s => {
            if (s.class === studentClass) {
                const att = s.attendance.find(a => a.date === date && a.dailyCode);
                if (att && att.dailyCode && att.dailyCode > maxExistingCode) {
                    maxExistingCode = att.dailyCode;
                }
            }
        });

        return maxExistingCode + 1;
    };

    const handleMarkPresence = useCallback(async (studentId: string, date: string) => {
        const dayOfWeek = getDayOfWeek(date);
        if (!dayOfWeek) {
            showNotification("A presença só pode ser marcada em Domingos ou Quartas-feiras.");
            return;
        }

        let assignedCode: number | undefined;

        const updatedStudents = students.map(s => {
            if (s.id === studentId) {
                assignedCode = calculateDailyCode(studentId, s.class, date, students);

                const exists = s.attendance.find(a => a.date === date);
                if (exists) return { ...s, attendance: s.attendance.map(a => a.date === date ? { ...a, present: true, day: dayOfWeek, dailyCode: assignedCode } : a) };
                return { ...s, attendance: [...s.attendance, { date, present: true, day: dayOfWeek, dailyCode: assignedCode }] };
            }
            return s;
        });

        setStudents(updatedStudents);
        saveDataLocally('students', updatedStudents);

        if (connectionStatus === 'connected') {
            try {
                await fetchWithAuth('/api/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, date, present: true, day: dayOfWeek, dailyCode: assignedCode })
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
                return { ...s, attendance: s.attendance.map(a => a.date === date ? { ...a, present: false, dismissedBy: null, dailyCode: null, readyToLeave: false } : a) };
            }
            return s;
        });

        setStudents(updatedStudents);
        saveDataLocally('students', updatedStudents);

        if (connectionStatus === 'connected') {
            try {
                await fetchWithAuth('/api/attendance', {
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

    const handleAddMember = async (formData: { name: string; class: string; age: number; guardianName: string; phone: string; birthday: string, hasAllergy?: boolean, allergyDescription?: string }) => {
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
                await fetchWithAuth('/api/students', {
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

    const handleAddVisitor = async (formData: { name: string; class: string; age: number; guardianName: string; phone: string; birthday: string, hasAllergy?: boolean, allergyDescription?: string }, date: string) => {
        const dayOfWeek = getDayOfWeek(date);
        if (!dayOfWeek) {
            showNotification("Novos visitantes só podem ser adicionados em dias de aula.");
            return;
        }

        const dailyCode = calculateDailyCode(null, formData.class, date, students);

        const newStudent = {
            id: String(Date.now()),
            ...formData,
            type: StudentType.Visitante,
            attendance: [{ date, present: true, day: dayOfWeek, dailyCode }]
        };

        const updatedStudents = [...students, newStudent];
        setStudents(updatedStudents);
        saveDataLocally('students', updatedStudents);

        if (connectionStatus === 'connected') {
            try {
                await fetchWithAuth('/api/students', {
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
        const newTopic = { id: String(Date.now() + Math.floor(Math.random() * 1000)), date, title, description };
        const updatedTopics = [...topics, newTopic].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTopics(updatedTopics);
        saveDataLocally('topics', updatedTopics);

        if (connectionStatus === 'connected') {
            try {
                await fetchWithAuth('/api/topics', {
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

    const handleEditTopic = useCallback(async (id: string, date: string, title: string, description: string) => {
        const updatedTopics = topics.map(t => t.id === id ? { ...t, date, title, description } : t);
        setTopics(updatedTopics);
        saveDataLocally('topics', updatedTopics);

        if (connectionStatus === 'connected') {
            try {
                await fetch(`/api/topics/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date, title, description })
                });
                showNotification(`Assunto "${title}" atualizado.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Assunto atualizado localmente.");
        }
    }, [topics, connectionStatus]);

    const handleDeleteTopic = useCallback(async (id: string) => {
        const tTitle = topics.find(t => t.id === id)?.title || 'Assunto';
        if (!window.confirm(`Tem certeza que deseja excluir o assunto "${tTitle}"?`)) return;

        const updatedTopics = topics.filter(t => t.id !== id);
        setTopics(updatedTopics);
        saveDataLocally('topics', updatedTopics);

        if (connectionStatus === 'connected') {
            try {
                await fetch(`/api/topics/${id}`, { method: 'DELETE' });
                showNotification(`Assunto excluído.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Excluído localmente.");
            }
        } else {
            showNotification("Excluído localmente.");
        }
    }, [topics, connectionStatus]);

    const handleImportTopics = useCallback(async (imported: Omit<Topic, 'id'>[]) => {
        const newTopics = imported.map((item, idx) => ({
            ...item,
            id: String(Date.now() + Math.floor(Math.random() * 10000) + idx)
        }));

        const updatedTopics = [...topics, ...newTopics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTopics(updatedTopics);
        saveDataLocally('topics', updatedTopics);

        if (connectionStatus === 'connected') {
            try {
                await Promise.all(newTopics.map(t => 
                    fetchWithAuth('/api/topics', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(t)
                    })
                ));
                showNotification(`${newTopics.length} assuntos importados com sucesso!`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Importação salva localmente.");
            }
        } else {
            showNotification("Importação salva localmente.");
        }
    }, [topics, connectionStatus]);

    const handleDismiss = useCallback(async (studentId: string, responsibleName: string, date: string) => {
        const updatedStudents = students.map(s => {
            if (s.id === studentId) {
                return { ...s, attendance: s.attendance.map(a => a.date === date ? { ...a, dismissedBy: responsibleName, readyToLeave: false, dailyCode: null } : a) };
            }
            return s;
        });

        setStudents(updatedStudents);
        saveDataLocally('students', updatedStudents);

        if (connectionStatus === 'connected') {
            try {
                await fetchWithAuth('/api/dismissal', {
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

    const handleToggleReadyToLeave = useCallback(async (studentId: string, date: string, readyToLeave: boolean) => {
        const updatedStudents = students.map(s => {
            if (s.id === studentId) {
                return { ...s, attendance: s.attendance.map(a => a.date === date ? { ...a, readyToLeave } : a) };
            }
            return s;
        });

        setStudents(updatedStudents);
        saveDataLocally('students', updatedStudents);

        if (connectionStatus === 'connected') {
            try {
                await fetchWithAuth('/api/attendance/ready', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, date, readyToLeave })
                });
                showNotification(readyToLeave ? "Fila de Saída alertada com sucesso!" : "Chamado de liberação cancelado.");
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente (Servidor offline).");
            }
        } else {
            showNotification("Alteração salva localmente.");
        }
    }, [students, connectionStatus]);

    const handleUndoDismissal = useCallback(async (studentId: string, date: string) => {
        const updatedStudents = students.map(s => {
            if (s.id === studentId) {
                return { ...s, attendance: s.attendance.map(a => a.date === date ? { ...a, dismissedBy: null, readyToLeave: false } : a) };
            }
            return s;
        });

        setStudents(updatedStudents);
        saveDataLocally('students', updatedStudents);

        if (connectionStatus === 'connected') {
            try {
                await fetchWithAuth('/api/attendance/undo-dismissal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, date })
                });
                showNotification("Liberação do aluno desfeita com sucesso.");
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Desfeito localmente (Offline).");
        }
    }, [students, connectionStatus]);

    const handleAddVolunteer = useCallback(async (volunteerProps: Omit<Volunteer, 'id'>) => {
        const newVolunteer: Volunteer = { id: String(Date.now()), ...volunteerProps };
        const updatedVolunteers = [...volunteers, newVolunteer];
        setVolunteers(updatedVolunteers);
        saveDataLocally('volunteers', updatedVolunteers);

        if (connectionStatus === 'connected') {
            try {
                await fetchWithAuth('/api/volunteers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(volunteerProps)
                });
                showNotification(`Professor ${volunteerProps.name} registrado.`);
            } catch (e) {
                setConnectionStatus('offline');
                showNotification("Salvo localmente.");
            }
        } else {
            showNotification("Professor salvo localmente.");
        }
    }, [volunteers, connectionStatus]);

    const handleEditVolunteer = useCallback(async (id: string, volunteerProps: Omit<Volunteer, 'id'>) => {
        const updatedVolunteers = volunteers.map(v => v.id === id ? { ...v, ...volunteerProps } : v);
        setVolunteers(updatedVolunteers);
        saveDataLocally('volunteers', updatedVolunteers);

        if (connectionStatus === 'connected') {
            try {
                await fetch(`/api/volunteers/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(volunteerProps)
                });
                showNotification(`Professor ${volunteerProps.name} atualizado.`);
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
                await fetchWithAuth('/api/schedule', {
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
            const response = await fetchWithAuth('/api/save-all', {
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

        if (userRole === 'Visitante') {
            return (
                <div className="flex flex-col items-center justify-center px-4 py-16 min-h-[75vh]">
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
                        {/* Decorative Top Accent */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-blue to-blue-600"></div>
                        
                        <div className="relative mb-8 mt-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-center justify-center">
                            <img
                                src={LOGO_URL}
                                alt="Mundo Kids Logo"
                                className="h-24 w-auto object-contain animate-pulse"
                            />
                        </div>
                        
                        <h2 className="text-3xl font-extrabold text-brand-dark mb-4">
                            Mundo Kids
                        </h2>
                        
                        <h3 className="text-lg font-bold text-gray-700 mb-2">
                            Acesso em Análise
                        </h3>
                        
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                            Seu usuário está atualmente cadastrado como <strong>Visitante</strong>.
                            Nesta modalidade, você não possui permissões de acesso às ferramentas de chamada, escalas ou relatórios.
                        </p>
                        
                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-left w-full mb-6">
                            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                                🔑 Como liberar o acesso?
                            </h4>
                            <p className="text-xs text-amber-900 leading-relaxed font-medium">
                                Solicite à <strong>coordenação</strong> do Ministério Infantil a liberação de perfil adequado para o seu papel (Ministra, Supervisora ou Coordenadora).
                            </p>
                        </div>
                        
                        <p className="text-[11px] text-gray-400">
                            Caso queira alternar sua conta, clique no ícone de perfil no topo direito para fazer logout.
                        </p>
                    </div>
                </div>
            );
        }

        switch (view) {
            case View.Home:
                return <Dashboard
                    students={students}
                    selectedClass={selectedClass}
                    onClassChange={setSelectedClass}
                    userRole={userRole!}
                />;
            case View.Attendance:
                return (
                    <AttendanceComponent 
                        students={students} 
                        onMarkPresence={handleMarkPresence} 
                        onUnmarkPresence={handleUnmarkPresence} 
                        onAddVisitor={handleAddVisitor} 
                        onDismiss={handleDismiss}
                        onUndoDismissal={handleUndoDismissal}
                        onToggleReadyToLeave={handleToggleReadyToLeave}
                        selectedClass={selectedClass} 
                        onClassChange={setSelectedClass} 
                        userRole={userRole!} 
                    />
                );
            case View.Students:
                return <Students students={students} onAddStudent={handleAddMember} onEditStudent={handleEditStudent} onDeleteStudent={handleDeleteStudent} onMakeMember={handleMakeMember} selectedClass={selectedClass} onClassChange={setSelectedClass} userRole={userRole!} />;
            case View.Schedule:
                return <Schedule schedule={schedule} volunteers={volunteers} selectedClass={selectedClass} onClassChange={setSelectedClass} onAddSchedule={handleAddSchedule} onEditSchedule={handleEditSchedule} onDeleteSchedule={handleDeleteSchedule} userRole={userRole!} />;
            case View.Volunteers:
                return <Volunteers volunteers={volunteers} onAddVolunteer={handleAddVolunteer} onEditVolunteer={handleEditVolunteer} onDeleteVolunteer={handleDeleteVolunteer} userRole={userRole!} />;
            case View.Topics:
                return (
                    <Topics 
                        topics={topics} 
                        onAddTopic={handleAddTopic} 
                        onEditTopic={handleEditTopic} 
                        onDeleteTopic={handleDeleteTopic} 
                        onImportTopics={handleImportTopics} 
                        userRole={userRole!} 
                        fetchWithAuth={fetchWithAuth}
                    />
                );
            case View.Reports:
                return <Reports students={students} volunteers={volunteers} schedule={schedule} />;
            case View.Admin:
                return <Admin userRole={userRole!} fetchWithAuth={fetchWithAuth} />;
            default:
                return <Dashboard students={students} selectedClass={selectedClass} onClassChange={setSelectedClass} userRole={userRole!} />;
        }
    };

    if (!isLoaded) {
        return (
            <div className="flex bg-brand-light min-h-screen flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-light font-sans relative">
            <SignedOut>
                <div className="flex min-h-screen items-center justify-center p-4">
                    <SignIn appearance={{ elements: { formButtonPrimary: 'bg-brand-blue hover:bg-blue-600', card: 'shadow-xl rounded-xl' } }} />
                </div>
            </SignedOut>
            <SignedIn>
                <Header
                    currentView={view}
                    onNavigate={setView}
                    userRole={userRole}
                    isSubscribedToPush={isSubscribedToPush}
                    onTogglePush={togglePushSubscription}
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

                <main className="container mx-auto pb-20 md:pb-4">
                    {renderView()}
                </main>

                {notification && (
                    <div className="fixed bottom-20 right-4 md:bottom-5 md:right-5 bg-brand-dark text-white py-2 px-4 rounded-lg shadow-lg animate-bounce z-50">
                        {notification}
                    </div>
                )}
            </SignedIn>
        </div>
    );
};

export default App;