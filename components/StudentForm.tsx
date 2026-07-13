import React, { useState, useEffect, useRef } from 'react';
import { CLASS_NAMES } from '../constants';
import { Student } from '../types';
import { calculateAge, resizeImageToBase64, getStudentClass } from '../utils';

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
    imageUseAllowed?: boolean;
    imageUseDocument?: string;
    familyId?: string;
  }) => void;
  onCancel: () => void;
  initialData?: Partial<Student> | null;
  students?: Student[];
}

const StudentForm: React.FC<StudentFormProps> = ({ onSubmit, onCancel, initialData, students }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState('');
  const studentClass = getStudentClass(birthday, initialData?.age);
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
  
  // Image permission inputs
  const [imageUseAllowed, setImageUseAllowed] = useState(false);
  const [imageUseDocument, setImageUseDocument] = useState('');
  const [imageUseDocumentName, setImageUseDocumentName] = useState('');
  
  // Sibling search states
  const [siblingSearch, setSiblingSearch] = useState('');
  const [selectedSibling, setSelectedSibling] = useState<Student | null>(null);
  const [familyId, setFamilyId] = useState('');
  const [showSiblingLinker, setShowSiblingLinker] = useState(false);

  // Filter students based on typed name
  const siblingSuggestions = React.useMemo(() => {
    if (!students || siblingSearch.trim().length < 2) return [];
    const query = siblingSearch.toLowerCase();
    return students
      .filter(s => s.name.toLowerCase().includes(query) && s.id !== initialData?.id)
      .slice(0, 5);
  }, [students, siblingSearch, initialData]);
  
  const pdfInputRef = React.useRef<HTMLInputElement>(null);
  
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

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione apenas arquivos em formato PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo PDF deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUseDocument(reader.result as string);
      setImageUseDocumentName(file.name);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
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
      setImageUseAllowed(initialData.imageUseAllowed || false);
      setImageUseDocument(initialData.imageUseDocument || '');
      setImageUseDocumentName(initialData.imageUseDocument ? 'documento_assinado.pdf' : '');
      setFamilyId(initialData.familyId || '');
      setShowSiblingLinker(false);
      if (initialData.familyId && students) {
        const sib = students.find(s => s.id !== initialData.id && s.familyId === initialData.familyId);
        if (sib) {
          setSelectedSibling(sib);
        } else {
          setSelectedSibling(null);
        }
      } else {
        setSelectedSibling(null);
      }
    } else {
      setName('');
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
      setImageUseAllowed(false);
      setImageUseDocument('');
      setImageUseDocumentName('');
      setFamilyId('');
      setSelectedSibling(null);
      setSiblingSearch('');
      setShowSiblingLinker(false);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !studentClass || !phone || !birthday) {
      setError('Campos obrigatórios: Nome do aluno, Turma, Data de nascimento e Telefone.');
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
    } else {
      if (!motherName && !fatherName) {
        setError('Pelo menos um responsável deve ser preenchido: Nome da mãe ou Nome do pai.');
        return;
      }
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
    
    if (imageUseAllowed && !imageUseDocument) {
      setError('Por favor, envie o documento em PDF de autorização assinado pelo responsável.');
      return;
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
      photo,
      imageUseAllowed,
      imageUseDocument: imageUseAllowed ? imageUseDocument : '',
      familyId: familyId || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
      
      {/* Sibling Linkage via Search Input (when students list is provided) */}
      {students && showSiblingLinker && (
        <div className="flex flex-col gap-2 p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl relative">
          <label className="text-xs font-bold text-blue-900 flex items-center gap-1">
            <span>🔗</span> Vincular a um irmão já cadastrado:
          </label>
          
          {selectedSibling ? (
            <div className="flex items-center justify-between bg-blue-100/70 border border-blue-300 rounded-lg p-2.5">
              <div className="min-w-0">
                <p className="text-xs font-bold text-blue-950">✓ Irmão Vinculado: {selectedSibling.name}</p>
                <p className="text-[10px] text-blue-800 font-semibold mt-0.5">
                  Sala: {selectedSibling.class} • Responsável: {selectedSibling.guardianName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSibling(null);
                  setSiblingSearch('');
                  // Clear form fields
                  setPhone('');
                  setMotherName('');
                  setFatherName('');
                  setHasOtherGuardian(false);
                  setOtherGuardianName('');
                  setOtherGuardianRelationship('');
                  setCustomRelationship('');
                  setImageUseAllowed(false);
                  setImageUseDocument('');
                  setImageUseDocumentName('');
                  setFamilyId('');
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 rounded px-2 py-1 shadow-sm transition"
              >
                Remover
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={siblingSearch}
                onChange={(e) => setSiblingSearch(e.target.value)}
                placeholder="Digite o nome do irmão cadastrado para buscar..."
                className="w-full bg-white border border-blue-200 text-blue-950 text-xs rounded-lg p-2.5 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {siblingSuggestions.length > 0 && (
                <ul className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg z-50 divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {siblingSuggestions.map(sibling => (
                    <li key={sibling.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSibling(sibling);
                          setPhone(sibling.phone || '');
                          setMotherName(sibling.motherName || '');
                          setFatherName(sibling.fatherName || '');
                          setHasOtherGuardian(sibling.hasOtherGuardian || false);
                          setOtherGuardianName(sibling.otherGuardianName || '');
                          
                          const relationship = sibling.otherGuardianRelationship || '';
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
                          
                          setImageUseAllowed(sibling.imageUseAllowed || false);
                          setImageUseDocument(sibling.imageUseDocument || '');
                          setImageUseDocumentName(sibling.imageUseDocument ? 'documento_assinado.pdf' : '');
                          setFamilyId(sibling.familyId || `fam_${Date.now()}`);
                        }}
                        className="w-full text-left p-2.5 hover:bg-blue-50/50 transition flex flex-col gap-0.5"
                      >
                        <span className="text-xs font-bold text-gray-900">{sibling.name}</span>
                        <span className="text-[10px] text-gray-500 font-semibold">
                          Sala: {sibling.class} • Responsável: {sibling.guardianName}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {siblingSearch.trim().length >= 2 && siblingSuggestions.length === 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-lg p-3 text-center text-xs text-gray-500 z-50">
                  Nenhum irmão encontrado com o nome "{siblingSearch}".
                </div>
              )}
            </div>
          )}
          
          <p className="text-[10px] text-blue-800 leading-normal font-medium mt-0.5">
            Ao buscar e selecionar um irmão, os dados familiares e de imagem serão preenchidos automaticamente.
          </p>
        </div>
      )}

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
          <label className="block text-sm font-medium text-gray-700">Turma (Definida pela Idade)</label>
          <input
            type="text"
            readOnly
            value={studentClass}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 font-bold sm:text-sm select-none"
            title="A turma é calculada automaticamente baseada na idade do aluno."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome da Mãe</label>
          <input type="text" value={motherName} onChange={(e) => setMotherName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome do Pai</label>
          <input type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
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

      {/* Imagem Permission Section */}
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="imageUseAllowed"
            checked={imageUseAllowed}
            onChange={(e) => {
              setImageUseAllowed(e.target.checked);
              if (!e.target.checked) {
                setImageUseDocument('');
                setImageUseDocumentName('');
              }
            }}
            className="w-5 h-5 text-brand-blue rounded focus:ring-brand-blue cursor-pointer"
          />
          <label htmlFor="imageUseAllowed" className="text-sm font-semibold text-gray-800 cursor-pointer select-none">
            Autoriza o uso de imagem da criança?
          </label>
        </div>

        {imageUseAllowed && (
          <div className="mt-4 pl-8 border-l-2 border-brand-blue ml-2 space-y-3 transition-all">
            <label className="block text-sm font-medium text-gray-700">Termo de Autorização Assinado (PDF)</label>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfChange}
                className="hidden"
                ref={pdfInputRef}
              />
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {imageUseDocument ? 'Substituir PDF' : 'Selecionar PDF'}
              </button>
              {imageUseDocumentName && (
                <span className="text-sm text-gray-600 truncate max-w-[250px] font-medium" title={imageUseDocumentName}>
                  📎 {imageUseDocumentName}
                </span>
              )}
            </div>
            {imageUseDocument && (
              <div className="flex gap-4 text-xs font-semibold mt-1">
                <a
                  href={imageUseDocument}
                  download={imageUseDocumentName || 'autorizacao.pdf'}
                  className="text-brand-blue hover:underline flex items-center gap-1"
                >
                  Visualizar / Baixar PDF
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setImageUseDocument('');
                    setImageUseDocumentName('');
                  }}
                  className="text-red-500 hover:underline"
                >
                  Remover PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-250">
        <div>
          {students && (
            <button
              type="button"
              onClick={() => setShowSiblingLinker(!showSiblingLinker)}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 border shadow-sm ${
                showSiblingLinker
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100/80 border-blue-200'
              }`}
            >
              <span>🔗</span> {showSiblingLinker ? 'Ocultar Campo de Irmão' : 'Vincular Irmão'}
            </button>
          )}
        </div>
        <div className="flex space-x-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition text-sm font-semibold">Cancelar</button>
          <button type="submit" className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 transition text-sm font-semibold">Salvar</button>
        </div>
      </div>
    </form>
  );
};

export default StudentForm;
