
import React, { useState } from 'react';
import { Student } from '../types';
import { SearchIcon } from './icons';
import { CLASS_NAMES } from '../constants';

interface DismissalProps {
  students: Student[];
  onDismiss: (studentId: string, responsibleName: string, date: string) => void;
  selectedClass: string;
  onClassChange: (className: string) => void;
}

const Dismissal: React.FC<DismissalProps> = ({ students, onDismiss, selectedClass, onClassChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [responsibleNames, setResponsibleNames] = useState<{ [key: string]: string }>({});
  
  const studentsForClass = selectedClass === 'All'
    ? students
    : students.filter(s => s.class === selectedClass);

  const presentStudents = studentsForClass.filter(s => 
    s.attendance.some(a => a.date === date && a.present)
  );
  
  const filteredStudents = presentStudents
    .filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const getDismissalStatus = (student: Student) => {
      const attendanceForDate = student.attendance.find(a => a.date === date);
      if(attendanceForDate?.dismissedBy) {
          return <span className="text-sm font-semibold text-blue-600">Liberado para: {attendanceForDate.dismissedBy}</span>
      }
      return <span className="text-sm font-semibold text-green-600">Aguardando saída</span>
  }

  const handleResponsibleNameChange = (studentId: string, name: string) => {
      setResponsibleNames(prev => ({
          ...prev,
          [studentId]: name,
      }));
  };

  const handleConfirmDismiss = (studentId: string) => {
      const responsibleName = responsibleNames[studentId];
      if (responsibleName && responsibleName.trim()) {
          onDismiss(studentId, responsibleName.trim(), date);
          handleResponsibleNameChange(studentId, ''); // Clear input after dismiss
      }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
        <div>
            <h2 className="text-3xl font-bold text-brand-dark">Chamada da Saída</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-4 sm:mt-0">
            <div>
                 <label htmlFor="date-select-dismissal" className="mr-2 text-sm font-medium text-gray-600">Data:</label>
                 <input 
                    id="date-select-dismissal"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2"
                />
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
          {filteredStudents.map(student => {
            const isDismissed = !!student.attendance.find(a => a.date === date)?.dismissedBy;
            return (
                <li key={student.id} className="py-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                        <div>
                            <p className="font-medium text-lg text-gray-800">{student.name}</p>
                            <p className="text-sm text-gray-500">{student.class}</p>
                        </div>
                        <div className="mt-2 sm:mt-0">
                            {getDismissalStatus(student)}
                        </div>
                    </div>
                    {!isDismissed && (
                        <div className="mt-3 flex items-center space-x-2">
                            <input
                                type="text"
                                value={responsibleNames[student.id] || ''}
                                onChange={(e) => handleResponsibleNameChange(student.id, e.target.value)}
                                className="flex-grow px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue"
                                placeholder="Nome do responsável"
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirmDismiss(student.id)}
                            />
                            <button
                                onClick={() => handleConfirmDismiss(student.id)}
                                disabled={!responsibleNames[student.id]?.trim()}
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
