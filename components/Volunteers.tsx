import React, { useState } from 'react';
import { Volunteer } from '../types';

interface VolunteersProps {
    volunteers: Volunteer[];
    onAddVolunteer: (name: string) => void;
    onEditVolunteer: (id: string, name: string) => void;
    onDeleteVolunteer: (id: string) => void;
}

const Volunteers: React.FC<VolunteersProps> = ({ volunteers, onAddVolunteer, onEditVolunteer, onDeleteVolunteer }) => {
    const [newVolunteerName, setNewVolunteerName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVolunteerName.trim()) return;
        onAddVolunteer(newVolunteerName);
        setNewVolunteerName('');
    };

    const handleEdit = (volunteer: Volunteer) => {
        setEditingId(volunteer.id);
        setEditingName(volunteer.name);
    };

    const handleSaveEdit = (id: string) => {
        if (!editingName.trim()) return;
        onEditVolunteer(id, editingName);
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
    };

    return (
        <div className="p-4 md:p-8">
            <h2 className="text-3xl font-bold text-brand-dark mb-6">Professores e Voluntários</h2>

            {/* Formulário para Adicionar */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Adicionar Novo</h3>
                <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <input
                            type="text"
                            id="name"
                            value={newVolunteerName}
                            onChange={(e) => setNewVolunteerName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            placeholder="Ex: João da Silva"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-brand-blue text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        Adicionar
                    </button>
                </form>
            </div>

            {/* Lista de Voluntários */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Lista ({volunteers.length})</h3>
                {volunteers.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {volunteers.map(v => (
                            <li key={v.id} className="py-4 flex justify-between items-center">
                                {editingId === v.id ? (
                                    <div className="flex flex-1 gap-2 mr-4">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleSaveEdit(v.id)}
                                            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
                                        >
                                            Salvar
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-lg text-gray-800">{v.name}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(v)}
                                                className="text-brand-blue hover:text-blue-800 font-medium"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => onDeleteVolunteer(v.id)}
                                                className="text-red-500 hover:text-red-700 font-medium ml-4"
                                            >
                                                Excluir
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 text-center py-4">Nenhum voluntário cadastrado.</p>
                )}
            </div>
        </div>
    );
};

export default Volunteers;
