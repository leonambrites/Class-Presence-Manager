import React, { useState } from 'react';
import { ScheduleEntry, Volunteer } from '../types';
import { CLASS_NAMES } from '../constants';

interface ScheduleProps {
    schedule: ScheduleEntry[];
    volunteers: Volunteer[];
    selectedClass: string;
    onClassChange: (className: string) => void;
    onAddSchedule: (entry: Omit<ScheduleEntry, 'id'>) => void;
    onEditSchedule: (entry: ScheduleEntry) => void;
    onDeleteSchedule: (id: string) => void;
}

const ScheduleForm: React.FC<{
    initialData?: ScheduleEntry,
    date: string,
    volunteers: Volunteer[],
    onSave: (data: any) => void,
    onCancel: () => void
}> = ({ initialData, date, volunteers, onSave, onCancel }) => {
    const [className, setClassName] = useState(initialData?.className || CLASS_NAMES[0]);
    const [selectedTeam, setSelectedTeam] = useState(initialData?.team || '');

    const uniqueTeams = Array.from(new Set(volunteers.map(v => v.team).filter(Boolean) as string[])).sort();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...(initialData ? { id: initialData.id } : {}),
            date,
            className,
            team: selectedTeam,
            // Fallback empty values to match API
            supervisorId: null,
            coordinatorId: null,
            deskId: null,
            ministerIds: []
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-brand-blue">
            <h3 className="text-xl font-bold text-brand-dark mb-4">{initialData ? 'Editar Escala' : 'Nova Escala'} ({new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')})</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2 bg-blue-50 p-4 rounded-md border border-blue-200">
                    <label className="block text-sm font-semibold text-brand-blue mb-1">Equipe Responsável</label>
                    <select required value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="w-full p-2 border border-blue-300 rounded-md bg-white focus:ring-brand-blue focus:border-brand-blue">
                        <option value="">Selecione a equipe de voluntários...</option>
                        {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                    <select required value={className} onChange={e => setClassName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                        {CLASS_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex gap-4">
                <button type="submit" className="bg-brand-blue text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                    Salvar
                </button>
                <button type="button" onClick={onCancel} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition">
                    Cancelar
                </button>
            </div>
        </form>
    );
};

const ScheduleCard: React.FC<{ entry: ScheduleEntry, volunteers: Volunteer[], onEdit: () => void, onDelete: () => void }> = ({ entry, volunteers, onEdit, onDelete }) => {
    // Legacy ID Lookups
    const getName = (id: string | null | undefined) => id ? volunteers.find(v => v.id === id)?.name || '?' : 'N/A';

    // Dynamic Team Lookups
    const dynamicSupervisor = entry.team ? volunteers.find(v => v.team === entry.team && v.type?.toLowerCase() === 'supervisora') : null;
    const dynamicCoordinator = entry.team ? volunteers.find(v => v.class === entry.className && v.type?.toLowerCase() === 'coordenadora') : null;
    const dynamicMinisters = entry.team ? volunteers.filter(v => v.team === entry.team && v.class === entry.className && v.type?.toLowerCase() === 'ministra') : [];

    // Fallbacks
    const showSupervisor = entry.team ? (dynamicSupervisor?.name || 'N/A') : getName(entry.supervisorId);
    const showCoordinator = entry.team ? (dynamicCoordinator?.name || 'N/A') : getName(entry.coordinatorId);
    const showDesk = entry.team ? (dynamicSupervisor?.name || 'N/A') : getName(entry.deskId);

    let showMinisters = 'N/A';
    if (entry.team) {
        if (dynamicMinisters.length > 0) {
            showMinisters = dynamicMinisters.map(m => m.name).join(', ');
        }
    } else {
        if (entry.ministerIds && entry.ministerIds.length > 0) {
            showMinisters = entry.ministerIds.map(id => getName(id)).join(', ');
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 relative border-l-4 border-brand-blue">
            <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={onEdit} className="text-brand-blue hover:text-blue-800 text-sm font-medium">Editar</button>
                <button onClick={onDelete} className="text-red-500 hover:text-red-700 text-sm font-medium">Excluir</button>
            </div>
            <h3 className="text-2xl font-bold text-brand-dark mb-1">{entry.className}</h3>
            {entry.team && <div className="text-sm font-semibold text-brand-blue mb-4">Equipe {entry.team}</div>}
            <div className="space-y-3">
                <div className="flex items-start">
                    <span className="font-semibold text-gray-600 w-32 shrink-0">Supervisora:</span>
                    <span className="text-gray-800">{showSupervisor}</span>
                </div>
                <div className="flex items-start">
                    <span className="font-semibold text-gray-600 w-32 shrink-0">Coordenadora:</span>
                    <span className="text-gray-800">{showCoordinator}</span>
                </div>
                <div className="flex items-start">
                    <span className="font-semibold text-gray-600 w-32 shrink-0">Mesa:</span>
                    <span className="text-gray-800">{showDesk}</span>
                </div>
                <div className="flex items-start">
                    <span className="font-semibold text-gray-600 w-32 shrink-0">Ministras:</span>
                    <span className="text-gray-800 flex-wrap">
                        {showMinisters}
                    </span>
                </div>
            </div>
        </div>
    );
};

const Schedule: React.FC<ScheduleProps> = ({ schedule, volunteers, selectedClass, onClassChange, onAddSchedule, onEditSchedule, onDeleteSchedule }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);

    const scheduleForDate = schedule.filter(s => s.date === selectedDate);
    const filteredSchedule = selectedClass === 'All'
        ? scheduleForDate
        : scheduleForDate.filter(s => s.className === selectedClass);

    const handleSaveForm = (data: any) => {
        if (data.id) {
            onEditSchedule(data);
        } else {
            onAddSchedule(data);
        }
        setIsAdding(false);
        setEditingEntry(null);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-brand-dark">Escala de Voluntários</h2>
                {volunteers.length > 0 && !isAdding && !editingEntry && (
                    <button onClick={() => setIsAdding(true)} className="bg-brand-blue text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                        + Nova Escala
                    </button>
                )}
            </div>

            {volunteers.length === 0 && (
                <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-6">
                    Você precisa cadastrar Professores/Voluntários antes de criar uma escala. Vá para a aba "Professores".
                </div>
            )}

            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div>
                        <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">Selecione a Data</label>
                        <input
                            id="date-select"
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        />
                    </div>
                    <div>
                        <label htmlFor="class-select-schedule" className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Turma</label>
                        <select
                            id="class-select-schedule"
                            value={selectedClass}
                            onChange={(e) => onClassChange(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2.5"
                        >
                            <option value="All">Todas as Turmas</option>
                            {CLASS_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {(isAdding || editingEntry) && (
                <ScheduleForm
                    initialData={editingEntry || undefined}
                    date={selectedDate}
                    volunteers={volunteers}
                    onSave={handleSaveForm}
                    onCancel={() => { setIsAdding(false); setEditingEntry(null); }}
                />
            )}

            <div>
                <h3 className="text-2xl font-bold text-brand-dark mb-4">
                    Escala para {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </h3>
                {filteredSchedule.length > 0 ? (
                    <div>
                        {filteredSchedule.map((entry) => (
                            <ScheduleCard
                                key={entry.id}
                                entry={entry}
                                volunteers={volunteers}
                                onEdit={() => setEditingEntry(entry)}
                                onDelete={() => {
                                    if (window.confirm('Tem certeza que deseja excluir esta escala?')) {
                                        onDeleteSchedule(entry.id);
                                    }
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center bg-white rounded-xl shadow-lg p-12">
                        <p className="text-gray-500">Nenhuma escala encontrada para a data e turma selecionadas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Schedule;
