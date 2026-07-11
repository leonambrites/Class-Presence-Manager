import React, { useState } from 'react';
import { ScheduleEntry, Volunteer, UserRole } from '../types';
import { CLASS_NAMES } from '../constants';
import Modal from './Modal';

const SCHEDULE_CLASS_NAMES = ['Apoio', ...CLASS_NAMES];

interface ScheduleProps {
    schedule: ScheduleEntry[];
    volunteers: Volunteer[];
    selectedClass: string;
    onClassChange: (className: string) => void;
    onAddSchedule: (entry: Omit<ScheduleEntry, 'id'>) => void;
    onEditSchedule: (entry: ScheduleEntry) => void;
    onDeleteSchedule: (id: string) => void;
    userRole: UserRole;
    loggedInVolunteer?: Volunteer | null;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const getClassBadgeStyle = (className: string) => {
    switch (className) {
        case 'Maternal':
            return 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100';
        case '2 a 3 anos':
            return 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100';
        case '4 a 5 anos':
            return 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100';
        case '6 a 7 anos':
            return 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100';
        case '8 a 10 anos':
            return 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100';
        case 'Apoio':
            return 'bg-orange-500 border-orange-600 text-white hover:bg-orange-600 font-extrabold shadow-sm';
        default:
            return 'bg-blue-50 border-blue-200 text-brand-blue hover:bg-blue-100';
    }
};

const ScheduleForm: React.FC<{
    initialData?: ScheduleEntry,
    date: string,
    volunteers: Volunteer[],
    onSave: (data: any) => void,
    onCancel: () => void
}> = ({ initialData, date, volunteers, onSave, onCancel }) => {
    const [className, setClassName] = useState(initialData?.className || SCHEDULE_CLASS_NAMES[0]);
    const [selectedTeam, setSelectedTeam] = useState(initialData?.team || '');
    const [formDate, setFormDate] = useState(initialData?.date ? initialData.date.split('T')[0] : date);

    const [escadaId, setEscadaId] = useState<string | null>(initialData?.escadaId || null);
    const [corredorId, setCorredorId] = useState<string | null>(initialData?.corredorId || null);

    const [escadaSearch, setEscadaSearch] = useState('');
    const [corredorSearch, setCorredorSearch] = useState('');

    const uniqueTeams = Array.from(new Set(volunteers.map(v => v.team).filter(Boolean) as string[])).sort();

    const escadaSuggestions = React.useMemo(() => {
        if (!escadaSearch.trim()) return [];
        const cleanQuery = escadaSearch.toLowerCase();
        return volunteers.filter(v => {
            const isMinister = !v.type || v.type.toLowerCase().includes('ministra') || v.type.toLowerCase().includes('prof');
            return isMinister && v.name.toLowerCase().includes(cleanQuery) && v.id !== corredorId;
        });
    }, [escadaSearch, volunteers, corredorId]);

    const corredorSuggestions = React.useMemo(() => {
        if (!corredorSearch.trim()) return [];
        const cleanQuery = corredorSearch.toLowerCase();
        return volunteers.filter(v => {
            const isMinister = !v.type || v.type.toLowerCase().includes('ministra') || v.type.toLowerCase().includes('prof');
            return isMinister && v.name.toLowerCase().includes(cleanQuery) && v.id !== escadaId;
        });
    }, [corredorSearch, volunteers, escadaId]);

    const selectedEscada = volunteers.find(v => v.id === escadaId);
    const selectedCorredor = volunteers.find(v => v.id === corredorId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isApoio = className === 'Apoio';
        onSave({
            ...(initialData ? { id: initialData.id } : {}),
            date: formDate,
            className,
            team: isApoio ? '' : selectedTeam,
            escadaId: isApoio ? escadaId : null,
            corredorId: isApoio ? corredorId : null,
            // Fallback empty values to match API
            supervisorId: isApoio ? null : (initialData?.supervisorId || null),
            coordinatorId: isApoio ? null : (initialData?.coordinatorId || null),
            deskId: isApoio ? null : (initialData?.deskId || null),
            ministerIds: isApoio ? [] : (initialData?.ministerIds || [])
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Data da Escala</label>
                <input 
                    type="date" 
                    required 
                    value={formDate} 
                    onChange={e => setFormDate(e.target.value)} 
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue" 
                />
            </div>
            {className !== 'Apoio' && (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Equipe Responsável</label>
                    <select 
                        required 
                        value={selectedTeam} 
                        onChange={e => setSelectedTeam(e.target.value)} 
                        className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    >
                        <option value="">Selecione a equipe de voluntários...</option>
                        {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            )}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Turma / Escala</label>
                <select 
                    required 
                    value={className} 
                    onChange={e => setClassName(e.target.value)} 
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue"
                >
                    {SCHEDULE_CLASS_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Posição Escada */}
            <div className="border-t border-gray-100 pt-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Escada</label>
                {escadaId ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-blue-950">✓ Selecionada: {selectedEscada?.name}</p>
                            <p className="text-[10px] text-blue-700/80 font-semibold">Turma: {selectedEscada?.class || 'Não informada'}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setEscadaId(null);
                                setEscadaSearch('');
                            }}
                            className="text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 rounded px-2.5 py-1 shadow-sm transition"
                        >
                            Remover
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <input
                            type="text"
                            value={escadaSearch}
                            onChange={(e) => setEscadaSearch(e.target.value)}
                            placeholder="Digite o nome da ministra da Escada..."
                            className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue text-sm"
                        />
                        {escadaSuggestions.length > 0 && (
                            <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                {escadaSuggestions.map(volunteer => (
                                    <li key={volunteer.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEscadaId(volunteer.id);
                                                setEscadaSearch('');
                                            }}
                                            className="w-full text-left p-2.5 hover:bg-blue-50/50 transition flex flex-col gap-0.5"
                                        >
                                            <span className="text-xs font-bold text-gray-900">{volunteer.name}</span>
                                            <span className="text-[10px] text-gray-500 font-semibold">
                                                Turma: {volunteer.class || 'Não cadastrada'} {volunteer.type ? `| Função: ${volunteer.type}` : ''}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {escadaSearch.trim() && escadaSuggestions.length === 0 && (
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 text-xs text-gray-500 font-semibold">
                                Nenhuma ministra encontrada com o nome "{escadaSearch}".
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Posição Corredor */}
            <div className="border-t border-gray-100 pt-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Corredor</label>
                {corredorId ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-blue-950">✓ Selecionada: {selectedCorredor?.name}</p>
                            <p className="text-[10px] text-blue-700/80 font-semibold">Turma: {selectedCorredor?.class || 'Não informada'}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setCorredorId(null);
                                setCorredorSearch('');
                            }}
                            className="text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 rounded px-2.5 py-1 shadow-sm transition"
                        >
                            Remover
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <input
                            type="text"
                            value={corredorSearch}
                            onChange={(e) => setCorredorSearch(e.target.value)}
                            placeholder="Digite o nome da ministra do Corredor..."
                            className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue text-sm"
                        />
                        {corredorSuggestions.length > 0 && (
                            <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                {corredorSuggestions.map(volunteer => (
                                    <li key={volunteer.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCorredorId(volunteer.id);
                                                setCorredorSearch('');
                                            }}
                                            className="w-full text-left p-2.5 hover:bg-blue-50/50 transition flex flex-col gap-0.5"
                                        >
                                            <span className="text-xs font-bold text-gray-900">{volunteer.name}</span>
                                            <span className="text-[10px] text-gray-500 font-semibold">
                                                Turma: {volunteer.class || 'Não cadastrada'} {volunteer.type ? `| Função: ${volunteer.type}` : ''}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {corredorSearch.trim() && corredorSuggestions.length === 0 && (
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 text-xs text-gray-500 font-semibold">
                                Nenhuma ministra encontrada com o nome "{corredorSearch}".
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="submit" className="flex-1 bg-brand-blue text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition">
                    Salvar
                </button>
                <button type="button" onClick={onCancel} className="flex-1 bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition">
                    Cancelar
                </button>
            </div>
        </form>
    );
};

const Schedule: React.FC<ScheduleProps> = ({ 
    schedule, 
    volunteers, 
    selectedClass, 
    onClassChange, 
    onAddSchedule, 
    onEditSchedule, 
    onDeleteSchedule, 
    userRole,
    loggedInVolunteer
}) => {
    // Current visualized Month and Year
    const today = new Date();
    const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
    const [showOnlyMySchedules, setShowOnlyMySchedules] = useState(userRole === 'Ministra');

    const isVolunteerAssignedToEntry = (volunteer: Volunteer, entry: ScheduleEntry) => {
        if (entry.team && volunteer.team === entry.team) {
            return true;
        }
        if (entry.ministerIds?.includes(volunteer.id)) {
            return true;
        }
        if (entry.supervisorId === volunteer.id || entry.deskId === volunteer.id || entry.coordinatorId === volunteer.id) {
            return true;
        }
        return false;
    };

    // Add schedule modal and edit schedule modal state
    const [isAdding, setIsAdding] = useState(false);
    const [createDate, setCreateDate] = useState<string | null>(null);
    const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);

    // Selected entry for Details Modal
    const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Selected day for Daily List Modal (primarily for mobile screens)
    const [selectedDayString, setSelectedDayString] = useState<string | null>(null);

    // Safe helper to format local Date into YYYY-MM-DD
    const getLocalDateString = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDateString(today);

    // Navigation handlers
    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    // Construct the monthly calendar day grid
    const daysGrid = React.useMemo(() => {
        const days = [];
        const firstDay = new Date(currentYear, currentMonth, 1);
        const firstDayIndex = firstDay.getDay(); // 0 = Sunday, 1 = Monday...
        const prevMonthLastDate = new Date(currentYear, currentMonth, 0).getDate();

        // Previous Month tail
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const prevDate = new Date(currentYear, currentMonth - 1, prevMonthLastDate - i);
            days.push({
                date: prevDate,
                isCurrentMonth: false,
                dayNum: prevMonthLastDate - i,
                dateString: getLocalDateString(prevDate)
            });
        }

        // Current Month
        const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
        for (let i = 1; i <= lastDate; i++) {
            const currDate = new Date(currentYear, currentMonth, i);
            days.push({
                date: currDate,
                isCurrentMonth: true,
                dayNum: i,
                dateString: getLocalDateString(currDate)
            });
        }

        // Next Month lead
        const totalCells = days.length <= 35 ? 35 : 42;
        const remainingCells = totalCells - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            const nextDate = new Date(currentYear, currentMonth + 1, i);
            days.push({
                date: nextDate,
                isCurrentMonth: false,
                dayNum: i,
                dateString: getLocalDateString(nextDate)
            });
        }

        return days;
    }, [currentYear, currentMonth]);

    const handleSaveForm = (data: any) => {
        if (data.id) {
            onEditSchedule(data);
        } else {
            onAddSchedule(data);
        }
        setIsAdding(false);
        setEditingEntry(null);
        setCreateDate(null);
    };

    const handleCellClick = (dateString: string) => {
        const dayEntries = schedule.filter(s => s.date && s.date.split('T')[0] === dateString);
        
        // On click, show list of items if they exist (great for responsive details), otherwise trigger add schedule modal for authorized users
        if (dayEntries.length > 0) {
            setSelectedDayString(dateString);
        } else if (userRole === 'Pastor' || userRole === 'Coordenadora') {
            setCreateDate(dateString);
            setIsAdding(true);
        }
    };

    return (
        <div className="p-4 md:p-8">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-brand-dark">Escala de Voluntários</h2>
                    <p className="text-gray-500 text-sm mt-1">Gerencie e visualize as equipes escaladas por turma.</p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    {volunteers.length > 0 && (userRole === 'Pastor' || userRole === 'Coordenadora') && (
                        <button 
                            onClick={() => {
                                setCreateDate(todayStr);
                                setIsAdding(true);
                            }} 
                            className="w-full md:w-auto bg-brand-blue text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                            <span className="text-lg leading-none">+</span> Nova Escala
                        </button>
                    )}
                </div>
            </div>

            {volunteers.length === 0 && (
                <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-6 border border-yellow-200">
                    Você precisa cadastrar Professores/Voluntários antes de criar uma escala. Vá para a aba "Professores".
                </div>
            )}

            {/* Filter and Month Navigation Row */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Month Selector Controls */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                    <button 
                        onClick={handlePrevMonth}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600 font-bold"
                        title="Mês Anterior"
                    >
                        &larr; Mês Ant.
                    </button>
                    <h3 className="text-xl font-bold text-gray-800 text-center min-w-[160px]">
                        {MONTHS[currentMonth]} de {currentYear}
                    </h3>
                    <button 
                        onClick={handleNextMonth}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600 font-bold"
                        title="Mês Seguinte"
                    >
                        Próx. Mês &rarr;
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    {loggedInVolunteer && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="only-my-schedules"
                                checked={showOnlyMySchedules}
                                onChange={(e) => setShowOnlyMySchedules(e.target.checked)}
                                className="w-4 h-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue cursor-pointer"
                            />
                            <label htmlFor="only-my-schedules" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                                Apenas minhas escalas (⭐)
                            </label>
                        </div>
                    )}
                    <div className="w-full sm:w-64">
                        <label htmlFor="class-select-schedule" className="sr-only">Filtrar por Turma</label>
                        <select
                            id="class-select-schedule"
                            value={selectedClass}
                            onChange={(e) => onClassChange(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2.5"
                        >
                            <option value="All">Todas as Turmas / Escalas</option>
                            {SCHEDULE_CLASS_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden p-4">
                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-2 text-center font-bold text-gray-500 text-xs md:text-sm border-b border-gray-100 pb-3 mb-2">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="py-1">{day}</div>
                    ))}
                </div>

                {/* Calendar Cells Grid */}
                <div className="grid grid-cols-7 gap-2">
                    {daysGrid.map((cell, index) => {
                        const dayEntries = schedule.filter(s => {
                            if (!s.date) return false;
                            const entryDate = s.date.split('T')[0];
                            const matchesDate = entryDate === cell.dateString;
                            const matchesClass = selectedClass === 'All' || s.className === selectedClass;
                            if (showOnlyMySchedules && loggedInVolunteer) {
                                return matchesDate && matchesClass && isVolunteerAssignedToEntry(loggedInVolunteer, s);
                            }
                            return matchesDate && matchesClass;
                        }).sort((a, b) => {
                            const indexA = SCHEDULE_CLASS_NAMES.indexOf(a.className);
                            const indexB = SCHEDULE_CLASS_NAMES.indexOf(b.className);
                            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
                        });

                        const isToday = cell.dateString === todayStr;

                        return (
                            <div
                                key={index}
                                onClick={() => handleCellClick(cell.dateString)}
                                className={`min-h-[110px] md:min-h-[140px] p-1.5 md:p-2 rounded-lg border flex flex-col justify-between transition cursor-pointer relative group ${
                                    cell.isCurrentMonth 
                                        ? 'bg-white border-gray-100 hover:border-brand-blue hover:shadow-sm' 
                                        : 'bg-gray-50 border-gray-100 text-gray-400 opacity-60'
                                } ${isToday ? 'ring-2 ring-brand-blue border-brand-blue bg-blue-50/20' : ''}`}
                            >
                                {/* Date Number and Add Indicator */}
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-1">
                                        <span className={`text-xs md:text-sm font-bold ${
                                            isToday 
                                                ? 'text-brand-blue font-extrabold bg-blue-100 w-5 h-5 rounded-full flex items-center justify-center' 
                                                : cell.isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
                                        }`}>
                                            {cell.dayNum}
                                        </span>
                                        {loggedInVolunteer && schedule.some(s => s.date?.split('T')[0] === cell.dateString && isVolunteerAssignedToEntry(loggedInVolunteer, s)) && (
                                            <span className="text-amber-500 text-xs" title="Você está escalada neste dia">⭐</span>
                                        )}
                                    </div>
                                    
                                    {cell.isCurrentMonth && (userRole === 'Pastor' || userRole === 'Coordenadora') && (
                                        <span className="text-[10px] text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                                            + Add
                                        </span>
                                    )}
                                </div>

                                {/* Desktop Badges View */}
                                <div className="hidden md:block space-y-1 overflow-y-auto max-h-[85px] md:max-h-[105px] pr-0.5 custom-scrollbar">
                                    {dayEntries.map(entry => (
                                        <div
                                            key={entry.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEntry(entry);
                                                setIsDetailsOpen(true);
                                            }}
                                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border truncate transition duration-150 ${getClassBadgeStyle(entry.className)}`}
                                            title={`${entry.className} - ${entry.team || 'Sem Equipe'}`}
                                        >
                                            {loggedInVolunteer && isVolunteerAssignedToEntry(loggedInVolunteer, entry) && '⭐ '}
                                            {entry.className} {entry.team ? `(${entry.team})` : ''}
                                        </div>
                                    ))}
                                </div>

                                {/* Mobile Colored Dots View */}
                                <div className="md:hidden flex flex-wrap gap-1 justify-center mt-1">
                                    {dayEntries.map(entry => {
                                        let dotColor = 'bg-brand-blue';
                                        if (entry.className === 'Maternal') dotColor = 'bg-rose-400 border border-rose-500';
                                        else if (entry.className === '2 a 3 anos') dotColor = 'bg-amber-400 border border-amber-500';
                                        else if (entry.className === '4 a 5 anos') dotColor = 'bg-emerald-400 border border-emerald-500';
                                        else if (entry.className === '6 a 7 anos') dotColor = 'bg-sky-400 border border-sky-500';
                                        else if (entry.className === '8 a 10 anos') dotColor = 'bg-violet-400 border border-violet-500';
                                        else if (entry.className === 'Apoio') dotColor = 'bg-orange-500 border border-orange-600 animate-pulse';
                                        
                                        return (
                                            <span 
                                                key={entry.id} 
                                                className={`w-2 h-2 rounded-full ${dotColor}`} 
                                                title={entry.className} 
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CREATE / EDIT SCHEDULE MODAL */}
            <Modal
                isOpen={isAdding || !!editingEntry}
                onClose={() => {
                    setIsAdding(false);
                    setEditingEntry(null);
                    setCreateDate(null);
                }}
                title={editingEntry ? 'Editar Escala' : 'Nova Escala'}
                maxWidth="max-w-2xl"
            >
                <ScheduleForm
                    initialData={editingEntry || undefined}
                    date={createDate || todayStr}
                    volunteers={volunteers}
                    onSave={handleSaveForm}
                    onCancel={() => {
                        setIsAdding(false);
                        setEditingEntry(null);
                        setCreateDate(null);
                    }}
                />
            </Modal>

            {/* SCHEDULE DETAILS MODAL */}
            {selectedEntry && (
                <Modal
                    isOpen={isDetailsOpen}
                    onClose={() => {
                        setIsDetailsOpen(false);
                        setSelectedEntry(null);
                    }}
                    title={`Detalhes da Escala: ${selectedEntry.className}`}
                    maxWidth="max-w-2xl"
                >
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-blue-50/55 p-3 rounded-lg border border-blue-100">
                            <span className="text-sm font-semibold text-brand-blue">Data da Escala</span>
                            <span className="text-sm font-bold text-gray-800 bg-white px-2.5 py-1 rounded border">
                                {new Date(selectedEntry.date.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                        
                        {selectedEntry.team && (
                            <div className="flex justify-between items-center bg-purple-50/55 p-3 rounded-lg border border-purple-100">
                                <span className="text-sm font-semibold text-brand-purple">Equipe Responsável</span>
                                <span className="text-sm font-bold text-gray-800 bg-white px-2.5 py-1 rounded border">
                                    Equipe {selectedEntry.team}
                                </span>
                            </div>
                        )}

                        <div className="border-t border-gray-100 my-4 pt-3 space-y-2.5">
                            {selectedEntry.className === 'Apoio' ? (
                                <>
                                    <div className="flex justify-between py-2 border-b border-gray-50">
                                        <span className="font-semibold text-gray-600 text-sm">Escada:</span>
                                        <span className="text-gray-800 font-bold text-sm">
                                            {selectedEntry.escadaId ? volunteers.find(v => v.id === selectedEntry.escadaId)?.name || '?' : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-50">
                                        <span className="font-semibold text-gray-600 text-sm">Corredor:</span>
                                        <span className="text-gray-800 font-bold text-sm">
                                            {selectedEntry.corredorId ? volunteers.find(v => v.id === selectedEntry.corredorId)?.name || '?' : 'N/A'}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between py-2 border-b border-gray-50">
                                        <span className="font-semibold text-gray-600 text-sm">Coordenadora:</span>
                                        <span className="text-gray-800 font-bold text-sm">
                                            {selectedEntry.team 
                                                ? (volunteers.find(v => v.class === selectedEntry.className && v.type?.toLowerCase() === 'coordenadora')?.name || 'N/A')
                                                : (selectedEntry.coordinatorId ? volunteers.find(v => v.id === selectedEntry.coordinatorId)?.name || '?' : 'N/A')
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-50">
                                        <span className="font-semibold text-gray-600 text-sm">Supervisora:</span>
                                        <span className="text-gray-800 font-bold text-sm">
                                            {selectedEntry.team 
                                                ? (volunteers.find(v => v.team === selectedEntry.team && v.type?.toLowerCase() === 'supervisora')?.name || 'N/A')
                                                : (selectedEntry.supervisorId ? volunteers.find(v => v.id === selectedEntry.supervisorId)?.name || '?' : 'N/A')
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-50">
                                        <span className="font-semibold text-gray-600 text-sm">Mesa:</span>
                                        <span className="text-gray-800 font-bold text-sm">
                                            {selectedEntry.team 
                                                ? (volunteers.find(v => v.team === selectedEntry.team && v.type?.toLowerCase() === 'supervisora')?.name || 'N/A')
                                                : (selectedEntry.deskId ? volunteers.find(v => v.id === selectedEntry.deskId)?.name || '?' : 'N/A')
                                            }
                                        </span>
                                    </div>
                                    <div className="py-2">
                                        <span className="block font-semibold text-gray-600 mb-1 text-sm">Ministras:</span>
                                        <div className="bg-gray-50 p-2.5 rounded-lg text-xs text-gray-800 font-bold border border-gray-100">
                                            {selectedEntry.team 
                                                ? (volunteers.filter(v => v.team === selectedEntry.team && v.type?.toLowerCase() === 'ministra').map(m => m.name).join(', ') || 'N/A')
                                                : (selectedEntry.ministerIds && selectedEntry.ministerIds.length > 0 
                                                    ? selectedEntry.ministerIds.map(id => volunteers.find(v => v.id === id)?.name || '?').join(', ') 
                                                    : 'N/A')
                                            }
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                            {userRole !== 'Ministra' && (
                                <button
                                    onClick={() => {
                                        setEditingEntry(selectedEntry);
                                        setIsDetailsOpen(false);
                                        setSelectedEntry(null);
                                    }}
                                    className="bg-brand-blue text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm shadow-sm"
                                >
                                    Editar
                                </button>
                            )}
                            {(userRole === 'Pastor' || userRole === 'Coordenadora') && (
                                <button
                                    onClick={() => {
                                        if (window.confirm('Tem certeza que deseja excluir esta escala?')) {
                                            onDeleteSchedule(selectedEntry.id);
                                            setIsDetailsOpen(false);
                                            setSelectedEntry(null);
                                        }
                                    }}
                                    className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition text-sm shadow-sm"
                                >
                                    Excluir
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setIsDetailsOpen(false);
                                    setSelectedEntry(null);
                                }}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* DAILY LIST MODAL (FOR MOBILE OR CLICKS ON CELLS WITH ENTRIES) */}
            {selectedDayString && (
                <Modal
                    isOpen={!!selectedDayString}
                    onClose={() => setSelectedDayString(null)}
                    title={`Escalas em ${new Date(selectedDayString + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                    maxWidth="max-w-2xl"
                >
                    <div className="space-y-4">
                        <p className="text-xs text-gray-500">Selecione uma turma para ver os detalhes da equipe de voluntários:</p>
                        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                            {schedule
                                .filter(s => s.date && s.date.split('T')[0] === selectedDayString)
                                .filter(s => selectedClass === 'All' || s.className === selectedClass)
                                .filter(s => {
                                    if (showOnlyMySchedules && loggedInVolunteer) {
                                        return isVolunteerAssignedToEntry(loggedInVolunteer, s);
                                    }
                                    return true;
                                })
                                .sort((a, b) => {
                                    const indexA = SCHEDULE_CLASS_NAMES.indexOf(a.className);
                                    const indexB = SCHEDULE_CLASS_NAMES.indexOf(b.className);
                                    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
                                })
                                .map(entry => (
                                    <div
                                        key={entry.id}
                                        onClick={() => {
                                            setSelectedEntry(entry);
                                            setIsDetailsOpen(true);
                                            setSelectedDayString(null);
                                        }}
                                        className={`p-3 rounded-lg border shadow-sm cursor-pointer transition hover:shadow flex justify-between items-center ${getClassBadgeStyle(entry.className)}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {loggedInVolunteer && isVolunteerAssignedToEntry(loggedInVolunteer, entry) && <span className="text-amber-500">⭐</span>}
                                            <div>
                                                <h4 className="font-bold text-sm">{entry.className}</h4>
                                                {entry.team && <p className="text-[10px] mt-0.5 opacity-90">Equipe {entry.team}</p>}
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-inherit">Ver Detalhes &rarr;</span>
                                    </div>
                                ))
                            }
                        </div>
                        
                        {(userRole === 'Pastor' || userRole === 'Coordenadora') && (
                            <button
                                onClick={() => {
                                    setCreateDate(selectedDayString);
                                    setIsAdding(true);
                                    setSelectedDayString(null);
                                }}
                                className="w-full mt-2 bg-brand-blue text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition flex justify-center items-center gap-1.5 shadow-sm text-sm"
                            >
                                + Adicionar escala neste dia
                            </button>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Schedule;
