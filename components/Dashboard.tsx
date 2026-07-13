
import React, { useState, useMemo } from 'react';
import { Student, StudentType, UserRole } from '../types';
import { CLASS_NAMES } from '../constants';
import { calculateAge } from '../utils';

interface DashboardProps {
    students: Student[];
    selectedClass: string;
    onClassChange: (className: string) => void;
    userRole: UserRole;
}

const StatCard: React.FC<{ title: string; value: number | string; color: string }> = ({ title, value, color }) => (
    <div className={`p-6 rounded-xl shadow-lg flex flex-col items-center justify-center ${color}`}>
        <span className="text-5xl font-extrabold text-white">{value}</span>
        <h3 className="text-xl font-semibold text-white mt-2 text-center">{title}</h3>
    </div>
);

const CLASS_DETAILS: Record<string, { gradient: string; shadow: string }> = {
    'Maternal': {
        gradient: 'from-rose-400 to-pink-500',
        shadow: 'shadow-rose-100 hover:shadow-rose-200 hover:shadow-lg'
    },
    '2 a 3 anos': {
        gradient: 'from-amber-400 to-orange-500',
        shadow: 'shadow-orange-100 hover:shadow-orange-200 hover:shadow-lg'
    },
    '4 a 5 anos': {
        gradient: 'from-emerald-400 to-teal-500',
        shadow: 'shadow-emerald-100 hover:shadow-emerald-200 hover:shadow-lg'
    },
    '6 a 7 anos': {
        gradient: 'from-sky-400 to-indigo-500',
        shadow: 'shadow-sky-100 hover:shadow-sky-200 hover:shadow-lg'
    },
    '8 a 10 anos': {
        gradient: 'from-violet-400 to-purple-600',
        shadow: 'shadow-purple-100 hover:shadow-purple-200 hover:shadow-lg'
    }
};

const ClassStatCard: React.FC<{ title: string; value: number }> = ({ title, value }) => {
    const details = CLASS_DETAILS[title] || {
        gradient: 'from-gray-400 to-gray-500',
        shadow: 'shadow-gray-100'
    };

    return (
        <div className={`p-6 rounded-xl shadow-md flex flex-col items-center justify-center bg-gradient-to-br ${details.gradient} text-white ${details.shadow} transform hover:-translate-y-1 hover:scale-[1.03] transition-all duration-300 ease-out border border-white/10`}>
            <span className="text-4xl font-extrabold text-white">{value}</span>
            <h3 className="text-sm font-semibold text-white/90 mt-2 text-center truncate w-full">{title}</h3>
        </div>
    );
};

const getDayFromDate = (dateString: string): 'Sunday' | 'Wednesday' | null => {
    const d = new Date(dateString + 'T00:00:00');
    const dayIndex = d.getDay();
    if (dayIndex === 0) return 'Sunday';
    if (dayIndex === 3) return 'Wednesday';
    return null;
}

interface DailyViewProps {
    students: Student[];
    selectedClass: string;
    onClassChange: (className: string) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
    setDownloadFn: (fn: (() => void) | null) => void;
}

const DailyView: React.FC<DailyViewProps> = ({ students, selectedClass, onClassChange, startDate, setStartDate, endDate, setEndDate, setDownloadFn }) => {
    const studentsToDisplay = selectedClass === 'All'
        ? students.filter(s => s.class !== 'Seeds')
        : students.filter(s => s.class === selectedClass);

    const presentStudents = useMemo(() => {
        return studentsToDisplay
            .filter(s => s.attendance.some(a => a.date >= startDate && a.date <= endDate && a.present))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [studentsToDisplay, startDate, endDate]);

    const presentMembers = presentStudents.filter(s => s.type === StudentType.Membro).length;
    const presentVisitors = presentStudents.filter(s => s.type === StudentType.Visitante).length;
    const totalPresent = presentStudents.length;

    const getClassPresence = (className: string) => {
        return students.filter(s =>
            s.class === className &&
            s.attendance.some(a => a.date >= startDate && a.date <= endDate && a.present)
        ).length;
    };
    const classColors = ['bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-lime-500', 'bg-cyan-500', 'bg-violet-500'];

    const selectedDay = useMemo(() => {
        if (startDate === endDate) {
            const day = getDayFromDate(startDate);
            if (day === 'Sunday') return { name: 'Domingo', important: true };
            if (day === 'Wednesday') return { name: 'Quarta-feira', important: false };
        }
        return { name: '', important: false };
    }, [startDate, endDate]);

    // --- Birthday Logic ---
    const { birthdaysToday, birthdaysThisWeek } = useMemo(() => {
        const today = new Date(endDate + 'T00:00:00');
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();
        const todayDayOfWeek = today.getDay(); // 0=Sun

        // Calculate the start (Sunday) and end (Saturday) of the current week
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - todayDayOfWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const bToday: Student[] = [];
        const bWeek: Student[] = [];

        studentsToDisplay.forEach(s => {
            if (!s.birthday) return;
            const bd = new Date(s.birthday + 'T00:00:00');
            if (isNaN(bd.getTime())) return;
            const bdMonth = bd.getMonth();
            const bdDay = bd.getDate();

            if (bdMonth === todayMonth && bdDay === todayDay) {
                bToday.push(s);
            } else {
                // Check if birthday falls within same week (compare month/day)
                for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
                    if (d.getMonth() === bdMonth && d.getDate() === bdDay) {
                        // Exclude today since those are in bToday
                        if (!(d.getMonth() === todayMonth && d.getDate() === todayDay)) {
                            bWeek.push(s);
                        }
                        break;
                    }
                }
            }
        });

        return { birthdaysToday: bToday, birthdaysThisWeek: bWeek };
    }, [studentsToDisplay, endDate]);

    const hasBirthdays = birthdaysToday.length > 0 || birthdaysThisWeek.length > 0;

    const presentOccurrences = useMemo(() => {
        const occurrences: { student: Student; date: string; dailyCode?: number }[] = [];
        studentsToDisplay.forEach(student => {
            student.attendance.forEach(att => {
                if (att.date >= startDate && att.date <= endDate && att.present) {
                    occurrences.push({
                        student,
                        date: att.date,
                        dailyCode: att.dailyCode
                    });
                }
            });
        });
        return occurrences.sort((a, b) => b.date.localeCompare(a.date) || a.student.name.localeCompare(b.student.name));
    }, [studentsToDisplay, startDate, endDate]);

    React.useEffect(() => {
        setDownloadFn(() => () => {
            let csvContent = '\uFEFF'; // UTF-8 BOM so Excel opens it with accents correctly
            
            // Headers/Title for Daily view
            csvContent += `Dashboard - Visão Diária\n`;
            csvContent += `Período;${startDate} a ${endDate}\n`;
            csvContent += `Turma;${selectedClass === 'All' ? 'Todas as Turmas' : selectedClass}\n\n`;

            // Stats
            csvContent += `Métrica;Valor\n`;
            csvContent += `Total Presentes;${totalPresent}\n`;
            csvContent += `Membros Presentes;${presentMembers}\n`;
            csvContent += `Visitantes Presentes;${presentVisitors}\n\n`;

            // Class Breakdown (only if selectedClass === 'All')
            if (selectedClass === 'All') {
                csvContent += `Presença por Turma\n`;
                CLASS_NAMES.forEach(className => {
                    csvContent += `${className};${getClassPresence(className)}\n`;
                });
                csvContent += `\n`;
            }

            // Student Presence List
            csvContent += `Código Diário;Nome;Turma;Idade;Data;Tipo\n`;
            presentOccurrences.forEach(occ => {
                const student = occ.student;
                const displayCode = occ.dailyCode || '-';
                const age = calculateAge(student.birthday, student.age);
                const dateStr = new Date(occ.date + 'T00:00:00').toLocaleDateString('pt-BR');
                csvContent += `${displayCode};"${student.name.replace(/"/g, '""')}";${student.class};${age};${dateStr};${student.type}\n`;
            });

            // Create a blob and download it
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const fileName = `dashboard_diario_${startDate}_a_${endDate}.csv`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
        
        return () => setDownloadFn(null);
    }, [students, selectedClass, startDate, endDate, totalPresent, presentMembers, presentVisitors, presentOccurrences]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-end mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div>
                        <label htmlFor="start-date-dashboard" className="block text-sm font-medium text-gray-600 mb-1">De:</label>
                        <input
                            id="start-date-dashboard"
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2"
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date-dashboard" className="block text-sm font-medium text-gray-600 mb-1">Até:</label>
                        <input
                            id="end-date-dashboard"
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2"
                        />
                    </div>
                </div>
                <div className="flex items-center">
                    <label htmlFor="class-select-dashboard" className="mr-2 text-sm font-medium text-gray-600 shrink-0">Turma:</label>
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

            {/* Birthday Notifications */}
            {hasBirthdays && (
                <div className="mb-8 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-5 border border-pink-200 shadow-sm">
                    {birthdaysToday.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-pink-700 mb-3 flex items-center gap-2">
                                <span className="text-2xl">🎂</span> Aniversariantes de Hoje!
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {birthdaysToday.map(s => (
                                    <div key={s.id} className="bg-white rounded-lg p-4 border-2 border-pink-300 shadow-md flex items-center gap-3 animate-pulse-once">
                                        <div className="text-3xl">🎉</div>
                                        <div>
                                            <p className="font-bold text-gray-900">{s.name}</p>
                                            <p className="text-sm text-gray-500">{s.class} — {calculateAge(s.birthday, s.age)} anos hoje!</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {birthdaysThisWeek.length > 0 && (
                        <div>
                            <h3 className="text-md font-semibold text-purple-600 mb-2 flex items-center gap-2">
                                <span className="text-xl">🎁</span> Esta Semana
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {birthdaysThisWeek.map(s => {
                                    const bdDate = s.birthday ? new Date(s.birthday + 'T00:00:00') : null;
                                    const bdFormatted = bdDate ? `${String(bdDate.getDate()).padStart(2, '0')}/${String(bdDate.getMonth() + 1).padStart(2, '0')}` : '';
                                    const turningAge = bdDate ? new Date().getFullYear() - bdDate.getFullYear() : null;
                                    return (
                                        <div key={s.id} className="bg-white rounded-lg px-3 py-2 border border-purple-200 text-sm flex items-center gap-2 shadow-sm">
                                            <span>🎁</span>
                                            <span className="font-medium text-gray-800">{s.name}</span>
                                            <span className="text-gray-400">({s.class})</span>
                                            <span className="text-purple-600 font-semibold">{bdFormatted}</span>
                                            {turningAge !== null && <span className="text-pink-500 font-bold text-xs">→ {turningAge} anos</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <StatCard title="Total Presentes" value={totalPresent} color="bg-brand-blue" />
                <StatCard title="Membros Presentes" value={presentMembers} color="bg-brand-green" />
                <StatCard title="Visitantes Presentes" value={presentVisitors} color="bg-brand-yellow" />
            </div>

            {selectedClass === 'All' && (
                <div className="mt-12">
                    <h3 className="text-2xl font-bold text-brand-dark mb-4">Presença por Turma</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                        {CLASS_NAMES.map((className) => (
                            <ClassStatCard
                                key={className}
                                title={className}
                                value={getClassPresence(className)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-12 bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold text-brand-dark mb-4">
                    {startDate === endDate 
                        ? `Alunos Presentes em ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
                        : `Presenças no Período (${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')})`
                    }
                    {selectedDay.name && (
                        <span className={`ml-3 text-lg font-semibold px-3 py-1 rounded-full ${selectedDay.important ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                            {selectedDay.name}{selectedDay.important && ' (Principal)'}
                        </span>
                    )}
                </h3>
                {presentOccurrences.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {presentOccurrences.map((occ, idx) => {
                            const student = occ.student;
                            const displayCode = occ.dailyCode || '-';
                            return (
                                <li key={`${student.id}-${occ.date}-${idx}`} className="py-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 px-4 rounded-lg my-1 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center justify-center bg-brand-blue text-white rounded-md p-2 min-w-14">
                                            <span className="text-xs font-semibold uppercase opacity-80">Cód</span>
                                            <span className="font-bold text-lg">{displayCode}</span>
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-gray-900">{student.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {student.class} - {calculateAge(student.birthday, student.age)} anos
                                                {startDate !== endDate && (
                                                    <span className="ml-2 font-semibold text-brand-purple">
                                                        • {new Date(occ.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${student.type === StudentType.Membro ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {student.type}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500 py-8">Nenhum aluno presente no período selecionado.</p>
                )}
            </div>
        </div>
    );
};

interface MonthlyViewProps {
    students: Student[];
    selectedClass: string;
    onClassChange: (className: string) => void;
    setDownloadFn: (fn: (() => void) | null) => void;
}

const MonthlyView: React.FC<MonthlyViewProps> = ({ students, selectedClass, onClassChange, setDownloadFn }) => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [dayTypeFilter, setDayTypeFilter] = useState<'All' | 'Sunday' | 'Wednesday'>('All');

    // Sort Configuration State
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'class' | 'count', direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    const yearOptions = useMemo(() => {
        const allYears = new Set(students.flatMap(s => s.attendance.map(a => new Date(a.date).getFullYear())));
        return Array.from(allYears).sort((a, b) => b - a);
    }, [students]);

    const monthlyStats = useMemo(() => {
        const studentsToDisplay = selectedClass === 'All' ? students.filter(s => s.class !== 'Seeds') : students.filter(s => s.class === selectedClass);
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

    const handleSort = (key: 'name' | 'class' | 'count') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const studentAttendanceList = useMemo(() => {
        const list = Array.from(monthlyStats.studentCounts.values());
        return list.sort((a, b) => {
            const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1;

            if (sortConfig.key === 'name') {
                return a.name.localeCompare(b.name) * directionMultiplier;
            } else if (sortConfig.key === 'class') {
                // Sort by predefined class order
                const indexA = CLASS_NAMES.indexOf(a.class);
                const indexB = CLASS_NAMES.indexOf(b.class);
                // Handle cases where class might not be in CLASS_NAMES (put at end)
                const valA = indexA === -1 ? 999 : indexA;
                const valB = indexB === -1 ? 999 : indexB;

                if (valA !== valB) {
                    return (valA - valB) * directionMultiplier;
                }
                // Fallback to name sort if same class
                return a.name.localeCompare(b.name);
            } else {
                // Count sort
                return (a.count - b.count) * directionMultiplier;
            }
        });
    }, [monthlyStats, sortConfig]);

    const monthTitle = useMemo(() => {
        switch (dayTypeFilter) {
            case 'Sunday': return 'em Domingos';
            case 'Wednesday': return 'em Quartas';
            default: return 'no Mês';
        }
    }, [dayTypeFilter]);

    const SortIndicator = ({ active, direction }: { active: boolean, direction: 'asc' | 'desc' }) => {
        if (!active) return <span className="ml-1 text-gray-400 opacity-0 group-hover:opacity-50">↕</span>;
        return <span className="ml-1 text-brand-blue">{direction === 'asc' ? '▲' : '▼'}</span>;
    };

    React.useEffect(() => {
        setDownloadFn(() => () => {
            let csvContent = '\uFEFF'; // UTF-8 BOM so Excel opens it with accents correctly
            
            const monthName = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' });
            csvContent += `Dashboard - Visão Mensal\n`;
            csvContent += `Mês/Ano;${monthName}/${year}\n`;
            csvContent += `Filtro de Culto;${dayTypeFilter === 'All' ? 'Todos' : dayTypeFilter === 'Sunday' ? 'Domingos' : 'Quartas-feiras'}\n`;
            csvContent += `Turma;${selectedClass === 'All' ? 'Todas as Turmas' : selectedClass}\n\n`;

            // Stats
            csvContent += `Métrica;Valor\n`;
            csvContent += `Presenças no Mês;${monthlyStats.totalPresences}\n`;
            csvContent += `Média Diária;${averageDailyAttendance}\n`;
            csvContent += `Alunos Únicos;${monthlyStats.uniqueAttendees.size}\n\n`;

            // Student Attendance List
            csvContent += `Aluno;Turma;Dias Presente\n`;
            studentAttendanceList.forEach(item => {
                csvContent += `"${item.name.replace(/"/g, '""')}";${item.class};${item.count}\n`;
            });

            // Create a blob and download it
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const fileName = `dashboard_mensal_${month}_${year}.csv`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        return () => setDownloadFn(null);
    }, [students, selectedClass, month, year, dayTypeFilter, monthlyStats, studentAttendanceList, averageDailyAttendance]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center mb-6">
                <div className="flex items-center gap-4">
                    <div>
                        <label htmlFor="month-select" className="mr-2 text-sm font-medium text-gray-600">Mês:</label>
                        <select id="month-select" value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block p-2">
                            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>)}
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
                                <th
                                    onClick={() => handleSort('name')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group select-none transition-colors"
                                >
                                    Aluno <SortIndicator active={sortConfig.key === 'name'} direction={sortConfig.direction} />
                                </th>
                                <th
                                    onClick={() => handleSort('class')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group select-none transition-colors"
                                >
                                    Turma <SortIndicator active={sortConfig.key === 'class'} direction={sortConfig.direction} />
                                </th>
                                <th
                                    onClick={() => handleSort('count')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group select-none transition-colors"
                                >
                                    Dias Presente <SortIndicator active={sortConfig.key === 'count'} direction={sortConfig.direction} />
                                </th>
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
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [downloadFn, setDownloadFn] = useState<(() => void) | null>(null);

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                <h2 className="text-3xl font-bold text-brand-dark mb-4 sm:mb-0">Home</h2>
                <div className="flex bg-gray-200 rounded-lg p-1">
                    <button onClick={() => setViewMode('daily')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${viewMode === 'daily' ? 'bg-white text-brand-blue shadow' : 'text-gray-600'}`}>
                        Visão por Período
                    </button>
                    <button onClick={() => setViewMode('monthly')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${viewMode === 'monthly' ? 'bg-white text-brand-blue shadow' : 'text-gray-600'}`}>
                        Visão Mensal
                    </button>
                </div>
            </div>

            {viewMode === 'daily' ? (
                <DailyView
                    {...props}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    setDownloadFn={setDownloadFn}
                />
            ) : (
                <MonthlyView {...props} setDownloadFn={setDownloadFn} />
            )}

            {/* Footer Actions */}
            <div className="mt-12 border-t pt-8 flex justify-end gap-4 items-center">
                {downloadFn && (
                    <button
                        onClick={downloadFn}
                        className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm font-semibold flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Exportar Dashboard para Excel
                    </button>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
