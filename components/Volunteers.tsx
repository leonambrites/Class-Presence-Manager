import React, { useState } from 'react';
import { Volunteer } from '../types';
import { CLASS_NAMES } from '../constants';
import { EditIcon, TrashIcon, UserPlusIcon } from './icons';
import Modal from './Modal';

interface VolunteersProps {
    volunteers: Volunteer[];
    onAddVolunteer: (volunteer: Omit<Volunteer, 'id'>) => void;
    onEditVolunteer: (id: string, volunteer: Omit<Volunteer, 'id'>) => void;
    onDeleteVolunteer: (id: string) => void;
}

const Volunteers: React.FC<VolunteersProps> = ({ volunteers, onAddVolunteer, onEditVolunteer, onDeleteVolunteer }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);

    const [name, setName] = useState('');
    const [volunteerClass, setVolunteerClass] = useState(CLASS_NAMES[0]);
    const [phone, setPhone] = useState('');
    const [team, setTeam] = useState('');

    const openAddModal = () => {
        setEditingVolunteer(null);
        setName('');
        setVolunteerClass(CLASS_NAMES[0]);
        setPhone('');
        setTeam('');
        setIsModalOpen(true);
    };

    const openEditModal = (volunteer: Volunteer) => {
        setEditingVolunteer(volunteer);
        setName(volunteer.name);
        setVolunteerClass(volunteer.class || CLASS_NAMES[0]);
        setPhone(volunteer.phone || '');
        setTeam(volunteer.team || '');
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const payload = {
            name,
            class: volunteerClass,
            phone,
            team
        };

        if (editingVolunteer) {
            onEditVolunteer(editingVolunteer.id, payload);
        } else {
            onAddVolunteer(payload);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                <h2 className="text-3xl font-bold text-brand-dark">Professores e Voluntários</h2>
                <button onClick={openAddModal} className="mt-4 sm:mt-0 flex items-center justify-center px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition shadow-sm">
                    <UserPlusIcon className="w-5 h-5" />
                    <span className="ml-2">Adicionar Novo</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-2 sm:p-4">
                <h3 className="text-xl font-bold text-gray-800 p-4 border-b">Lista ({volunteers.length})</h3>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    {volunteers.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome do Voluntário</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turma</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipe (Supervisora)</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {volunteers.map(v => (
                                    <tr key={v.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{v.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {v.class || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {v.team || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {v.phone || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-3">
                                                <button onClick={() => openEditModal(v)} className="text-gray-500 hover:text-brand-blue" title="Editar"><EditIcon /></button>
                                                <button onClick={() => { if (window.confirm('Tem certeza?')) onDeleteVolunteer(v.id) }} className="text-gray-500 hover:text-brand-red" title="Excluir"><TrashIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-500 text-center py-8">Nenhum voluntário cadastrado.</p>
                    )}
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                    {volunteers.length > 0 ? (
                        volunteers.map(v => (
                            <div key={v.id} className="bg-gray-50 p-4 rounded-lg shadow">
                                <p className="text-lg font-bold text-gray-900">{v.name}</p>
                                <div className="mt-4 border-t pt-3 space-y-1">
                                    <p className="text-sm text-gray-600">Turma: <span className="font-medium text-gray-800">{v.class || '-'}</span></p>
                                    <p className="text-sm text-gray-600">Equipe: <span className="font-medium text-gray-800">{v.team || '-'}</span></p>
                                    <p className="text-sm text-gray-600">Tel: <span className="font-medium text-gray-800">{v.phone || '-'}</span></p>
                                </div>
                                <div className="flex justify-end items-center mt-3 border-t pt-3 space-x-4">
                                    <button onClick={() => openEditModal(v)} className="text-gray-500 hover:text-brand-blue flex items-center gap-1 text-sm"><EditIcon className="h-4 w-4" /> Editar</button>
                                    <button onClick={() => { if (window.confirm('Tem certeza?')) onDeleteVolunteer(v.id) }} className="text-gray-500 hover:text-brand-red flex items-center gap-1 text-sm"><TrashIcon className="h-4 w-4" /> Excluir</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center py-4">Nenhum voluntário cadastrado.</p>
                    )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingVolunteer ? "Editar Voluntário" : "Adicionar Voluntário"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" placeholder="Ex: Maria Alice" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Turma</label>
                        <select value={volunteerClass} onChange={(e) => setVolunteerClass(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm">
                            {CLASS_NAMES.map(className => (
                                <option key={className} value={className}>{className}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Equipe (Supervisora)</label>
                        <input type="text" value={team} onChange={(e) => setTeam(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" placeholder="Ex: Ana Souza" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contato (Telefone)</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" placeholder="(DD) 90000-0000" />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 transition">Salvar</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Volunteers;
