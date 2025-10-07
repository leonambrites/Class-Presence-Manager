import React, { useState } from 'react';
import { ScheduleEntry, Volunteer } from '../types';
import { CLASS_NAMES } from '../constants';

interface ScheduleProps {
  schedule: ScheduleEntry[];
  volunteers: Volunteer[];
  selectedClass: string;
  onClassChange: (className: string) => void;
}

const ScheduleCard: React.FC<{ entry: ScheduleEntry, volunteers: Volunteer[] }> = ({ entry, volunteers }) => {
    const getName = (id: string | null) => id ? volunteers.find(v => v.id === id)?.name || '?' : 'N/A';
    
    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
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
                        {entry.ministerIds.map(id => getName(id)).join(', ')}
                    </span>
                </div>
            </div>
        </div>
    );
};

const Schedule: React.FC<ScheduleProps> = ({ schedule, volunteers, selectedClass, onClassChange }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const scheduleForDate = schedule.filter(s => s.date === selectedDate);
  const filteredSchedule = selectedClass === 'All' 
    ? scheduleForDate 
    : scheduleForDate.filter(s => s.className === selectedClass);

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-3xl font-bold text-brand-dark mb-6">Escala de Voluntários</h2>
      
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

      <div>
        <h3 className="text-2xl font-bold text-brand-dark mb-4">
            Escala para {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
        </h3>
        {filteredSchedule.length > 0 ? (
            <div>
                {filteredSchedule.map((entry, index) => (
                    <ScheduleCard key={index} entry={entry} volunteers={volunteers} />
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
