
import React, { useState, useMemo } from 'react';
import { Student, UserRole } from '../types';
import { SearchIcon } from './icons';
import { CLASS_NAMES } from '../constants';

interface DismissalProps {
  students: Student[];
  onDismiss: (studentId: string, responsibleName: string, date: string) => void;
  selectedClass: string;
  onClassChange: (className: string) => void;
  userRole: UserRole;
}

const Dismissal: React.FC<DismissalProps> = ({ students, onDismiss, selectedClass, onClassChange, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [responsibleNames, setResponsibleNames] = useState<{ [key: string]: string }>({});

  const studentsForClass = selectedClass === 'All'
    ? students
    : students.filter(s => s.class === selectedClass);

  const presentStudents = useMemo(() => {
    const list: { student: Student; date: string; dismissedBy?: string | null; dailyCode?: number | null }[] = [];
    studentsForClass.forEach(student => {
      student.attendance.forEach(att => {
        if (att.date >= startDate && att.date <= endDate && att.present) {
          list.push({
            student,
            date: att.date,
            dismissedBy: att.dismissedBy,
            dailyCode: att.dailyCode
          });
        }
      });
    });
    return list;
  }, [studentsForClass, startDate, endDate]);

  const filteredStudents = useMemo(() => {
    return presentStudents
      .filter(item =>
        item.student.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.date.localeCompare(a.date) || a.student.name.localeCompare(b.student.name));
  }, [presentStudents, searchTerm]);

  const getDismissalStatus = (dismissedBy?: string | null) => {
    if (dismissedBy) {
      return <span className="text-sm font-semibold text-blue-600">Liberado para: {dismissedBy}</span>
    }
    return <span className="text-sm font-semibold text-green-600">Aguardando saída</span>
  }

  const handleResponsibleNameChange = (studentId: string, dateStr: string, name: string) => {
    const key = `${studentId}-${dateStr}`;
    setResponsibleNames(prev => ({
      ...prev,
      [key]: name,
    }));
  };

  const handleConfirmDismiss = (studentId: string, dateStr: string) => {
    const key = `${studentId}-${dateStr}`;
    const responsibleName = responsibleNames[key];
    if (responsibleName && responsibleName.trim()) {
      onDismiss(studentId, responsibleName.trim(), dateStr);
      setResponsibleNames(prev => ({
        ...prev,
        [key]: '',
      })); // Clear input after dismiss
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
        <div>
          <h2 className="text-3xl font-bold text-brand-dark">Chamada da Saída</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-4 sm:mt-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <div>
              <label htmlFor="start-date-dismissal" className="mr-2 text-sm font-medium text-gray-600">De:</label>
              <input
                id="start-date-dismissal"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2"
              />
            </div>
            <div>
              <label htmlFor="end-date-dismissal" className="mr-2 text-sm font-medium text-gray-600">Até:</label>
              <input
                id="end-date-dismissal"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2"
              />
            </div>
          </div>
          <div className="flex items-center w-full">
            <label htmlFor="class-select-dismissal" className="mr-2 text-sm font-medium text-gray-600">Turma:</label>
            <select
              id="class-select-dismissal"
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

      <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 mt-6">
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Buscar aluno presente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </div>
        </div>
        <ul className="divide-y divide-gray-200">
          {filteredStudents.map(item => {
            const student = item.student;
            const isDismissed = !!item.dismissedBy;
            const inputKey = `${student.id}-${item.date}`;
            return (
              <li key={`${student.id}-${item.date}`} className="py-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                  <div>
                    <p className="font-medium text-lg text-gray-800">{item.dailyCode && <span className="mr-2 px-2 py-0.5 text-xs font-bold bg-brand-blue/10 text-brand-blue rounded-full">#{item.dailyCode}</span>}{student.name}</p>
                    <p className="text-sm text-gray-500">
                      {student.class}
                      {startDate !== endDate && (
                        <span className="ml-2 font-semibold text-brand-purple">
                          • {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    {getDismissalStatus(item.dismissedBy)}
                  </div>
                </div>
                {!isDismissed && (
                  <div className="mt-3 flex items-center space-x-2">
                    <input
                      type="text"
                      value={responsibleNames[inputKey] || ''}
                      onChange={(e) => handleResponsibleNameChange(student.id, item.date, e.target.value)}
                      className="flex-grow px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue"
                      placeholder="Nome do responsável"
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmDismiss(student.id, item.date)}
                    />
                    <button
                      onClick={() => handleConfirmDismiss(student.id, item.date)}
                      disabled={!responsibleNames[inputKey]?.trim()}
                      className="px-4 py-2 bg-brand-red text-white text-sm font-semibold rounded-md hover:bg-red-600 disabled:bg-gray-300 transition-colors"
                    >
                      Registrar Saída
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {filteredStudents.length === 0 && (
          <p className="text-center text-gray-500 py-8">Nenhum aluno aguardando saída para esta data/turma.</p>
        )}
      </div>
    </div>
  );
};

export default Dismissal;
