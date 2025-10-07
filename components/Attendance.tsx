
import React, { useState } from 'react';
import { Student, StudentType } from '../types';
import StudentForm from './StudentForm';
import { SearchIcon } from './icons';
import { CLASS_NAMES } from '../constants';

interface AttendanceProps {
  students: Student[];
  onMarkPresence: (studentId: string, date: string) => void;
  onUnmarkPresence: (studentId: string, date: string) => void;
  onAddVisitor: (formData: { name: string; class: string; age: number; motherName: string; phone: string }, date: string) => void;
  selectedClass: string;
  onClassChange: (className: string) => void;
}

const Attendance: React.FC<AttendanceProps> = ({ students, onMarkPresence, onUnmarkPresence, onAddVisitor, selectedClass, onClassChange }) => {
  const [activeTab, setActiveTab] = useState<'Membro' | 'Visitante'>('Membro');
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

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
  
  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 className="text-3xl font-bold text-brand-dark mb-4 sm:mb-0">Marcar Presença</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div>
                <label htmlFor="date-select-attendance" className="mr-2 text-sm font-medium text-gray-600">Data da Aula:</label>
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
                    <div className="flex items-center space-x-4">
                        {getStudentStatus(student)}
                        {isPresent ? (
                            <button
                                onClick={() => onUnmarkPresence(student.id, date)}
                                className="px-4 py-1 bg-brand-yellow text-white rounded-full hover:bg-yellow-600 transition"
                            >
                                Desmarcar
                            </button>
                        ) : (
                            <button
                                onClick={() => onMarkPresence(student.id, date)}
                                className="px-4 py-1 bg-brand-green text-white rounded-full hover:bg-green-600 transition"
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
                                   <div className="flex items-center space-x-4">
                                      {getStudentStatus(visitor)}
                                       {isPresent ? (
                                            <button
                                                onClick={() => onUnmarkPresence(visitor.id, date)}
                                                className="px-4 py-1 bg-brand-yellow text-white rounded-full hover:bg-yellow-600 transition"
                                            >
                                                Desmarcar
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onMarkPresence(visitor.id, date)}
                                                className="px-4 py-1 bg-brand-green text-white rounded-full hover:bg-green-600 transition"
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
    </div>
  );
};

export default Attendance;