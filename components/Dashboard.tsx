import React from 'react';
import { Student, StudentType } from '../types';
import { CLASS_NAMES } from '../constants';

interface DashboardProps {
  students: Student[];
  selectedClass: string;
  onClassChange: (className: string) => void;
}

const StatCard: React.FC<{ title: string; value: number; color: string }> = ({ title, value, color }) => (
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

const Dashboard: React.FC<DashboardProps> = ({ students, selectedClass, onClassChange }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const studentsToDisplay = selectedClass === 'All' 
    ? students 
    : students.filter(s => s.class === selectedClass);

  const presentStudents = studentsToDisplay
    .filter(s => s.attendance.some(a => a.date === today && a.present))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const presentMembers = presentStudents.filter(s => s.type === StudentType.Membro).length;
  const presentVisitors = presentStudents.filter(s => s.type === StudentType.Visitante).length;
  const totalPresent = presentStudents.length;

  const getClassPresence = (className: string) => {
    return students.filter(s => 
        s.class === className && 
        s.attendance.some(a => a.date === today && a.present)
    ).length;
  };

  const classColors = ['bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-lime-500', 'bg-cyan-500', 'bg-violet-500'];

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 className="text-3xl font-bold text-brand-dark mb-4 sm:mb-0">
          Dashboard de Presença
        </h2>
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
        <h3 className="text-2xl font-bold text-brand-dark mb-4">Alunos Presentes Hoje {selectedClass !== 'All' ? `na Turma ${selectedClass}` : ''}</h3>
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
            <p className="text-center text-gray-500 py-8">Nenhum aluno presente ainda.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;