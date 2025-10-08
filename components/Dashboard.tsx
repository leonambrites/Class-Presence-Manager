import React, { useState, useMemo } from 'react';
import { Student, StudentType } from '../types';
import { CLASS_NAMES } from '../constants';

interface DashboardProps {
  students: Student[];
  selectedClass: string;
  onClassChange: (className: string) => void;
}

const StatCard: React.FC<{ title: string; value: number | string; color: string }> = ({ title, value, color }) => (
  <div className={`p-6 rounded-xl shadow-lg flex flex-col items-center justify-center ${color}`}>
    <span className="text-5xl font-extrabold text-white">{value}</span>
    <h3 className="text-xl font-semibold text-white mt-2 text-center">{title}</h3>
  </div>
);

const ClassStatCard: React.FC<{ title: string; value: number; color: string }> = ({ title, value, color }) => (
    <div className={`p-4 rounded-lg shadow-md flex flex-col items-center justify-center ${color}`}>
      <span className="text-3xl font-bold text-white">{value}</span>
      <h3 className="text-md font-semibold text-white mt-1 text-center">{title}</h3>
    </div>
);

const getDayFromDate = (dateString: string): 'Sunday' | 'Wednesday' | null => {
    const d = new Date(dateString + 'T00:00:00');
    const dayIndex = d.getDay();
    if (dayIndex === 0) return 'Sunday';
    if (dayIndex === 3) return 'Wednesday';
    return null;
}

const DailyView: React.FC<DashboardProps & { date: string; setDate: (date: string) => void }> = ({ students, selectedClass, onClassChange, date, setDate }) => {
    const studentsToDisplay = selectedClass === 'All' 
    ? students 
    : students.filter(s => s.class === selectedClass);

  const presentStudents = studentsToDisplay
    .filter(s => s.attendance.some(a => a.date === date && a.present))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const presentMembers = presentStudents.filter(s => s.type === StudentType.Membro).length;
  const presentVisitors = presentStudents.filter(s => s.type === StudentType.Visitante).length;
  const totalPresent = presentStudents.length;

  const getClassPresence = (className: string) => {
    return students.filter(s => 
        s.class === className && 
        s.attendance.some(a => a.date === date && a.present)
    ).length;
  };
  const classColors = ['bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-lime-500', 'bg-cyan-500', 'bg-violet-500'];

  const selectedDay = useMemo(() => {
    const day = getDayFromDate(date);
    if (day === 'Sunday') return { name: 'Domingo', important: true };
    if (day === 'Wednesday') return { name: 'Quarta-feira', important: false };
    return { name: '', important: false };
  }, [date]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center mb-6">
                 <div>
                    <label htmlFor="date-select-dashboard" className="mr-2 text-sm font-medium text-gray-600">Data:</label>
                    <input 
                        id="date-select-dashboard"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2"
                    />
                </div>
                <div className="flex items-center">
                <label htmlFor="class-select-dashboard" className="mr-2 text-sm font-medium text-gray-600">Turma:</label>
                <select
                    id="class-select-dashboard"
                    value={selectedClass}
                    onChange={(e) => onClassChange(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full sm:w-auto p-2"
                >
                    <option value="All">Todas as Turmas</option>
                    {CLASS_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <StatCard title="Total Presentes" value={totalPresent} color="bg-brand-blue" />
                <StatCard title="Membros Presentes" value={presentMembers} color="bg-brand-green" />
                <StatCard title="Visitantes Presentes" value={presentVisitors} color="bg-brand-yellow" />
            </div>

            {selectedClass === 'All' && (
                <div className="mt-12">
                    <h3 className="text-2xl font-bold text-brand-dark mb-4">Presença por Turma</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {CLASS_NAMES.map((className, index) => (
                            <ClassStatCard 
                                key={className}
                                title={className}
                                value={getClassPresence(className)}
                                color={classColors[index % classColors.length]}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-12 bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold text-brand-dark mb-4">
                    Alunos Presentes em {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    {selectedDay.name && (
                         <span className={`ml-3 text-lg font-semibold px-3 py-1 rounded-full ${selectedDay.important ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                            {selectedDay.name}{selectedDay.important && ' (Principal)'}
                        </span>
                    )}
                </h3>
                 {presentStudents.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                    {presentStudents.map(student => (
                    <li key={student.id} className="py-4 flex justify-between items-center">
                        <div>
                            <p className="text-lg font-medium text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-500">{student.class} - {student.age} anos</p>
                        </div>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                            student.type === StudentType.Membro ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {student.type}
                        </span>
                    </li>
                    ))}
                </ul>
                ) : (
                    <p className="text-center text-gray-500 py-8">Nenhum aluno presente na data selecionada.</p>
                )}
            </div>
        </div>
    );
}

const MonthlyView: React.FC<DashboardProps> = ({ students, selectedClass, onClassChange }) => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [dayTypeFilter, setDayTypeFilter] = useState<'All' | 'Sunday' | 'Wednesday'>('All');

    const yearOptions = useMemo(() => {
        const allYears = new Set(students.flatMap(s => s.attendance.map(a => new Date(a.date).getFullYear())));
        return Array.from(allYears).sort((a, b) => b - a);
    }, [students]);

    const monthlyStats = useMemo(() => {
        const studentsToDisplay = selectedClass === 'All' ? students : students.filter(s => s.class === selectedClass);
        const stats = {
            totalPresences: 0,
            serviceDays: new Set<string>(),
            uniqueAttendees: new Set<string>(),
            studentCounts: new Map<string, { name: string; class: string; count: number }>()
        };

        studentsToDisplay.forEach(student => {
            let presenceCountInMonth = 0;
            student.attendance.forEach(att => {
                const attDate = new Date(att.date + 'T00:00:00');
                // Handle legacy data by deriving day from date if not present
                const day = att.day || getDayFromDate(att.date);
                const dayFilterMatch = dayTypeFilter === 'All' || day === dayTypeFilter;

                if (attDate.getFullYear() === year && attDate.getMonth() + 1 === month && dayFilterMatch) {
                    if (att.present) {
                        stats.totalPresences++;
                        stats.serviceDays.add(att.date);
                        stats.uniqueAttendees.add(student.id);
                        presenceCountInMonth++;
                    }
                }
            });
            if (presenceCountInMonth > 0) {
                stats.studentCounts.set(student.id, { name: student.name, class: student.class, count: presenceCountInMonth });
            }
        });

        return stats;

    }, [students, selectedClass, month, year, dayTypeFilter]);

    const numServiceDays = monthlyStats.serviceDays.size;
    const averageDailyAttendance = numServiceDays > 0 ? (monthlyStats.totalPresences / numServiceDays).toFixed(1) : 0;
    const studentAttendanceList = Array.from(monthlyStats.studentCounts.values()).sort((a, b) => a.name.localeCompare(b.name));

    const monthTitle = useMemo(() => {
        switch(dayTypeFilter) {
            case 'Sunday': return 'em Domingos';
            case 'Wednesday': return 'em Quartas';
            default: return 'no Mês';
        }
    }, [dayTypeFilter]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center mb-6">
                <div className="flex items-center gap-4">
                     <div>
                        <label htmlFor="month-select" className="mr-2 text-sm font-medium text-gray-600">Mês:</label>
                        <select id="month-select" value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block p-2">
                            {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="year-select" className="mr-2 text-sm font-medium text-gray-600">Ano:</label>
                        <select id="year-select" value={year} onChange={e => setYear(Number(e.target.value))} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block p-2">
                            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center">
                    <label htmlFor="class-select-monthly" className="mr-2 text-sm font-medium text-gray-600">Turma:</label>
                    <select id="class-select-monthly" value={selectedClass} onChange={e => onClassChange(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full sm:w-auto p-2">
                        <option value="All">Todas as Turmas</option>
                        {CLASS_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex justify-center mb-6">
                 <div className="flex bg-gray-200 rounded-lg p-1">
                    <button onClick={() => setDayTypeFilter('All')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${dayTypeFilter === 'All' ? 'bg-white text-brand-blue shadow' : 'text-gray-600'}`}>Todos</button>
                    <button onClick={() => setDayTypeFilter('Sunday')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${dayTypeFilter === 'Sunday' ? 'bg-white text-brand-purple shadow' : 'text-gray-600'}`}>Domingos</button>
                    <button onClick={() => setDayTypeFilter('Wednesday')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${dayTypeFilter === 'Wednesday' ? 'bg-white text-brand-blue shadow' : 'text-gray-600'}`}>Quartas</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <StatCard title={`Presenças ${monthTitle}`} value={monthlyStats.totalPresences} color="bg-brand-purple" />
                <StatCard title="Média Diária" value={averageDailyAttendance} color="bg-brand-red" />
                <StatCard title="Alunos Únicos" value={monthlyStats.uniqueAttendees.size} color="bg-brand-green" />
            </div>

            <div className="mt-12 bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold text-brand-dark mb-4">Relatório de Presença Mensal</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turma</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dias Presente</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {studentAttendanceList.map(student => (
                                <tr key={student.name}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.class}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {studentAttendanceList.length === 0 && <p className="text-center py-8 text-gray-500">Nenhum registro de presença para o período selecionado.</p>}
                </div>
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = (props) => {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <h2 className="text-3xl font-bold text-brand-dark mb-4 sm:mb-0">Dashboard</h2>
             <div className="flex bg-gray-200 rounded-lg p-1">
                <button onClick={() => setViewMode('daily')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${viewMode === 'daily' ? 'bg-white text-brand-blue shadow' : 'text-gray-600'}`}>
                    Visão Diária
                </button>
                <button onClick={() => setViewMode('monthly')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${viewMode === 'monthly' ? 'bg-white text-brand-blue shadow' : 'text-gray-600'}`}>
                    Visão Mensal
                </button>
            </div>
        </div>

        {viewMode === 'daily' ? <DailyView {...props} date={dailyDate} setDate={setDailyDate} /> : <MonthlyView {...props} />}
    </div>
  );
};

export default Dashboard;