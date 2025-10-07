
import React, { useState } from 'react';
import { Topic } from '../types';

interface TopicsProps {
  topics: Topic[];
  onAddTopic: (date: string, title: string, description: string) => void;
}

const Topics: React.FC<TopicsProps> = ({ topics, onAddTopic }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && description && date) {
      onAddTopic(date, title, description);
      setTitle('');
      setDescription('');
    }
  };
  
  const sortedTopics = [...topics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-3xl font-bold text-brand-dark mb-6">Assuntos Ensinados</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-brand-dark mb-4">Registrar Assunto</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                <label className="block text-sm font-medium text-gray-700">Data da Aula</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Título</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" />
              </div>
              <button type="submit" className="w-full py-2 px-4 bg-brand-blue text-white rounded-md hover:bg-blue-600 transition">Salvar Assunto</button>
            </form>
          </div>
        </div>
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-brand-dark mb-4">Histórico de Assuntos</h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {sortedTopics.map((topic, index) => (
                        <div key={index} className="border-l-4 border-brand-purple bg-purple-50 p-4 rounded-r-lg">
                            <p className="text-sm font-semibold text-purple-700">{new Date(topic.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                            <h4 className="font-bold text-lg text-gray-800">{topic.title}</h4>
                            <p className="text-gray-600">{topic.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Topics;