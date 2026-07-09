import React, { useState, useMemo } from 'react';
import { Student, StudentType, UserRole } from '../types';
import StudentForm from './StudentForm';
import { SearchIcon, CalendarIcon } from './icons';
import { CLASS_NAMES } from '../constants';
import { calculateAge } from '../utils';
import Modal from './Modal';

interface AttendanceProps {
    students: Student[];
    onMarkPresence: (studentId: string, date: string) => void;
    onUnmarkPresence: (studentId: string, date: string) => void;
    onAddVisitor: (formData: { name: string; class: string; age: number; guardianName: string; phone: string; birthday: string; hasAllergy?: boolean; allergyDescription?: string; }, date: string) => void;
    onDismiss: (studentId: string, responsibleName: string, date: string) => void;
    onUndoDismissal: (studentId: string, date: string) => void;
    onToggleReadyToLeave: (studentId: string, date: string, readyToLeave: boolean) => void;
    selectedClass: string;
    onClassChange: (className: string) => void;
    userRole: UserRole;
    autoPrintEnabled: boolean;
    onToggleAutoPrint: (enabled: boolean) => void;
    remotePrintEnabled: boolean;
    onToggleRemotePrint: (enabled: boolean) => void;
    onPrintLabel: (studentId: string) => void;
}

const getDayFromDate = (dateString: string): 'Sunday' | 'Wednesday' | null => {
    const d = new Date(dateString + 'T00:00:00');
    const dayIndex = d.getDay();
    if (dayIndex === 0) return 'Sunday';
    if (dayIndex === 3) return 'Wednesday';
    return null;
}

const Attendance: React.FC<AttendanceProps> = ({ 
    students, 
    onMarkPresence, 
    onUnmarkPresence, 
    onAddVisitor, 
    onDismiss,
    onUndoDismissal,
    onToggleReadyToLeave,
    selectedClass, 
    onClassChange, 
    userRole,
    autoPrintEnabled,
    onToggleAutoPrint,
    remotePrintEnabled,
    onToggleRemotePrint,
    onPrintLabel
}) => {
    const [activeTab, setActiveTab] = useState<'Membro' | 'Visitante'>('Membro');
    const [searchTerm, setSearchTerm] = useState('');
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [date, setDate] = useState(todayStr);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    // Modal state for releasing student
    const [releasingStudent, setReleasingStudent] = useState<Student | null>(null);
    const [guardianName, setGuardianName] = useState('');

    // Derive the selected student from the current students prop to ensure we always have the latest data
    const selectedStudentForHistory = useMemo(() =>
        students.find(s => s.id === selectedStudentId) || null
        , [students, selectedStudentId]);

    const studentsForClass = selectedClass === 'All'
        ? students
        : students.filter(s => s.class === selectedClass);

    // Filter active queue (Ready to leave, present today, not yet dismissed)
    const awaitingReleaseStudents = useMemo(() => {
        return students.filter(s => {
            const classMatch = selectedClass === 'All' || s.class === selectedClass;
            const todayAtt = s.attendance.find(a => a.date === date);
            return classMatch && todayAtt && todayAtt.present && todayAtt.readyToLeave && !todayAtt.dismissedBy;
        });
    }, [students, selectedClass, date]);

    const filteredMembers = useMemo(() => {
        return studentsForClass
            .filter(s =>
                s.type === StudentType.Membro &&
                (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone.includes(searchTerm))
            )
            .sort((a, b) => {
                const attA = a.attendance.find(att => att.date === date);
                const attB = b.attendance.find(att => att.date === date);
                
                const presentA = attA?.present || false;
                const presentB = attB?.present || false;
                
                if (presentA !== presentB) {
                    return presentA ? -1 : 1;
                }
                
                if (presentA && presentB) {
                    const codeA = attA?.dailyCode || 999999;
                    const codeB = attB?.dailyCode || 999999;
                    if (codeA !== codeB) {
                        return codeA - codeB;
                    }
                }
                
                return a.name.localeCompare(b.name);
            });
    }, [studentsForClass, date, searchTerm]);

    const visitors = useMemo(() => {
        return studentsForClass
            .filter(s => s.type === StudentType.Visitante)
            .sort((a, b) => {
                const attA = a.attendance.find(att => att.date === date);
                const attB = b.attendance.find(att => att.date === date);
                
                const presentA = attA?.present || false;
                const presentB = attB?.present || false;
                
                if (presentA !== presentB) {
                    return presentA ? -1 : 1;
                }
                
                if (presentA && presentB) {
                    const codeA = attA?.dailyCode || 999999;
                    const codeB = attB?.dailyCode || 999999;
                    if (codeA !== codeB) {
                        return codeA - codeB;
                    }
                }
                
                return a.name.localeCompare(b.name);
            });
    }, [studentsForClass, date]);

    const getStudentStatus = (student: Student) => {
        const attendanceForDate = student.attendance.find(a => a.date === date);
        if (attendanceForDate?.present) {
            if (attendanceForDate.dismissedBy) {
                return <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Entregue</span>;
            }
            if (attendanceForDate.readyToLeave) {
                return <span className="text-amber-600 font-extrabold text-xs bg-amber-50 px-2 py-1 rounded border border-amber-100 animate-pulse">Aguardando</span>;
            }
            return <span className="text-green-600 font-semibold text-xs bg-green-50 px-2 py-1 rounded border border-green-100">Presente</span>;
        }
        return <span className="text-gray-400 text-xs">Ausente</span>;
    };

    const handleAddVisitorSubmit = (formData: { name: string; class: string; age: number; guardianName: string; phone: string; birthday: string; hasAllergy?: boolean; allergyDescription?: string; }) => {
        onAddVisitor(formData, date);
        setActiveTab('Membro'); // Switch back to member tab after adding
    };

    const handleViewHistory = (studentId: string) => {
        setSelectedStudentId(studentId);
        setHistoryModalOpen(true);
    };

    const handleCloseHistoryModal = () => {
        setHistoryModalOpen(false);
        setSelectedStudentId(null);
    };

    // Open Release Modal
    const handleStartRelease = (student: Student) => {
        setReleasingStudent(student);
        setGuardianName(student.guardianName || '');
    };

    // Submit Release Confirmation
    const handleConfirmRelease = (e: React.FormEvent) => {
        e.preventDefault();
        if (releasingStudent && guardianName.trim()) {
            onDismiss(releasingStudent.id, guardianName.trim(), date);
            setReleasingStudent(null);
            setGuardianName('');
        }
    };

    const selectedDay = useMemo(() => {
        const day = getDayFromDate(date);
        if (day === 'Sunday') return { name: 'Domingo', important: true };
        if (day === 'Wednesday') return { name: 'Quarta-feira', important: false };
        return { name: '', important: false };
    }, [date]);

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                <h2 className="text-3xl font-bold text-brand-dark mb-4 sm:mb-0">Marcar Presença</h2>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Auto Print Toggle Switch */}
                    <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm flex items-center gap-3 shrink-0">
                        <label htmlFor="toggle-auto-print" className="text-sm font-bold text-gray-500 whitespace-nowrap flex items-center gap-1.5 cursor-pointer">
                            🖨️ Impressão Automática
                        </label>
                        <button
                            id="toggle-auto-print"
                            type="button"
                            onClick={() => onToggleAutoPrint(!autoPrintEnabled)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoPrintEnabled ? 'bg-brand-blue' : 'bg-gray-200'}`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoPrintEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>

                    {/* Remote Print Toggle Switch */}
                    <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm flex items-center gap-3 shrink-0">
                        <label htmlFor="toggle-remote-print" className="text-sm font-bold text-gray-500 whitespace-nowrap flex items-center gap-1.5 cursor-pointer">
                            🌐 Fila Remota (Windows)
                        </label>
                        <button
                            id="toggle-remote-print"
                            type="button"
                            onClick={() => onToggleRemotePrint(!remotePrintEnabled)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${remotePrintEnabled ? 'bg-brand-blue' : 'bg-gray-200'}`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${remotePrintEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 shrink-0">
                        <label htmlFor="attendance-date-picker" className="text-sm font-bold text-gray-550 whitespace-nowrap">Data da Aula:</label>
                        <input
                            id="attendance-date-picker"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-0.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white shrink-0"
                        />
                        {selectedDay.name ? (
                            <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${selectedDay.important ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                {selectedDay.name}
                            </span>
                        ) : (
                            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
                                Fora do dia de Aula
                            </span>
                        )}
                    </div>
                    <div className="flex items-center w-full">
                        <label htmlFor="class-select-attendance" className="mr-2 text-sm font-medium text-gray-600 font-bold whitespace-nowrap">Filtrar Sala:</label>
                        <select
                            id="class-select-attendance"
                            value={selectedClass}
                            onChange={(e) => onClassChange(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2 font-semibold"
                        >
                            <option value="All">Todas as Turmas</option>
                            {CLASS_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* --- REAL-TIME CLASSROOM DISMISSAL QUEUE PANEL --- */}
            {selectedDay.name && awaitingReleaseStudents.length > 0 && (
                <div className="mb-6 w-full max-w-2xl mx-auto bg-amber-50/50 border border-amber-200 rounded-xl p-5 shadow-sm transition-all duration-300">
                  <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-amber-200/60">
                    <h3 className="text-base font-bold text-amber-900 flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </span>
                      🚨 Fila de Saída - Aguardando Liberação ({awaitingReleaseStudents.length})
                    </h3>
                    <span className="text-[10px] bg-amber-150 text-amber-800 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                      Ministras: Entregar Criança
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {awaitingReleaseStudents.map(student => {
                      const dailyCode = student.attendance.find(a => a.date === date)?.dailyCode;
                      return (
                        <div key={student.id} className="bg-white rounded-xl p-3 border border-amber-200/80 shadow-md flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {dailyCode ? (
                              <div className="relative w-12 h-12 flex-shrink-0">
                                <div className="w-full h-full rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                                  {student.photo ? (
                                    <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-gray-400 text-xl select-none">👤</span>
                                  )}
                                </div>
                                <div className="absolute -bottom-1.5 -right-1.5 bg-brand-blue text-white rounded-full px-1.5 py-0.5 text-[9px] font-black border border-white leading-none shadow-md">
                                  #{dailyCode}
                                </div>
                              </div>
                            ) : (
                              <div className="w-12 h-12 flex-shrink-0 rounded-full overflow-hidden border border-gray-150 bg-gray-50 flex items-center justify-center">
                                {student.photo ? (
                                  <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-gray-400 text-xl select-none">👤</span>
                                )}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate">{student.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold text-gray-400">{calculateAge(student.birthday, student.age)} anos</span>
                                <span className="text-[9px] font-extrabold bg-brand-blue/10 text-brand-blue px-1.5 py-0.2 rounded uppercase">
                                  {student.class}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleStartRelease(student)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-lg text-xs transition shadow-sm whitespace-nowrap flex items-center gap-1 flex-shrink-0"
                          >
                            🚪 Liberar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
            )}

            <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
                {!selectedDay.name && (
                    <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-amber-800 shadow-sm flex items-start gap-3">
                        <span className="text-xl mt-0.5">⚠️</span>
                        <div>
                            <p className="font-bold text-amber-900">Marcação de Presença Desabilitada</p>
                            <p className="text-sm text-amber-800">A chamada online e cadastro de novos alunos só podem ser realizados às <strong>Quartas-feiras</strong> ou <strong>Domingos</strong>. Hoje o painel está aberto apenas para consulta.</p>
                        </div>
                    </div>
                )}
                <div className="flex border-b mb-6">
                    <button onClick={() => setActiveTab('Membro')} className={`py-2 px-4 text-lg font-semibold transition-colors ${activeTab === 'Membro' ? 'border-b-2 border-brand-blue text-brand-blue' : 'text-gray-500'}`}>
                        Membro
                    </button>
                    <button onClick={() => setActiveTab('Visitante')} className={`py-2 px-4 text-lg font-semibold transition-colors ${activeTab === 'Visitante' ? 'border-b-2 border-brand-blue text-brand-blue' : 'text-gray-500'}`}>
                        Visitante
                    </button>
                </div>

                {activeTab === 'Membro' && (
                    <div>
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Buscar por nome ou telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <SearchIcon />
                            </div>
                        </div>
                        <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                            {filteredMembers.map(student => {
                                const attRecord = student.attendance.find(a => a.date === date);
                                const isPresent = !!attRecord?.present;
                                const isDismissed = isPresent && !!attRecord?.dismissedBy;
                                const isAwaitingRelease = isPresent && !!attRecord?.readyToLeave && !isDismissed;

                                return (
                                    <li key={student.id} className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 overflow-hidden">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {isPresent && attRecord?.dailyCode ? (
                                                <div className="relative w-10 h-10 flex-shrink-0">
                                                    <div className="w-full h-full rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                                                        {student.photo ? (
                                                            <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-gray-400 text-lg select-none">👤</span>
                                                        )}
                                                    </div>
                                                    <div className="absolute -bottom-1.5 -right-1.5 bg-brand-blue text-white rounded-full px-1.5 py-0.5 text-[9px] font-black border border-white leading-none shadow-md">
                                                        #{attRecord.dailyCode}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-150 bg-gray-50 flex items-center justify-center">
                                                    {student.photo ? (
                                                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-gray-400 text-lg select-none">👤</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-gray-800 truncate">{student.name}</p>
                                                    {isPresent && attRecord?.dailyCode && (
                                                        <span className="inline-flex items-center bg-blue-50 text-brand-blue text-[10px] font-black px-1.5 py-0.5 rounded border border-blue-200 leading-none shadow-sm uppercase tracking-wide shrink-0">
                                                            Nº {attRecord.dailyCode}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{calculateAge(student.birthday, student.age)} anos</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-end flex-wrap gap-2.5">
                                            {/* History shortcut */}
                                            <button onClick={() => handleViewHistory(student.id)} className="text-gray-400 hover:text-brand-blue p-1 rounded-full" title="Ver Histórico">
                                                <CalendarIcon className="h-5 w-5" />
                                            </button>

                                            {/* Status Badge */}
                                            <div className="text-right min-w-[70px]">{getStudentStatus(student)}</div>

                                            {/* Dismissal flow logic */}
                                            {isPresent && (
                                                <div className="flex gap-2">
                                                    {isDismissed ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[11px] text-gray-500 font-semibold bg-gray-100 border px-2 py-1 rounded line-clamp-1" title={`Entregue para: ${attRecord.dismissedBy}`}>
                                                                Entregue: {attRecord.dismissedBy}
                                                            </span>
                                                            <button
                                                                onClick={() => onUndoDismissal(student.id, date)}
                                                                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded font-bold transition"
                                                                title="Desfazer liberação de saída"
                                                            >
                                                                Desfazer
                                                            </button>
                                                        </div>
                                                    ) : isAwaitingRelease ? (
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                onClick={() => handleStartRelease(student)}
                                                                className="px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition"
                                                            >
                                                                Liberar
                                                            </button>
                                                            <button
                                                                onClick={() => onToggleReadyToLeave(student.id, date, false)}
                                                                className="px-2.5 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-300 transition"
                                                                title="Cancelar chamado de saída"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => onToggleReadyToLeave(student.id, date, true)}
                                                            disabled={!selectedDay.name}
                                                            className="px-3 py-1 bg-amber-50/50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Chamar aluno para saída (Fila de liberação)"
                                                        >
                                                            🛎️ Pronto p/ Sair
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Presence toggle button */}
                                            {!isDismissed && (
                                                isPresent ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => onPrintLabel(student.id)}
                                                            className="p-1 text-gray-500 hover:text-brand-blue hover:bg-gray-100 rounded transition"
                                                            title="Reimprimir Etiqueta"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => onUnmarkPresence(student.id, date)}
                                                            disabled={!selectedDay.name}
                                                            className="px-3.5 py-1 bg-brand-yellow text-white rounded-lg hover:bg-yellow-600 transition text-xs font-semibold w-24 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Desmarcar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => onMarkPresence(student.id, date)}
                                                        disabled={!selectedDay.name}
                                                        className="px-3.5 py-1 bg-brand-green text-white rounded-lg hover:bg-green-600 transition text-xs font-semibold w-24 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Marcar
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {activeTab === 'Visitante' && (
                    <div>
                        {userRole !== 'Ministra' && (
                            <>
                                <h3 className="text-xl font-semibold text-brand-dark mb-4">Cadastrar Novo Aluno (Visitante)</h3>
                                {!selectedDay.name ? (
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 mb-6 text-sm">
                                        O cadastro de novos visitantes está desabilitado hoje pois não é um dia de aula (Domingo ou Quarta-feira).
                                    </div>
                                ) : (
                                    <StudentForm onSubmit={handleAddVisitorSubmit} onCancel={() => setActiveTab('Membro')} students={students} />
                                )}
                            </>
                        )}

                        <div className="mt-8">
                            <h3 className="text-xl font-semibold text-brand-dark mb-4 border-t pt-6">Visitantes Atuais</h3>
                            {visitors.length > 0 ? (
                                <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                    {visitors.map(visitor => {
                                        const attRecord = visitor.attendance.find(a => a.date === date);
                                        const isPresent = !!attRecord?.present;
                                        const isDismissed = isPresent && !!attRecord?.dismissedBy;
                                        const isAwaitingRelease = isPresent && !!attRecord?.readyToLeave && !isDismissed;

                                        return (
                                            <li key={visitor.id} className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 overflow-hidden">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {isPresent && attRecord?.dailyCode ? (
                                                        <div className="relative w-10 h-10 flex-shrink-0">
                                                            <div className="w-full h-full rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                                                                {visitor.photo ? (
                                                                    <img src={visitor.photo} alt={visitor.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-gray-400 text-lg select-none">👤</span>
                                                                )}
                                                            </div>
                                                            <div className="absolute -bottom-1.5 -right-1.5 bg-brand-blue text-white rounded-full px-1.5 py-0.5 text-[9px] font-black border border-white leading-none shadow-md">
                                                                #{attRecord.dailyCode}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-150 bg-gray-50 flex items-center justify-center">
                                                            {visitor.photo ? (
                                                                <img src={visitor.photo} alt={visitor.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-gray-400 text-lg select-none">👤</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-bold text-gray-800 truncate">{visitor.name}</p>
                                                            {isPresent && attRecord?.dailyCode && (
                                                                <span className="inline-flex items-center bg-blue-50 text-brand-blue text-[10px] font-black px-1.5 py-0.5 rounded border border-blue-200 leading-none shadow-sm uppercase tracking-wide shrink-0">
                                                                    Nº {attRecord.dailyCode}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5">{visitor.class} - {calculateAge(visitor.birthday, visitor.age)} anos</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-end flex-wrap gap-2.5">
                                                    {/* History shortcut */}
                                                    <button onClick={() => handleViewHistory(visitor.id)} className="text-gray-400 hover:text-brand-blue p-1 rounded-full" title="Ver Histórico">
                                                        <CalendarIcon className="h-5 w-5" />
                                                    </button>

                                                    {/* Status Badge */}
                                                    <div className="text-right min-w-[70px]">{getStudentStatus(visitor)}</div>

                                                    {/* Dismissal flow logic */}
                                                    {isPresent && (
                                                        <div className="flex gap-2">
                                                            {isDismissed ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[11px] text-gray-500 font-semibold bg-gray-100 border px-2 py-1 rounded line-clamp-1" title={`Entregue para: ${attRecord.dismissedBy}`}>
                                                                        Entregue: {attRecord.dismissedBy}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => onUndoDismissal(visitor.id, date)}
                                                                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded font-bold transition"
                                                                    >
                                                                        Desfazer
                                                                    </button>
                                                                </div>
                                                            ) : isAwaitingRelease ? (
                                                                <div className="flex gap-1.5">
                                                                    <button
                                                                        onClick={() => handleStartRelease(visitor)}
                                                                        className="px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition"
                                                                    >
                                                                        Liberar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => onToggleReadyToLeave(visitor.id, date, false)}
                                                                        className="px-2.5 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-300 transition"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => onToggleReadyToLeave(visitor.id, date, true)}
                                                                    disabled={!selectedDay.name}
                                                                    className="px-3 py-1 bg-amber-50/50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    🛎️ Pronto p/ Sair
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Presence toggle button */}
                                                    {!isDismissed && (
                                                        isPresent ? (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => onPrintLabel(visitor.id)}
                                                                    className="p-1 text-gray-500 hover:text-brand-blue hover:bg-gray-100 rounded transition"
                                                                    title="Reimprimir Etiqueta"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => onUnmarkPresence(visitor.id, date)}
                                                                    disabled={!selectedDay.name}
                                                                    className="px-3.5 py-1 bg-brand-yellow text-white rounded-lg hover:bg-yellow-600 transition text-xs font-semibold w-24 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    Desmarcar
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => onMarkPresence(visitor.id, date)}
                                                                disabled={!selectedDay.name}
                                                                className="px-3.5 py-1 bg-brand-green text-white rounded-lg hover:bg-green-600 transition text-xs font-semibold w-24 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Marcar
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500 py-4">Nenhum visitante cadastrado{selectedClass !== 'All' ? ' nesta turma' : ''}.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* IN-PLACE HISTORY MODAL */}
            <Modal isOpen={historyModalOpen} onClose={handleCloseHistoryModal} title={`Histórico de ${selectedStudentForHistory?.name}`}>
                {selectedStudentForHistory && <AttendanceHistory student={selectedStudentForHistory} allStudents={students} />}
            </Modal>

            {/* CONFIRM DISMISSAL/RELEASE MODAL */}
            {releasingStudent && (
                <Modal isOpen={!!releasingStudent} onClose={() => setReleasingStudent(null)} title="Liberar Aluno">
                    <form onSubmit={handleConfirmRelease} className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 text-sm font-semibold">
                            <span className="block text-amber-800 text-xs uppercase font-extrabold tracking-wide mb-1">Entrega de Aluno</span>
                            Liberando o aluno <span className="text-brand-dark font-extrabold text-base block mt-0.5">{releasingStudent.name}</span>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                Nome do Responsável que retira a criança:
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: João da Silva (Pai)"
                                value={guardianName}
                                onChange={e => setGuardianName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm bg-white font-semibold text-gray-800"
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="submit"
                                className="flex-1 bg-brand-green hover:bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold transition text-sm shadow-sm flex items-center justify-center gap-1.5"
                            >
                                ✓ Confirmar Liberação
                            </button>
                            <button
                                type="button"
                                onClick={() => setReleasingStudent(null)}
                                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-bold hover:bg-gray-300 transition text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};


const AttendanceHistory: React.FC<{ student: Student, allStudents: Student[] }> = ({ student, allStudents }) => {
    const today = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const [startDate, setStartDate] = useState(ninetyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    const allClassDates = useMemo(() => {
        const dates = new Set<string>();
        allStudents.forEach(s => {
            s.attendance.forEach(a => {
                // Only consider valid class days for history
                if (getDayFromDate(a.date)) {
                    dates.add(a.date);
                }
            });
        });
        return Array.from(dates).sort((a, b) => b.localeCompare(a));
    }, [allStudents]);

    const stats = useMemo(() => {
        const studentAttendanceByDate = new Map(student.attendance.map(a => [a.date, a]));
        const filteredClassDates = allClassDates.filter(date => date >= startDate && date <= endDate);

        let presentSundays = 0, presentWednesdays = 0;
        let dismissedSundays = 0, dismissedWednesdays = 0;
        const history: { date: string, present: boolean, dismissedBy: string | null | undefined, day: 'Sunday' | 'Wednesday' | null }[] = [];

        for (const date of filteredClassDates) {
            const attendanceRecord = studentAttendanceByDate.get(date);
            const day = attendanceRecord?.day || getDayFromDate(date);

            if (day) {
                const isPresent = !!attendanceRecord?.present;
                history.push({ date, present: isPresent, dismissedBy: attendanceRecord?.dismissedBy, day });

                if (isPresent) {
                    if (day === 'Sunday') {
                        presentSundays++;
                        if (attendanceRecord.dismissedBy) dismissedSundays++;
                    } else {
                        presentWednesdays++;
                        if (attendanceRecord.dismissedBy) dismissedWednesdays++;
                    }
                }
            }
        }

        const totalSundays = filteredClassDates.filter(d => getDayFromDate(d) === 'Sunday').length;
        const totalWednesdays = filteredClassDates.filter(d => getDayFromDate(d) === 'Wednesday').length;

        history.sort((a, b) => b.date.localeCompare(a.date));

        return {
            presentSundays, presentWednesdays,
            dismissedSundays, dismissedWednesdays,
            absentSundays: totalSundays - presentSundays,
            absentWednesdays: totalWednesdays - presentWednesdays,
            history
        };

    }, [student, allClassDates, startDate, endDate]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <div>
                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">De:</label>
                    <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">Até:</label>
                    <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-purple-200 bg-purple-50 rounded-lg p-3">
                    <h4 className="font-bold text-center text-brand-purple mb-2">Domingos (Principal)</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-green-100 p-2 rounded">
                            <p className="text-xl font-bold text-green-800">{stats.presentSundays}</p>
                            <p className="text-xs font-medium text-green-700">Presente</p>
                        </div>
                        <div className="bg-red-100 p-2 rounded">
                            <p className="text-xl font-bold text-red-800">{stats.absentSundays}</p>
                            <p className="text-xs font-medium text-red-700">Ausente</p>
                        </div>
                        <div className="bg-blue-100 p-2 rounded">
                            <p className="text-xl font-bold text-blue-800">{stats.dismissedSundays}</p>
                            <p className="text-xs font-medium text-blue-700">Saídas</p>
                        </div>
                    </div>
                </div>
                <div className="border border-gray-200 bg-gray-50 rounded-lg p-3">
                    <h4 className="font-bold text-center text-gray-600 mb-2">Quartas-feiras</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-green-100 p-2 rounded">
                            <p className="text-xl font-bold text-green-800">{stats.presentWednesdays}</p>
                            <p className="text-xs font-medium text-green-700">Presente</p>
                        </div>
                        <div className="bg-red-100 p-2 rounded">
                            <p className="text-xl font-bold text-red-800">{stats.absentWednesdays}</p>
                            <p className="text-xs font-medium text-red-700">Ausente</p>
                        </div>
                        <div className="bg-blue-100 p-2 rounded">
                            <p className="text-xl font-bold text-blue-800">{stats.dismissedWednesdays}</p>
                            <p className="text-xs font-medium text-blue-700">Saídas</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto border-t pt-4 pr-2">
                <ul className="divide-y divide-gray-200">
                    {stats.history.map(record => (
                        <li key={record.date} className="py-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        <span className={`text-xs font-normal ml-2 ${record.day === 'Sunday' ? 'text-purple-600' : 'text-gray-500'}`}>
                                            ({record.day === 'Sunday' ? 'Domingo' : 'Quarta-feira'})
                                        </span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {record.present ?
                                        (<span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800">Presente</span>) :
                                        (<span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-800">Ausente</span>)
                                    }
                                    {record.dismissedBy && (
                                        <p className="text-sm text-gray-600">Saída: {record.dismissedBy}</p>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
                {stats.history.length === 0 && <p className="text-center text-gray-500 py-4">Nenhum registro encontrado para o período.</p>}
            </div>
        </div>
    );
};

export default Attendance;
