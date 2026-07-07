import React, { useState, useEffect, useRef } from 'react';
import { CLASS_NAMES } from '../constants';
import { Student } from '../types';
import { calculateAge, resizeImageToBase64 } from '../utils';

interface StudentFormProps {
  onSubmit: (formData: { 
    name: string; 
    class: string; 
    age: number; 
    guardianName: string; 
    phone: string; 
    birthday: string; 
    hasAllergy?: boolean; 
    allergyDescription?: string;
    motherName?: string;
    fatherName?: string;
    hasOtherGuardian?: boolean;
    otherGuardianName?: string;
    otherGuardianRelationship?: string;
    photo?: string;
  }) => void;
  onCancel: () => void;
  initialData?: Partial<Student> | null;
}

const StudentForm: React.FC<StudentFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState(CLASS_NAMES[0]);
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [hasAllergy, setHasAllergy] = useState(false);
  const [allergyDescription, setAllergyDescription] = useState('');
  
  // Guardian inputs
  const [motherName, setMotherName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [hasOtherGuardian, setHasOtherGuardian] = useState(false);
  const [otherGuardianName, setOtherGuardianName] = useState('');
  const [otherGuardianRelationship, setOtherGuardianRelationship] = useState('');
  const [customRelationship, setCustomRelationship] = useState('');
  const [photo, setPhoto] = useState('');
  
  const [error, setError] = useState('');

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImageToBase64(file, 200, 200);
      setPhoto(base64);
    } catch (err) {
      console.error("Erro ao processar foto:", err);
      setError("Falha ao carregar e redimensionar a foto.");
    }
  };

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setStudentClass(initialData.class || CLASS_NAMES[0]);
      setPhone(initialData.phone || '');
      setBirthday(initialData.birthday || '');
      setHasAllergy(initialData.hasAllergy || false);
      setAllergyDescription(initialData.allergyDescription || '');
      
      // Load guardian states
      setMotherName(initialData.motherName || '');
      setFatherName(initialData.fatherName || '');
      setHasOtherGuardian(initialData.hasOtherGuardian || false);
      setOtherGuardianName(initialData.otherGuardianName || '');
      
      const relationship = initialData.otherGuardianRelationship || '';
      const isPredefined = ['Avô/Avó', 'Tio/Tia', 'Irmão/Irmã', 'Padrasto/Madrasta', 'Cuidador(a)/Babá', 'Vizinho(a)'].includes(relationship);
      if (relationship) {
        if (isPredefined) {
          setOtherGuardianRelationship(relationship);
          setCustomRelationship('');
        } else {
          setOtherGuardianRelationship('Outro');
          setCustomRelationship(relationship);
        }
      } else {
        setOtherGuardianRelationship('');
        setCustomRelationship('');
      }
      setPhoto(initialData.photo || '');
    } else {
      setName('');
      setStudentClass(CLASS_NAMES[0]);
      setPhone('');
      setBirthday('');
      setHasAllergy(false);
      setAllergyDescription('');
      setMotherName('');
      setFatherName('');
      setHasOtherGuardian(false);
      setOtherGuardianName('');
      setOtherGuardianRelationship('');
      setCustomRelationship('');
      setPhoto('');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !studentClass || !motherName || !fatherName || !phone || !birthday) {
      setError('Campos obrigatórios: Nome do aluno, Turma, Data de nascimento, Nome da mãe, Nome do pai e Telefone.');
      return;
    }
    
    if (hasOtherGuardian) {
      if (!otherGuardianName) {
        setError('O nome do outro responsável é obrigatório.');
        return;
      }
      if (!otherGuardianRelationship) {
        setError('O grau de parentesco do outro responsável é obrigatório.');
        return;
      }
      if (otherGuardianRelationship === 'Outro' && !customRelationship) {
        setError('Por favor, especifique o grau de parentesco.');
        return;
      }
    }
    
    setError('');

    // Calculate age based on birthday
    const calculatedAge = parseInt(String(calculateAge(birthday, initialData?.age || 0)), 10);

    const finalRelationship = otherGuardianRelationship === 'Outro' ? customRelationship : otherGuardianRelationship;
    
    // Compute legacy guardianName
    let computedGuardianName = '';
    if (hasOtherGuardian && otherGuardianName) {
      computedGuardianName = `${otherGuardianName} (${finalRelationship || 'Outro'})`;
    } else if (motherName) {
      computedGuardianName = motherName;
    } else if (fatherName) {
      computedGuardianName = fatherName;
    }

    onSubmit({
      name,
      class: studentClass,
      age: calculatedAge,
      guardianName: computedGuardianName,
      phone,
      birthday,
      hasAllergy,
      allergyDescription: hasAllergy ? allergyDescription : '',
      motherName,
      fatherName,
      hasOtherGuardian,
      otherGuardianName: hasOtherGuardian ? otherGuardianName : '',
      otherGuardianRelationship: hasOtherGuardian ? finalRelationship : '',
      photo
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
      
      {/* Photo Upload Section */}
      <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 w-full text-center">Foto da Criança</label>
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-brand-blue bg-gray-200 flex items-center justify-center shadow-inner">
          {photo ? (
            <img src={photo} alt="Avatar da criança" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 text-3xl select-none">👤</span>
          )}
        </div>
        
        {/* Hidden inputs */}
        <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} ref={cameraInputRef} className="hidden" />
        <input type="file" accept="image/*" onChange={handlePhotoChange} ref={fileInputRef} className="hidden" />
        
        {/* Mobile Camera and Gallery controls */}
        <div className="flex gap-2">
          <button 
            type="button" 
            onClick={() => cameraInputRef.current?.click()} 
            className="px-3 py-1.5 text-xs bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-1 font-semibold shadow-sm"
          >
            📷 Tirar Foto
          </button>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-1 font-semibold shadow-sm"
          >
            📁 Galeria
          </button>
        </div>

        {photo && (
          <button type="button" onClick={() => setPhoto('')} className="text-xs text-red-500 hover:text-red-700 transition font-medium">Remover Foto</button>
        )}
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome da Mãe</label>
          <input type="text" value={motherName} onChange={(e) => setMotherName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome do Pai</label>
          <input type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Telefone para Contato</label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
      </div>

      {/* Outro Responsável Section */}
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hasOtherGuardian"
            checked={hasOtherGuardian}
            onChange={(e) => setHasOtherGuardian(e.target.checked)}
            className="w-5 h-5 text-brand-blue rounded focus:ring-brand-blue cursor-pointer"
          />
          <label htmlFor="hasOtherGuardian" className="text-sm font-semibold text-gray-800 cursor-pointer select-none">
            Outro Responsável
          </label>
        </div>

        {hasOtherGuardian && (
          <div className="mt-4 pl-8 border-l-2 border-brand-blue ml-2 space-y-4 transition-all">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome do Responsável</label>
              <input
                type="text"
                value={otherGuardianName}
                onChange={(e) => setOtherGuardianName(e.target.value)}
                required={hasOtherGuardian}
                placeholder="Ex: Maria de Souza"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Grau de Parentesco / Relação</label>
              <select
                value={otherGuardianRelationship}
                onChange={(e) => setOtherGuardianRelationship(e.target.value)}
                required={hasOtherGuardian}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
              >
                <option value="">Selecione...</option>
                <option value="Avô/Avó">Avô/Avó</option>
                <option value="Tio/Tia">Tio/Tia</option>
                <option value="Irmão/Irmã">Irmão/Irmã</option>
                <option value="Padrasto/Madrasta">Padrasto/Madrasta</option>
                <option value="Cuidador(a)/Babá">Cuidador(a)/Babá</option>
                <option value="Vizinho(a)">Vizinho(a)</option>
                <option value="Outro">Outro (especificar)</option>
              </select>
            </div>

            {otherGuardianRelationship === 'Outro' && (
              <div className="mt-2 pl-4 border-l-2 border-gray-350 ml-1">
                <label className="block text-sm font-medium text-gray-750">Especifique a Relação</label>
                <input
                  type="text"
                  value={customRelationship}
                  onChange={(e) => setCustomRelationship(e.target.value)}
                  required={otherGuardianRelationship === 'Outro'}
                  placeholder="Ex: Primo, Amigo da família..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alergias Section */}
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hasAllergy"
            checked={hasAllergy}
            onChange={(e) => setHasAllergy(e.target.checked)}
            className="w-5 h-5 text-brand-blue rounded focus:ring-brand-blue cursor-pointer"
          />
          <label htmlFor="hasAllergy" className="text-sm font-semibold text-gray-800 cursor-pointer select-none">
            O aluno possui alguma alergia?
          </label>
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
