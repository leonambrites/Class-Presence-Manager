import React, { useState } from 'react';
import { Student, StudentType } from '../types';
import Modal from './Modal';
import StudentForm from './StudentForm';
import { SearchIcon, PlusCircleIcon, EditIcon, TrashIcon, UserPlusIcon } from './icons';
import { CLASS_NAMES } from '../constants';

interface StudentsProps {
  students: Student[];
  onAddStudent: (formData: { name: string; class: string; age: number; motherName: string; phone: string }) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onMakeMember: (studentId: string) => void;
  selectedClass: string;
  onClassChange: (className: string) => void;
}

const Students: React.FC<StudentsProps> = ({ students, onAddStudent, onEditStudent, onDeleteStudent, onMakeMember, selectedClass, onClassChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<StudentType>(StudentType.Membro);

  const today = new Date().toISOString().split('T')[0];
  
  const studentsForClass = selectedClass === 'All'
    ? students
    : students.filter(s => s.class === selectedClass);

  const filteredStudents = studentsForClass
    .filter(s => s.type === activeTab)
    .filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone.includes(searchTerm)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleDelete = (student: Student) => {
    if (window.confirm(`Tem certeza que deseja excluir o aluno ${student.name}?`)) {
      onDeleteStudent(student.id);
    }
  };

  const handleFormSubmit = (formData: { name: string; class: string; age: number; motherName: string; phone: string }) => {
    if (editingStudent) {
      onEditStudent({ ...editingStudent, ...formData });
    } else {
      onAddStudent(formData);
    }
    setIsModalOpen(false);
  };
  
  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 className="text-3xl font-bold text-brand-dark">Alunos Cadastrados</h2>
        <button onClick={handleOpenAddModal} className="flex items-center justify-center px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition shadow-sm">
          <PlusCircleIcon />
          <span className="ml-2">Adicionar Membro</span>
        </button>
      </div>

       <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
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
        <div className="flex items-center">
          <label htmlFor="class-select-students" className="mr-2 text-sm font-medium text-gray-600 shrink-0">Turma:</label>
          <select
              id="class-select-students"
              value={selectedClass}
              onChange={(e) => onClassChange(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block w-full p-2"
          >
              <option value="All">Todas as Turmas</option>
              {CLASS_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-2 sm:p-4">
        <div className="flex border-b mb-4">
            <button onClick={() => setActiveTab(StudentType.Membro)} className={`py-2 px-4 text-lg font-semibold transition-colors ${activeTab === StudentType.Membro ? 'border-b-2 border-brand-blue text-brand-blue' : 'text-gray-500'}`}>
                Membros
            </button>
            <button onClick={() => setActiveTab(StudentType.Visitante)} className={`py-2 px-4 text-lg font-semibold transition-colors ${activeTab === StudentType.Visitante ? 'border-b-2 border-brand-blue text-brand-blue' : 'text-gray-500'}`}>
                Visitantes
            </button>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turma</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato (Mãe)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Hoje</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map(student => (
                <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => handleOpenEditModal(student)} className="text-left hover:text-brand-blue transition-colors">
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">{student.age} anos</div>
                        </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.class}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.motherName}</div>
                        <div className="text-sm text-gray-500">{student.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    {student.attendance.some(a => a.date === today && a.present) ? 
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Presente</span> :
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Ausente</span>
                    }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                            {activeTab === StudentType.Visitante && (
                                <button onClick={() => onMakeMember(student.id)} className="text-gray-500 hover:text-brand-green" title="Tornar Membro"><UserPlusIcon /></button>
                            )}
                            <button onClick={() => handleOpenEditModal(student)} className="text-gray-500 hover:text-brand-blue" title="Editar Aluno"><EditIcon /></button>
                            <button onClick={() => handleDelete(student)} className="text-gray-500 hover:text-brand-red" title="Excluir Aluno"><TrashIcon /></button>
                        </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-4">
            {filteredStudents.map(student => (
                <div key={student.id} className="bg-gray-50 p-4 rounded-lg shadow">
                    <div className="flex justify-between items-start">
                        <button onClick={() => handleOpenEditModal(student)} className="text-left">
                            <p className="text-lg font-bold text-gray-900 hover:text-brand-blue transition-colors">{student.name}</p>
                            <p className="text-sm text-gray-500">{student.age} anos</p>
                        </button>
                        {student.attendance.some(a => a.date === today && a.present) ? 
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Presente</span> :
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Ausente</span>
                        }
                    </div>
                    <div className="mt-4 border-t pt-3 space-y-1">
                        <p className="text-sm text-gray-600">Turma: <span className="font-medium text-gray-800">{student.class}</span></p>
                        <p className="text-sm text-gray-600">Mãe: <span className="font-medium text-gray-800">{student.motherName}</span></p>
                        <p className="text-sm text-gray-600">Tel: <span className="font-medium text-gray-800">{student.phone}</span></p>
                    </div>
                    <div className="flex justify-end items-center mt-3 border-t pt-3 space-x-4">
                        {activeTab === StudentType.Visitante && (
                            <button onClick={() => onMakeMember(student.id)} className="text-gray-500 hover:text-brand-green flex items-center gap-1 text-sm"><UserPlusIcon className="h-4 w-4" /> Tornar Membro</button>
                        )}
                        <button onClick={() => handleOpenEditModal(student)} className="text-gray-500 hover:text-brand-blue flex items-center gap-1 text-sm"><EditIcon className="h-4 w-4" /> Editar</button>
                        <button onClick={() => handleDelete(student)} className="text-gray-500 hover:text-brand-red flex items-center gap-1 text-sm"><TrashIcon className="h-4 w-4" /> Excluir</button>
                    </div>
                </div>
            ))}
        </div>

        {filteredStudents.length === 0 && (
            <p className="text-center text-gray-500 py-8">Nenhum aluno encontrado.</p>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStudent ? "Editar Aluno" : "Adicionar Novo Membro"}>
        <StudentForm 
            onSubmit={handleFormSubmit} 
            onCancel={() => setIsModalOpen(false)}
            initialData={editingStudent}
        />
      </Modal>
    </div>
  );
};

export default Students;