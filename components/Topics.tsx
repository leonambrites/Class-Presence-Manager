import React, { useState, useRef, useEffect } from 'react';
import { Topic, UserRole } from '../types';
import { CLASS_NAMES } from '../constants';
import Modal from './Modal';
import { put } from '@vercel/blob/client';

interface TopicsProps {
  topics: Topic[];
  onAddTopic: (date: string, title: string, description: string) => void;
  onEditTopic: (id: string, date: string, title: string, description: string) => void;
  onDeleteTopic: (id: string) => void;
  onImportTopics: (imported: Omit<Topic, 'id'>[]) => void;
  userRole: UserRole;
}

interface AvailableLesson {
  fileName: string;
  sizeBytes: number;
  className: string;
  date: string;
  parsed: boolean;
}

const MONTHS_PT = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const Topics: React.FC<TopicsProps> = ({ 
  topics, 
  onAddTopic, 
  onEditTopic, 
  onDeleteTopic, 
  onImportTopics, 
  userRole 
}) => {
  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState<'history' | 'files'>('history');

  // Default values to show future classes starting from today (prevent clutter), allowing retro past lookups via date filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState('');

  // Editing topic state (Modal edit dialog)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Downloading topic state (Modal select class dialog)
  const [downloadingTopic, setDownloadingTopic] = useState<Topic | null>(null);
  const [downloadClass, setDownloadClass] = useState<string>(CLASS_NAMES[0]);

  // Option A: Direct Upload Lesson file state (Modal upload dialog)
  const [uploadingTopic, setUploadingTopic] = useState<Topic | null>(null);
  const [uploadingClass, setUploadingClass] = useState<string>(CLASS_NAMES[0]);
  const [directFile, setDirectFile] = useState<File | null>(null);
  const [directUploading, setDirectUploading] = useState(false);

  // Option B: Physical Lessons files management state (Central de Aulas)
  const [availableLessons, setAvailableLessons] = useState<AvailableLesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [searchFileClass, setSearchFileClass] = useState('');
  const [searchFileMonth, setSearchFileMonth] = useState('');
  const [searchFileYear, setSearchFileYear] = useState('');

  // Option B: Drag and Drop Bulk Uploader State
  const [isDragActive, setIsDragActive] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkUploadStatus, setBulkUploadStatus] = useState<{ [fileName: string]: 'pending' | 'uploading' | 'success' | 'error' }>({});
  const [bulkUploadResults, setBulkUploadResults] = useState<string[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available lesson files from backend
  const fetchAvailableLessons = async () => {
    setLoadingLessons(true);
    try {
      const response = await fetch('/api/available-lessons');
      if (response.ok) {
        const data = await response.json();
        setAvailableLessons(data.lessons || []);
      }
    } catch (error) {
      console.error('Error fetching available lesson files:', error);
    } finally {
      setLoadingLessons(false);
    }
  };

  // Fetch lessons when shifting to files central tab
  useEffect(() => {
    if (activeTab === 'files') {
      fetchAvailableLessons();
    }
  }, [activeTab]);

  const handleStartEdit = (topic: Topic) => {
    if (topic.id) {
      setEditingTopic(topic);
      setEditDate(topic.date);
      setEditTitle(topic.title);
      setEditDescription(topic.description);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTopic && editingTopic.id && editTitle.trim() && editDescription.trim() && editDate) {
      onEditTopic(editingTopic.id, editDate, editTitle.trim(), editDescription.trim());
      setEditingTopic(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingTopic(null);
    setEditDate('');
    setEditTitle('');
    setEditDescription('');
  };

  // Helper to calculate Sunday date from Sunday number, Month, and Year
  const calculateSundayDate = (sundayNum: number, monthName: string, year: number): string => {
    const monthIndex = MONTHS_PT.indexOf(monthName.toUpperCase());
    if (monthIndex === -1) return '';

    const sundays: string[] = [];
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, monthIndex, day);
      if (d.getDay() === 0) { // Sunday
        const yyyy = year;
        const mm = String(monthIndex + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        sundays.push(`${yyyy}-${mm}-${dd}`);
      }
    }

    if (sundayNum >= 1 && sundayNum <= sundays.length) {
      return sundays[sundayNum - 1];
    }
    return '';
  };

  // Helper to parse filename structure
  const parseLessonFileName = (fileName: string) => {
    const regex = /^AULA\s+(\d+)\s+([A-ZÇÁÉÍÓÚÂÊÔÕÃ]+)\s+(\d{4})\s*-\s*(.+)\.docx$/i;
    const match = fileName.match(regex);
    if (!match) return null;

    const sundayNum = parseInt(match[1], 10);
    const monthName = match[2].toUpperCase();
    const year = parseInt(match[3], 10);
    const className = match[4].trim();

    const date = calculateSundayDate(sundayNum, monthName, year);

    return {
      sundayNum,
      monthName,
      year,
      className,
      date
    };
  };

  // Helper to calculate lesson filename based on date and class (naming convention)
  const getLessonFileName = (topicDate: string, className: string) => {
    const d = new Date(topicDate + 'T00:00:00');
    const day = d.getDate();
    const monthNum = d.getMonth();
    const year = d.getFullYear();
    
    const monthName = MONTHS_PT[monthNum];
    const sundayNum = Math.ceil(day / 7);
    const upperClass = className.toUpperCase();

    return `AULA ${sundayNum} ${monthName} ${year} - ${upperClass}.docx`;
  };

  const handleDownloadWord = (topicDate: string, className: string, topicTitle?: string, topicDesc?: string) => {
    const fileName = getLessonFileName(topicDate, className);
    
    // Construct the download URL with parameters for fallback generation
    const params = new URLSearchParams({
      fileName,
      title: topicTitle || '',
      description: topicDesc || '',
      date: topicDate,
      className
    });
    
    const downloadUrl = `/api/download-lesson?${params.toString()}`;
    
    // Trigger file download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Robust CSV/Excel parser
  const parseCSV = (text: string): Omit<Topic, 'id'>[] => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const cleanCell = (cell: string) => cell.replace(/^["']|["']$/g, '').trim();
    const headers = firstLine.split(delimiter).map(h => cleanCell(h).toLowerCase());

    let dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date'));
    let titleIdx = headers.findIndex(h => h.includes('título') || h.includes('titulo') || h.includes('title') || h.includes('assunto'));
    let descIdx = headers.findIndex(h => h.includes('descrição') || h.includes('descricao') || h.includes('description') || h.includes('conteúdo') || h.includes('conteudo'));

    if (dateIdx === -1) dateIdx = 0;
    if (titleIdx === -1) titleIdx = 1;
    if (descIdx === -1) descIdx = 2;

    const parsedTopics: Omit<Topic, 'id'>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(delimiter).map(cleanCell);
      if (cells.length <= Math.max(dateIdx, titleIdx, descIdx)) continue;

      const rawDate = cells[dateIdx];
      const parsedTitle = cells[titleIdx];
      const parsedDesc = cells[descIdx] || '';

      if (!rawDate || !parsedTitle) continue;

      let formattedDate = rawDate;
      if (rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          let year = parts[2];
          if (year.length === 2) year = '20' + year;
          formattedDate = `${year}-${month}-${day}`;
        }
      }

      parsedTopics.push({
        date: formattedDate,
        title: parsedTitle,
        description: parsedDesc
      });
    }

    return parsedTopics;
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          alert("Nenhum assunto válido encontrado. Verifique se o arquivo possui colunas corretas (Ex: Data, Título, Descrição) e delimitadores de vírgula ou ponto-e-vírgula.");
          return;
        }

        const confirm = window.confirm(`Deseja importar ${parsed.length} assuntos encontrados no arquivo de planilha?`);
        if (confirm) {
          onImportTopics(parsed);
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao processar o arquivo CSV. Certifique-se de que é um formato válido.");
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = ''; // Reset
  };

  // Convert File object to Base64 String
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Option A: Handle direct file upload for specific Topic card
  const handleDirectUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingTopic || !directFile) return;

    if (directFile.size > 50 * 1024 * 1024) {
      alert(`O arquivo "${directFile.name}" é muito grande (${(directFile.size / (1024 * 1024)).toFixed(1)} MB). O limite máximo de envio é de 50 MB.`);
      return;
    }

    setDirectUploading(true);
    try {
      const generatedName = getLessonFileName(uploadingTopic.date, uploadingClass);

      // 1. Get a client token from the server
      const tokenRes = await fetch('/api/upload-lesson/get-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname: generatedName }),
      });
      if (!tokenRes.ok) {
        const errData = await tokenRes.json();
        throw new Error(errData.error || 'Failed to get upload token');
      }
      const { clientToken } = await tokenRes.json();

      // 2. Upload directly to Vercel Blob using the client token
      const blob = await put(generatedName, directFile, {
        access: 'public',
        token: clientToken,
      });

      // 2. Register metadata in Neon Database
      const payload = {
        fileName: generatedName,
        url: blob.url,
        sizeBytes: directFile.size,
        date: uploadingTopic.date,
        title: uploadingTopic.title,
        description: uploadingTopic.description
      };

      const response = await fetch('/api/upload-lesson/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Aula enviada com sucesso! O arquivo físico oficial já está vinculado e disponível para download via Vercel Blob.');
        setUploadingTopic(null);
        setDirectFile(null);
        if (activeTab === 'files') {
          fetchAvailableLessons();
        }
      } else {
        const errorData = await response.json();
        alert(`Erro ao registrar upload: ${errorData.error || 'Tente novamente.'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro no envio ou processamento do arquivo. Detalhes: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDirectUploading(false);
    }
  };

  // Option B: Drag and Drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const filesArray = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.docx'));
      if (filesArray.length === 0) {
        alert('Apenas arquivos do Microsoft Word (.docx) são aceitos.');
        return;
      }
      setBulkFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const filesArray = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.docx'));
      setBulkFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeBulkFile = (index: number) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearBulkFiles = () => {
    setBulkFiles([]);
    setBulkUploadResults([]);
    setBulkUploadStatus({});
  };

  // Option B: Process and upload bulk files
  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;

    setIsBulkUploading(true);
    setBulkUploadResults([]);
    const results: string[] = [];
    const newStatuses = { ...bulkUploadStatus };

    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      newStatuses[file.name] = 'uploading';
      setBulkUploadStatus({ ...newStatuses });

      if (file.size > 50 * 1024 * 1024) {
        newStatuses[file.name] = 'error';
        results.push(`❌ "${file.name}": Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). O limite de envio é de 50 MB.`);
        setBulkUploadStatus({ ...newStatuses });
        continue;
      }

      try {
        const parsed = parseLessonFileName(file.name);
        if (!parsed) {
          newStatuses[file.name] = 'error';
          results.push(`❌ "${file.name}": Nome fora da convenção. Use o formato "AULA X [MÊS] [ANO] - [TURMA].docx"`);
          continue;
        }

        if (!parsed.date) {
          newStatuses[file.name] = 'error';
          results.push(`❌ "${file.name}": Não foi possível calcular um domingo válido para o mês de ${parsed.monthName} em ${parsed.year}.`);
          continue;
        }

        // 1. Get a client token from the server
        const tokenRes = await fetch('/api/upload-lesson/get-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pathname: file.name }),
        });
        if (!tokenRes.ok) {
          const errData = await tokenRes.json();
          throw new Error(errData.error || 'Failed to get upload token');
        }
        const { clientToken } = await tokenRes.json();

        // 2. Upload directly to Vercel Blob using the client token
        const blob = await put(file.name, file, {
          access: 'public',
          token: clientToken,
        });
        
        // 2. Register metadata in Neon Database
        const payload = {
          fileName: file.name,
          url: blob.url,
          sizeBytes: file.size,
          date: parsed.date,
          title: `Aula ${parsed.sundayNum} de ${parsed.monthName.toLowerCase()} - ${parsed.className}`,
          description: `Aula oficial carregada para a turma ${parsed.className} correspondente ao ${parsed.sundayNum}º domingo de ${parsed.monthName.toLowerCase()} de ${parsed.year}.`
        };

        const response = await fetch('/api/upload-lesson/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          newStatuses[file.name] = 'success';
          results.push(`✅ "${file.name}": Enviado e mapeado para o domingo ${new Date(parsed.date + 'T00:00:00').toLocaleDateString('pt-BR')}.`);
        } else {
          newStatuses[file.name] = 'error';
          const errorData = await response.json();
          results.push(`❌ "${file.name}": Falha ao registrar - ${errorData.error}`);
        }
      } catch (err) {
        newStatuses[file.name] = 'error';
        results.push(`❌ "${file.name}": Erro de envio ou rede: ${err instanceof Error ? err.message : String(err)}`);
      }
      setBulkUploadStatus({ ...newStatuses });
    }

    setBulkUploadResults(results);
    setIsBulkUploading(false);
    
    // Refresh available files list
    fetchAvailableLessons();
    
    // Trigger callback to pull new topics created in DB
    // Simple window location reload or parent components refresh if needed (e.g. app state sync happens on database changes)
    alert('Processamento de uploads em lote finalizado!');
  };

  const sortedTopics = [...topics]
    .filter(topic => {
      const matchesStart = !startDate || topic.date >= startDate;
      const matchesEnd = !endDate || topic.date <= endDate;
      return matchesStart && matchesEnd;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Option B: Filtering physically available files
  const filteredLessons = availableLessons.filter(lesson => {
    const matchesClass = !searchFileClass || lesson.className.toLowerCase().includes(searchFileClass.toLowerCase());
    
    let matchesMonth = true;
    let matchesYear = true;

    if (lesson.date) {
      const d = new Date(lesson.date + 'T00:00:00');
      if (searchFileMonth) {
        matchesMonth = d.getMonth() === parseInt(searchFileMonth, 10);
      }
      if (searchFileYear) {
        matchesYear = d.getFullYear() === parseInt(searchFileYear, 10);
      }
    } else {
      if (searchFileMonth || searchFileYear) {
        // Unparsed files can't match month/year filters
        return false;
      }
    }
    
    return matchesClass && matchesMonth && matchesYear;
  });

  const isPastor = userRole === 'Pastor';

  const formatBytes = (bytes: number, decimals = 1) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="p-4 md:p-8">
      {/* Top Title Section */}
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-brand-dark">Aulas e Assuntos</h2>
          <p className="text-gray-500 text-sm mt-1">Histórico completo de ensinos e central de arquivos Word oficiais para download.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200/80 shadow-sm self-start md:self-auto">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-brand-dark shadow-sm'
                : 'text-gray-500 hover:text-brand-dark hover:bg-white/50'
            }`}
          >
            📚 Histórico de Assuntos
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-1.5 ${
              activeTab === 'files'
                ? 'bg-white text-brand-dark shadow-sm'
                : 'text-gray-500 hover:text-brand-dark hover:bg-white/50'
            }`}
          >
            📄 Central de Aulas (Word)
          </button>
        </div>
      </div>

      {/* --- TAB 1: HISTORY OF TOPICS IN DATABASE --- */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 w-full transition-all duration-300">
          {/* Card Header with controls */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4 border-b pb-4 border-gray-100">
            <h3 className="text-xl font-bold text-brand-dark">Histórico de Assuntos</h3>
            
            {/* Controls Container */}
            <div className="flex flex-wrap items-center gap-4 justify-between md:justify-end">
              {/* Date range filters */}
              <div className="flex gap-2 items-center">
                <div>
                  <label htmlFor="start-date-topics" className="sr-only">De</label>
                  <input
                    id="start-date-topics"
                    type="date"
                    placeholder="De"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white font-medium min-w-[120px]"
                  />
                </div>
                <span className="text-gray-400 text-xs font-semibold">até</span>
                <div>
                  <label htmlFor="end-date-topics" className="sr-only">Até</label>
                  <input
                    id="end-date-topics"
                    type="date"
                    placeholder="Até"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white font-medium min-w-[120px]"
                  />
                </div>
                
                {/* Reset Dates button */}
                {(startDate !== todayStr || endDate !== '') && (
                  <button
                    onClick={() => { setStartDate(todayStr); setEndDate(''); }}
                    className="text-xs text-brand-blue hover:text-blue-800 font-bold transition ml-1"
                    title="Restaurar filtro para hoje em diante"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Excel Import button (Pastor Only) */}
              {isPastor && (
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-100 font-bold text-xs transition shadow-sm flex items-center gap-1.5"
                    title="Importar planilha de assuntos (CSV)"
                  >
                    <span className="text-sm font-bold">📥</span> Importar Planilha
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>

          {/* History List */}
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
            {sortedTopics.length > 0 ? (
              sortedTopics.map((topic, index) => (
                <div key={index} className="border-l-4 border-brand-purple bg-purple-50/45 p-4 rounded-r-lg border border-gray-100 shadow-sm relative group transition hover:shadow flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  {/* Topic content */}
                  <div className="flex-1">
                    <p className="text-xs font-bold text-brand-purple">
                      {new Date(topic.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                    <h4 className="font-bold text-lg text-gray-800 mt-1">{topic.title}</h4>
                    <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap leading-relaxed">{topic.description}</p>
                    
                    {/* Action buttons list */}
                    <div className="flex flex-wrap gap-2.5 mt-3.5">
                      {/* Download Word Plan Button (Visible for all profiles) */}
                      <button
                        onClick={() => {
                          setDownloadClass(CLASS_NAMES[0]);
                          setDownloadingTopic(topic);
                        }}
                        className="text-xs bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-3 py-1.5 rounded-lg hover:bg-brand-blue/20 font-bold transition flex items-center gap-1 shadow-sm"
                        title="Baixar aula no formato Word"
                      >
                        📄 Baixar Aula
                      </button>

                      {/* Option A: Direct Upload Button (Pastor Only) */}
                      {isPastor && (
                        <button
                          onClick={() => {
                            setUploadingClass(CLASS_NAMES[0]);
                            setUploadingTopic(topic);
                            setDirectFile(null);
                          }}
                          className="text-xs bg-emerald-100/50 text-emerald-700 border border-emerald-200/50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-bold transition flex items-center gap-1 shadow-sm"
                          title="Fazer upload de arquivo oficial (.docx) para este assunto"
                        >
                          📤 Enviar Word (.docx)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Edit/Delete controls (Pastor Only) */}
                  {isPastor && (
                    <div className="flex gap-2.5 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur px-2.5 py-1.5 rounded-lg border shadow-sm self-end sm:self-start mt-2 sm:mt-0">
                      <button
                        onClick={() => handleStartEdit(topic)}
                        className="text-xs text-brand-blue hover:text-blue-800 font-bold transition"
                        title="Editar este assunto"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => topic.id && onDeleteTopic(topic.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold transition"
                        title="Excluir este assunto"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">Nenhum assunto ensinado encontrado para o período selecionado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: CENTRAL OF PHYSICAL WORD LESSON FILES (Option B) --- */}
      {activeTab === 'files' && (
        <div className="space-y-6 transition-all duration-300">
          
          {/* Pastor Only: Bulk Uploader drag-and-drop box */}
          {isPastor && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 w-full">
              <h3 className="text-xl font-bold text-brand-dark mb-1 flex items-center gap-1.5">
                <span>📤</span> Uploader de Aulas Oficial em Lote
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Envie múltiplos arquivos oficiais Word. O sistema os associará automaticamente às turmas e datas com base no nome do arquivo.
              </p>

              {/* Drag and Drop Container */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => bulkFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[160px] ${
                  isDragActive
                    ? 'border-brand-purple bg-purple-50/50'
                    : 'border-gray-300 hover:border-brand-purple bg-gray-50/30'
                }`}
              >
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".docx"
                  multiple
                  onChange={handleBulkFileChange}
                  className="hidden"
                />
                <span className="text-4xl mb-3 text-brand-purple">📁</span>
                <p className="text-sm font-bold text-gray-700">
                  Arraste e solte seus arquivos Word (.docx) aqui ou clique para navegar
                </p>
                <p className="text-xs text-gray-400 mt-1.5 font-medium">
                  Convenção de nomes obrigatória: <code className="bg-gray-100 px-1 py-0.5 rounded text-brand-purple font-mono">AULA [Domingo_do_mês] [MÊS] [ANO] - [TURMA].docx</code>
                </p>
              </div>

              {/* Pending Upload Files List */}
              {bulkFiles.length > 0 && (
                <div className="mt-6 border border-gray-150 rounded-xl p-4 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-sm text-gray-700">
                      Arquivos selecionados ({bulkFiles.length}):
                    </h4>
                    <button
                      onClick={clearBulkFiles}
                      className="text-xs text-red-500 hover:text-red-700 font-bold"
                      disabled={isBulkUploading}
                    >
                      Limpar Lista
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                    {bulkFiles.map((file, idx) => {
                      const parsed = parseLessonFileName(file.name);
                      const status = bulkUploadStatus[file.name] || 'pending';
                      
                      return (
                        <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-200 flex justify-between items-center text-xs shadow-sm">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-bold text-gray-800 truncate" title={file.name}>
                              📄 {file.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-gray-500">
                              <span>Tamanho: {formatBytes(file.size)}</span>
                              {parsed ? (
                                <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
                                  ✓ Pronto para data: {parsed.date ? new Date(parsed.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}
                                </span>
                              ) : (
                                <span className="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                  ⚠️ Nome fora do padrão
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {status === 'uploading' && <span className="text-brand-purple font-semibold animate-pulse">Enviando...</span>}
                            {status === 'success' && <span className="text-emerald-600 font-bold">Enviado!</span>}
                            {status === 'error' && <span className="text-red-500 font-bold">Falhou</span>}
                            
                            {status === 'pending' && (
                              <button
                                onClick={() => removeBulkFile(idx)}
                                className="text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 hover:bg-red-50 rounded"
                                disabled={isBulkUploading}
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bulk upload results console log */}
                  {bulkUploadResults.length > 0 && (
                    <div className="mt-4 bg-gray-900 text-gray-200 font-mono text-xs p-3 rounded-lg border border-gray-850 space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar">
                      <p className="text-brand-purple font-bold border-b border-gray-800 pb-1 mb-1.5">Console de Uploads:</p>
                      {bulkUploadResults.map((resMsg, idx) => (
                        <p key={idx}>{resMsg}</p>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleBulkUpload}
                      disabled={isBulkUploading || bulkFiles.filter(f => parseLessonFileName(f.name) !== null).length === 0}
                      className="bg-brand-purple text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex items-center gap-1.5"
                    >
                      {isBulkUploading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Enviando Arquivos...
                        </>
                      ) : (
                        <>📤 Processar e Enviar para a Pasta</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Central Lessons Grid View (Available for all functions) */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 w-full">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6 border-b pb-4 border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-brand-dark">Arquivos de Aulas Cadastrados</h3>
                <p className="text-xs text-gray-400 mt-0.5">Lista de arquivos Word oficiais no servidor.</p>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Class selector */}
                <select
                  value={searchFileClass}
                  onChange={e => setSearchFileClass(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue min-w-[140px]"
                >
                  <option value="">Todas as Turmas</option>
                  {CLASS_NAMES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Month selector */}
                <select
                  value={searchFileMonth}
                  onChange={e => setSearchFileMonth(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue min-w-[120px]"
                >
                  <option value="">Todos os Meses</option>
                  {MONTHS_PT.map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>

                {/* Year selector */}
                <select
                  value={searchFileYear}
                  onChange={e => setSearchFileYear(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue min-w-[100px]"
                >
                  <option value="">Todos os Anos</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>

                {/* Reset Filters */}
                {(searchFileClass !== '' || searchFileMonth !== '' || searchFileYear !== '') && (
                  <button
                    onClick={() => { setSearchFileClass(''); setSearchFileMonth(''); setSearchFileYear(''); }}
                    className="text-xs text-brand-blue hover:text-blue-800 font-bold"
                  >
                    Limpar Filtros
                  </button>
                )}

                {/* Sync list button */}
                <button
                  onClick={fetchAvailableLessons}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                  title="Atualizar lista"
                  disabled={loadingLessons}
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Files Grid Display */}
            {loadingLessons ? (
              <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm font-medium">Buscando arquivos oficiais no servidor...</p>
              </div>
            ) : filteredLessons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[58vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredLessons.map((lesson, idx) => (
                  <div key={idx} className="bg-gray-50/50 hover:bg-white rounded-xl border border-gray-200/80 p-4 transition-all duration-200 shadow-sm hover:shadow flex flex-col justify-between gap-4">
                    <div>
                      {/* Top badges */}
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="text-[10px] font-extrabold uppercase bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full tracking-wider">
                          {lesson.className}
                        </span>
                        {lesson.date ? (
                          <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-150">
                            📅 {new Date(lesson.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-150">
                            Sem Data Calculada
                          </span>
                        )}
                      </div>

                      {/* Header block */}
                      <h4 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2" title={lesson.fileName}>
                        {lesson.fileName}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-medium mt-1">
                        Tamanho do arquivo: {formatBytes(lesson.sizeBytes)}
                      </p>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleDownloadWord(lesson.date, lesson.className)}
                      className="w-full bg-brand-blue hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      📥 Baixar Arquivo Word
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📂</p>
                <p className="text-gray-400 text-sm">Nenhum arquivo Word de aula localizado para os filtros selecionados.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT TOPIC MODAL (Pastor Only) */}
      {editingTopic && (
        <Modal
          isOpen={!!editingTopic}
          onClose={handleCancelEdit}
          title="Editar Assunto"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Data da Aula</label>
              <input 
                type="date" 
                required
                value={editDate} 
                onChange={e => setEditDate(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm bg-white" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Título</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Fruto do Espírito"
                value={editTitle} 
                onChange={e => setEditTitle(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm bg-white" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Descrição / Conteúdo</label>
              <textarea 
                required
                placeholder="Conteúdo ensinado, passagens bíblicas..."
                value={editDescription} 
                onChange={e => setEditDescription(e.target.value)} 
                rows={6} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm bg-white" 
              />
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button 
                type="submit" 
                className="flex-1 bg-brand-blue text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition text-sm shadow-sm"
              >
                Salvar Alterações
              </button>
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DOWNLOAD LESSON MODAL (SELECT CLASS) */}
      {downloadingTopic && (
        <Modal
          isOpen={!!downloadingTopic}
          onClose={() => setDownloadingTopic(null)}
          title="Baixar Aula (.docx)"
        >
          <div className="space-y-4">
            <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
              <h4 className="font-bold text-gray-800 text-sm">{downloadingTopic.title}</h4>
              <p className="text-xs text-gray-500 mt-1">
                Data da Aula: {new Date(downloadingTopic.date + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Selecione a Turma para gerar a aula:
              </label>
              <select
                value={downloadClass}
                onChange={e => setDownloadClass(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue text-sm font-semibold text-gray-800"
              >
                {CLASS_NAMES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-500">
              <span className="font-bold text-gray-600 block mb-0.5">ℹ️ Arquivo a ser baixado:</span>
              <code className="text-brand-purple font-mono block break-all mt-0.5">
                {getLessonFileName(downloadingTopic.date, downloadClass)}
              </code>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  handleDownloadWord(downloadingTopic.date, downloadClass, downloadingTopic.title, downloadingTopic.description);
                  setDownloadingTopic(null);
                }}
                className="flex-1 bg-brand-blue text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition text-sm shadow-sm flex items-center justify-center gap-1.5"
              >
                📥 Baixar Aula
              </button>
              <button
                onClick={() => setDownloadingTopic(null)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* OPTION A: DIRECT UPLOAD LESSON MODAL (SELECT CLASS & DROP DOCX FILE) */}
      {uploadingTopic && (
        <Modal
          isOpen={!!uploadingTopic}
          onClose={() => { setUploadingTopic(null); setDirectFile(null); }}
          title="Enviar Aula Oficial (.docx)"
        >
          <form onSubmit={handleDirectUploadSubmit} className="space-y-4">
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
              <h4 className="font-bold text-gray-800 text-sm">Tema: {uploadingTopic.title}</h4>
              <p className="text-xs text-gray-500 mt-1">
                Data Vinculada: {new Date(uploadingTopic.date + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Selecione a Turma correspondente:
              </label>
              <select
                value={uploadingClass}
                onChange={e => setUploadingClass(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue text-sm font-semibold text-gray-800"
              >
                {CLASS_NAMES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Local File Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Selecione o arquivo do Microsoft Word (.docx):
              </label>
              <input
                ref={directFileInputRef}
                type="file"
                accept=".docx"
                required
                onChange={e => setDirectFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-150 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-500">
              <span className="font-bold text-gray-600 block mb-0.5">ℹ️ Nome de salvamento automático no servidor:</span>
              <code className="text-brand-purple font-mono block break-all mt-0.5">
                {getLessonFileName(uploadingTopic.date, uploadingClass)}
              </code>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={directUploading || !directFile}
                className="flex-1 bg-brand-blue text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition text-sm shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {directUploading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Enviando...
                  </>
                ) : (
                  <>📤 Fazer Upload da Aula</>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setUploadingTopic(null); setDirectFile(null); }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Topics;