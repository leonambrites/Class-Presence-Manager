import React, { useState, useMemo } from 'react';
import { Volunteer, UserRole } from '../types';
import { CLASS_NAMES } from '../constants';
import { EditIcon, TrashIcon, UserPlusIcon } from './icons';
import Modal from './Modal';

interface VolunteersProps {
    volunteers: Volunteer[];
    onAddVolunteer: (volunteer: Omit<Volunteer, 'id'>) => void;
    onEditVolunteer: (id: string, volunteer: Omit<Volunteer, 'id'>) => void;
    onDeleteVolunteer: (id: string) => void;
    userRole: UserRole;
}

const Volunteers: React.FC<VolunteersProps> = ({ volunteers, onAddVolunteer, onEditVolunteer, onDeleteVolunteer, userRole }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [volunteerClass, setVolunteerClass] = useState(CLASS_NAMES[0]);
    const [phone, setPhone] = useState('');
    const [type, setType] = useState('');
    const [team, setTeam] = useState('');

    // Filter state
    const [filterClass, setFilterClass] = useState('Todas');
    const [filterType, setFilterType] = useState('Todos');
    const [filterTeam, setFilterTeam] = useState('Todas');

    // Extract unique types and teams for the filter dropdowns
    const uniqueTypes = useMemo(() => {
        const types = new Set(volunteers.map(v => v.type).filter(Boolean) as string[]);
        return Array.from(types).sort();
    }, [volunteers]);

    const uniqueTeams = useMemo(() => {
        const teams = new Set(volunteers.map(v => v.team).filter(Boolean) as string[]);
        return Array.from(teams).sort();
    }, [volunteers]);

    // Apply filters
    const filteredVolunteers = useMemo(() => {
        return volunteers.filter(v => {
            const matchClass = filterClass === 'Todas' || v.class === filterClass;
            const matchType = filterType === 'Todos' || v.type === filterType;
            const matchTeam = filterTeam === 'Todas' || v.team === filterTeam;
            return matchClass && matchType && matchTeam;
        });
    }, [volunteers, filterClass, filterType, filterTeam]);

    const [sortConfig, setSortConfig] = useState<{ key: keyof Volunteer; direction: 'asc' | 'desc' } | null>(null);

    const sortedVolunteers = useMemo(() => {
        let sortableItems = [...filteredVolunteers];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = (a[sortConfig.key] || '').toString().toLowerCase();
                const valB = (b[sortConfig.key] || '').toString().toLowerCase();

                // Standard string comparison
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredVolunteers, sortConfig]);

    const handleSort = (key: keyof Volunteer) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIndicator = ({ columnKey }: { columnKey: keyof Volunteer }) => {
        if (!sortConfig || sortConfig.key !== columnKey) return <span className="text-gray-300 ml-1">↕</span>;
        return <span className="text-brand-blue ml-1 font-bold">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    const openAddModal = () => {
        setEditingVolunteer(null);
        setName('');
        setVolunteerClass(CLASS_NAMES[0]);
        setPhone('');
        setType('');
        setTeam('');
        setIsModalOpen(true);
    };

    const openEditModal = (volunteer: Volunteer) => {
        setEditingVolunteer(volunteer);
        setName(volunteer.name);
        setVolunteerClass(volunteer.class || CLASS_NAMES[0]);
        setPhone(volunteer.phone || '');
        setType(volunteer.type || '');
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
            type,
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
                {userRole !== 'Ministra' && (
                    <button onClick={openAddModal} className="mt-4 sm:mt-0 flex items-center justify-center px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition shadow-sm">
                        <UserPlusIcon className="w-5 h-5" />
                        <span className="ml-2">Adicionar Novo</span>
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                        <select
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                        >
                            <option value="Todas">Todas as Turmas</option>
                            {CLASS_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                        >
                            <option value="Todos">Todos os Tipos</option>
                            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Equipe (Supervisora)</label>
                        <select
                            value={filterTeam}
                            onChange={(e) => setFilterTeam(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                        >
                            <option value="Todas">Todas as Equipes</option>
                            {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-2 sm:p-4">
                <h3 className="text-xl font-bold text-gray-800 p-4 border-b">Lista ({sortedVolunteers.length})</h3>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    {sortedVolunteers.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" onClick={() => handleSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">Nome do Voluntário <SortIndicator columnKey="name" /></th>
                                    <th scope="col" onClick={() => handleSort('class')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">Turma <SortIndicator columnKey="class" /></th>
                                    <th scope="col" onClick={() => handleSort('type')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">Tipo <SortIndicator columnKey="type" /></th>
                                    <th scope="col" onClick={() => handleSort('team')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">Equipe (Supervisora) <SortIndicator columnKey="team" /></th>
                                    <th scope="col" onClick={() => handleSort('phone')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">Contato <SortIndicator columnKey="phone" /></th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sortedVolunteers.map(v => (
                                    <tr key={v.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{v.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {v.class || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {v.type || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {v.team || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {v.phone || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-3">
                                                {userRole !== 'Ministra' && (
                                                    <>
                                                        <button onClick={() => openEditModal(v)} className="text-gray-500 hover:text-brand-blue" title="Editar"><EditIcon /></button>
                                                        <button onClick={() => { if (window.confirm('Tem certeza?')) onDeleteVolunteer(v.id) }} className="text-gray-500 hover:text-brand-red" title="Excluir"><TrashIcon /></button>
                                                    </>
                                                )}
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
                    {sortedVolunteers.length > 0 ? (
                        sortedVolunteers.map(v => (
                            <div key={v.id} className="bg-gray-50 p-4 rounded-lg shadow">
                                <p className="text-lg font-bold text-gray-900">{v.name}</p>
                                <div className="mt-4 border-t pt-3 space-y-1">
                                    <p className="text-sm text-gray-600">Turma: <span className="font-medium text-gray-800">{v.class || '-'}</span></p>
                                    <p className="text-sm text-gray-600">Tipo: <span className="font-medium text-gray-800">{v.type || '-'}</span></p>
                                    <p className="text-sm text-gray-600">Equipe: <span className="font-medium text-gray-800">{v.team || '-'}</span></p>
                                    <p className="text-sm text-gray-600">Tel: <span className="font-medium text-gray-800">{v.phone || '-'}</span></p>
                                </div>
                                <div className="flex justify-end items-center mt-3 border-t pt-3 space-x-4">
                                    {userRole !== 'Ministra' && (
                                        <>
                                            <button onClick={() => openEditModal(v)} className="text-gray-500 hover:text-brand-blue flex items-center gap-1 text-sm"><EditIcon className="h-4 w-4" /> Editar</button>
                                            <button onClick={() => { if (window.confirm('Tem certeza?')) onDeleteVolunteer(v.id) }} className="text-gray-500 hover:text-brand-red flex items-center gap-1 text-sm"><TrashIcon className="h-4 w-4" /> Excluir</button>
                                        </>
                                    )}
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
                        <label className="block text-sm font-medium text-gray-700">Tipo (Cargo)</label>
                        <input type="text" value={type} onChange={(e) => setType(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm" placeholder="Ex: Ministra" />
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
