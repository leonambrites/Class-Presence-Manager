import React, { useState, useMemo } from 'react';
import { Student, StudentType } from '../types';
import StudentForm from './StudentForm';
import { SearchIcon, CalendarIcon } from './icons';
import { CLASS_NAMES } from '../constants';
import Modal from './Modal';

interface AttendanceProps {
  students: Student[];
  onMarkPresence: (studentId: string, date: string) => void;
  onUnmarkPresence: (studentId: string, date: string) => void;
  onAddVisitor: (formData: { name: string; class: string; age: number; motherName: string; phone: string }, date: string) => void;
  selectedClass: string;
  onClassChange: (className: string) => void;
}

const getDayFromDate = (dateString: string): 'Sunday' | 'Wednesday' | null => {
    const d = new Date(dateString + 'T00:00:00');
    const dayIndex = d.getDay();
    if (dayIndex === 0) return 'Sunday';
    if (dayIndex === 3) return 'Wednesday';
    return null;
}

const Attendance: React.FC<AttendanceProps> = ({ students, onMarkPresence, onUnmarkPresence, onAddVisitor, selectedClass, onClassChange }) => {
  const [activeTab, setActiveTab] = useState<'Membro' | 'Visitante'>('Membro');
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);

  const studentsForClass = selectedClass === 'All'
    ? students
    : students.filter(s => s.class === selectedClass);

  const filteredMembers = studentsForClass
    .filter(s =>
      s.type === StudentType.Membro &&
      (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone.includes(searchTerm))
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const visitors = studentsForClass
    .filter(s => s.type === StudentType.Visitante)
    .sort((a, b) => a.name.localeCompare(b.name));

  const getStudentStatus = (student: Student) => {
    const attendanceForDate = student.attendance.find(a => a.date === date);
    if (attendanceForDate?.present) {
      return <span className="text-green-600 font-semibold">Presente</span>;
    }
    return <span className="text-gray-500">Ausente</span>;
  };

  const handleAddVisitorSubmit = (formData: { name: string; class: string; age: number; motherName: string; phone: string }) => {
    onAddVisitor(formData, date);
    setActiveTab('Membro'); // Switch back to member tab after adding
  };
  
  const handleViewHistory = (student: Student) => {
    setSelectedStudentForHistory(student);
    setHistoryModalOpen(true);
  };

  const handleCloseHistoryModal = () => {
    setHistoryModalOpen(false);
    setSelectedStudentForHistory(null);
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
            <div>
                <label htmlFor="date-select-attendance" className="mr-2 text-sm font-medium text-gray-600">
                  Data da Aula:
                  {selectedDay.name && (
                    <span className={`ml-2 font-semibold ${selectedDay.important ? 'text-brand-purple' : 'text-gray-700'}`}>
                      {selectedDay.name}{selectedDay.important && ' (Principal)'}
                    </span>
                  )}
                </label>
                <input 
                    id="date-select-attendance"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2"
                />
            </div>
            <div className="flex items-center w-full">
              <label htmlFor="class-select-attendance" className="mr-2 text-sm font-medium text-gray-600">Turma:</label>
              <select
                  id="class-select-attendance"
                  value={selectedClass}
                  onChange={(e) => onClassChange(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2"
              >
                  <option value="All">Todas as Turmas</option>
                  {CLASS_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
        </div>
      </div>
      <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
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
            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {filteredMembers.map(student => {
                const isPresent = student.attendance.some(a => a.date === date && a.present);
                return (
                    <li key={student.id} className="py-3 flex justify-between items-center">
                    <div>
                        <p className="font-medium text-gray-800">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.age} anos</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => handleViewHistory(student)} className="text-gray-500 hover:text-brand-blue p-1 rounded-full" title="Ver Histórico">
                            <CalendarIcon className="h-5 w-5" />
                        </button>
                        <div className="w-20 text-center">{getStudentStatus(student)}</div>
                        {isPresent ? (
                            <button
                                onClick={() => onUnmarkPresence(student.id, date)}
                                className="px-4 py-1 bg-brand-yellow text-white rounded-full hover:bg-yellow-600 transition w-28 text-center"
                            >
                                Desmarcar
                            </button>
                        ) : (
                            <button
                                onClick={() => onMarkPresence(student.id, date)}
                                className="px-4 py-1 bg-brand-green text-white rounded-full hover:bg-green-600 transition w-28 text-center"
                            >
                                Marcar
                            </button>
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
                <h3 className="text-xl font-semibold text-brand-dark mb-4">Cadastrar Novo Aluno (Visitante)</h3>
                <StudentForm onSubmit={handleAddVisitorSubmit} onCancel={() => setActiveTab('Membro')} />

                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-brand-dark mb-4 border-t pt-6">Visitantes Atuais</h3>
                  {visitors.length > 0 ? (
                      <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                          {visitors.map(visitor => {
                            const isPresent = visitor.attendance.some(a => a.date === date && a.present);
                            return (
                              <li key={visitor.id} className="py-3 flex justify-between items-center">
                                  <div>
                                      <p className="font-medium text-gray-800">{visitor.name}</p>
                                      <p className="text-sm text-gray-500">{visitor.class} - {visitor.age} anos</p>
                                  </div>
                                   <div className="flex items-center space-x-2">
                                      <button onClick={() => handleViewHistory(visitor)} className="text-gray-500 hover:text-brand-blue p-1 rounded-full" title="Ver Histórico">
                                          <CalendarIcon className="h-5 w-5" />
                                      </button>
                                      <div className="w-20 text-center">{getStudentStatus(visitor)}</div>
                                       {isPresent ? (
                                            <button
                                                onClick={() => onUnmarkPresence(visitor.id, date)}
                                                className="px-4 py-1 bg-brand-yellow text-white rounded-full hover:bg-yellow-600 transition w-28 text-center"
                                            >
                                                Desmarcar
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onMarkPresence(visitor.id, date)}
                                                className="px-4 py-1 bg-brand-green text-white rounded-full hover:bg-green-600 transition w-28 text-center"
                                            >
                                                Marcar
                                            </button>
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
      <Modal isOpen={historyModalOpen} onClose={handleCloseHistoryModal} title={`Histórico de ${selectedStudentForHistory?.name}`}>
        {selectedStudentForHistory && <AttendanceHistory student={selectedStudentForHistory} allStudents={students} />}
      </Modal>
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
        return Array.from(dates).sort((a,b) => b.localeCompare(a));
    }, [allStudents]);

    const stats = useMemo(() => {
        const studentAttendanceByDate = new Map(student.attendance.map(a => [a.date, a]));
        const filteredClassDates = allClassDates.filter(date => date >= startDate && date <= endDate);

        let presentSundays = 0, presentWednesdays = 0;
        let dismissedSundays = 0, dismissedWednesdays = 0;
        const history: {date: string, present: boolean, dismissedBy: string | null | undefined, day: 'Sunday' | 'Wednesday' | null}[] = [];

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