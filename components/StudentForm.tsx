
import React, { useState, useEffect } from 'react';
import { CLASS_NAMES } from '../constants';
import { Student } from '../types';

interface StudentFormProps {
  onSubmit: (formData: { name: string; class: string; age: number; motherName: string; phone: string }) => void;
  onCancel: () => void;
  initialData?: Partial<Student> | null;
}

const StudentForm: React.FC<StudentFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState(CLASS_NAMES[0]);
  const [age, setAge] = useState('');
  const [motherName, setMotherName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setStudentClass(initialData.class || CLASS_NAMES[0]);
      setAge(initialData.age ? String(initialData.age) : '');
      setMotherName(initialData.motherName || '');
      setPhone(initialData.phone || '');
    } else {
        setName('');
        setStudentClass(CLASS_NAMES[0]);
        setAge('');
        setMotherName('');
        setPhone('');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !studentClass || !age || !motherName || !phone) {
      setError('Todos os campos são obrigatórios.');
      return;
    }
    setError('');
    onSubmit({ name, class: studentClass, age: parseInt(age, 10), motherName, phone });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome do Aluno</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Turma</label>
          <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm">
            {CLASS_NAMES.map(className => (
                <option key={className} value={className}>{className}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Idade</label>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome da Mãe</label>
        <input type="text" value={motherName} onChange={(e) => setMotherName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Telefone</label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 transition">Salvar</button>
      </div>
    </form>
  );
};

export default StudentForm;
