import React, { useState, useRef } from 'react';
import { Topic, UserRole } from '../types';
import { CLASS_NAMES } from '../constants';
import Modal from './Modal';

interface TopicsProps {
  topics: Topic[];
  onAddTopic: (date: string, title: string, description: string) => void;
  onEditTopic: (id: string, date: string, title: string, description: string) => void;
  onDeleteTopic: (id: string) => void;
  onImportTopics: (imported: Omit<Topic, 'id'>[]) => void;
  userRole: UserRole;
}

const Topics: React.FC<TopicsProps> = ({ 
  topics, 
  onAddTopic, 
  onEditTopic, 
  onDeleteTopic, 
  onImportTopics, 
  userRole 
}) => {
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Helper to calculate lesson filename based on date and class (naming convention)
  const getLessonFileName = (topicDate: string, className: string) => {
    const d = new Date(topicDate + 'T00:00:00');
    const day = d.getDate();
    const monthNum = d.getMonth();
    const year = d.getFullYear();

    const MONTHS_PT = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];
    
    const monthName = MONTHS_PT[monthNum];
    const sundayNum = Math.ceil(day / 7);
    const upperClass = className.toUpperCase();

    return `AULA ${sundayNum} ${monthName} ${year} - ${upperClass}.docx`;
  };

  const handleDownloadWord = (topic: Topic, className: string) => {
    const fileName = getLessonFileName(topic.date, className);
    
    // Construct the download URL with parameters for fallback generation
    const params = new URLSearchParams({
      fileName,
      title: topic.title,
      description: topic.description,
      date: topic.date,
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

  // Robust CSV/Excel parser that cleans double quotes and parses standard Brazilian date formatting
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

    // Fallbacks if headers are absent
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

      // Handle DD/MM/YYYY and DD/MM/YY (Portuguese/Brazilian Excel defaults)
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

  const sortedTopics = [...topics]
    .filter(topic => {
      const matchesStart = !startDate || topic.date >= startDate;
      const matchesEnd = !endDate || topic.date <= endDate;
      return matchesStart && matchesEnd;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const isPastor = userRole === 'Pastor';

  return (
    <div className="p-4 md:p-8">
      {/* Top Title Section */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-brand-dark">Assuntos Ensinados</h2>
        <p className="text-gray-500 text-sm mt-1">Histórico completo de tópicos ministrados nas aulas.</p>
      </div>

      {/* Main card with full width history */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 w-full">
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
                  
                  {/* Download Word Lesson Button (Visible for all profiles) */}
                  <button
                    onClick={() => {
                      setDownloadClass(CLASS_NAMES[0]);
                      setDownloadingTopic(topic);
                    }}
                    className="text-xs bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-3 py-1.5 rounded-lg hover:bg-brand-blue/20 font-bold transition flex items-center gap-1 mt-3.5 shadow-sm"
                    title="Baixar aula no formato Word"
                  >
                    📄 Baixar Aula
                  </button>
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
                  handleDownloadWord(downloadingTopic, downloadClass);
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
    </div>
  );
};

export default Topics;