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
    const [supervisorId, setSupervisorId] = useState(initialData?.supervisorId || '');
    const [coordinatorId, setCoordinatorId] = useState(initialData?.coordinatorId || '');
    const [deskId, setDeskId] = useState(initialData?.deskId || '');
    const [ministerIds, setMinisterIds] = useState<string[]>(initialData?.ministerIds || []);

    const filteredVolunteers = volunteers.filter(v =>
        v.class === className ||
        !v.class ||
        [supervisorId, coordinatorId, deskId, ...ministerIds].includes(v.id)
    );

    const handleSupervisorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSupervisorId = e.target.value;
        setSupervisorId(newSupervisorId);
        // Auto-fill "Mesa" with the same ID as "Supervisora"
        setDeskId(newSupervisorId);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...(initialData ? { id: initialData.id } : {}),
            date,
            className,
            supervisorId: supervisorId || null,
            coordinatorId: coordinatorId || null,
            deskId: deskId || null,
            ministerIds
        });
    };

    const handleMinisterToggle = (id: string) => {
        setMinisterIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-brand-blue">
            <h3 className="text-xl font-bold text-brand-dark mb-4">{initialData ? 'Editar Escala' : 'Nova Escala'} ({new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')})</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                    <select required value={className} onChange={e => setClassName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                        {CLASS_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supervisora</label>
                    <select value={supervisorId} onChange={handleSupervisorChange} className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="">Nenhuma</option>
                        {filteredVolunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coordenadora</label>
                    <select value={coordinatorId} onChange={e => setCoordinatorId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="">Nenhuma</option>
                        {filteredVolunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mesa</label>
                    <select value={deskId} onChange={e => setDeskId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="">Nenhuma</option>
                        {filteredVolunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ministras</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {filteredVolunteers.map(v => (
                        <label key={v.id} className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" checked={ministerIds.includes(v.id)} onChange={() => handleMinisterToggle(v.id)} className="rounded text-brand-blue focus:ring-brand-blue" />
                            <span>{v.name}</span>
                        </label>
                    ))}
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
    const getName = (id: string | null) => id ? volunteers.find(v => v.id === id)?.name || '?' : 'N/A';

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 relative">
            <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={onEdit} className="text-brand-blue hover:text-blue-800 text-sm font-medium">Editar</button>
                <button onClick={onDelete} className="text-red-500 hover:text-red-700 text-sm font-medium">Excluir</button>
            </div>
            <h3 className="text-2xl font-bold text-brand-dark mb-4">{entry.className}</h3>
            <div className="space-y-3">
                <div className="flex items-start">
                    <span className="font-semibold text-gray-600 w-32 shrink-0">Supervisora:</span>
                    <span className="text-gray-800">{getName(entry.supervisorId)}</span>
                </div>
                <div className="flex items-start">
                    <span className="font-semibold text-gray-600 w-32 shrink-0">Coordenadora:</span>
                    <span className="text-gray-800">{getName(entry.coordinatorId)}</span>
                </div>
                <div className="flex items-start">
                    <span className="font-semibold text-gray-600 w-32 shrink-0">Mesa:</span>
                    <span className="text-gray-800">{getName(entry.deskId)}</span>
                </div>
                <div className="flex items-start">
                    <span className="font-semibold text-gray-600 w-32 shrink-0">Ministras:</span>
                    <span className="text-gray-800 flex-wrap">
                        {entry.ministerIds.length > 0 ? entry.ministerIds.map(id => getName(id)).join(', ') : 'N/A'}
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
