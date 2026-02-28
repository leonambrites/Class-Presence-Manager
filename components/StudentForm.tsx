import React, { useState, useEffect } from 'react';
import { CLASS_NAMES } from '../constants';
import { Student } from '../types';
import { calculateAge } from '../utils';

interface StudentFormProps {
  onSubmit: (formData: { name: string; class: string; age: number; guardianName: string; phone: string; birthday: string; hasAllergy?: boolean; allergyDescription?: string; }) => void;
  onCancel: () => void;
  initialData?: Partial<Student> | null;
}

const StudentForm: React.FC<StudentFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState(CLASS_NAMES[0]);
  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [hasAllergy, setHasAllergy] = useState(false);
  const [allergyDescription, setAllergyDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setStudentClass(initialData.class || CLASS_NAMES[0]);
      setGuardianName(initialData.guardianName || '');
      setPhone(initialData.phone || '');
      setBirthday(initialData.birthday || '');
      setHasAllergy(initialData.hasAllergy || false);
      setAllergyDescription(initialData.allergyDescription || '');
    } else {
      setName('');
      setStudentClass(CLASS_NAMES[0]);
      setGuardianName('');
      setPhone('');
      setBirthday('');
      setHasAllergy(false);
      setAllergyDescription('');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !studentClass || !guardianName || !phone || !birthday) {
      setError('Todos os campos são obrigatórios.');
      if (!name || !birthday) return;
    }
    setError('');

    // Calculate age based on birthday
    const calculatedAge = parseInt(String(calculateAge(birthday, initialData?.age || 0)), 10);

    onSubmit({
      name,
      class: studentClass,
      age: calculatedAge,
      guardianName,
      phone,
      birthday,
      hasAllergy,
      allergyDescription: hasAllergy ? allergyDescription : ''
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome do Aluno</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
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
          <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome do Responsável</label>
        <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Telefone</label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
      </div>
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hasAllergy"
            checked={hasAllergy}
            onChange={(e) => setHasAllergy(e.target.checked)}
            className="w-5 h-5 text-brand-blue rounded focus:ring-brand-blue"
          />
          <label htmlFor="hasAllergy" className="text-sm font-semibold text-gray-800 cursor-pointer select-none">O aluno possui alguma alergia?</label>
        </div>

        {hasAllergy && (
          <div className="mt-4 pl-8 border-l-2 border-brand-blue ml-2 transition-all">
            <label className="block text-sm font-medium text-gray-700">Qual(ais)?</label>
            <input
              type="text"
              value={allergyDescription}
              onChange={(e) => setAllergyDescription(e.target.value)}
              placeholder="Ex: Amendoim, Corante vermelho..."
              required={hasAllergy}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 transition">Salvar</button>
      </div>
    </form>
  );
};

export default StudentForm;
