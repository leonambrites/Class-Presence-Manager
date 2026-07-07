import React, { useState, useEffect } from 'react';
import { ClerkUser, UserRole } from '../types';
import { ShieldIcon } from './icons';

interface AdminProps {
    userRole: UserRole;
    fetchWithAuth: (url: RequestInfo | URL, options?: RequestInit) => Promise<Response>;
}

const Admin: React.FC<AdminProps> = ({ userRole, fetchWithAuth }) => {
    const [users, setUsers] = useState<ClerkUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

    // Only Pastor and Coordenadora can see this page
    if (userRole !== 'Pastor' && userRole !== 'Coordenadora') {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto mt-10">
                <ShieldIcon className="h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
                <p className="text-gray-500 text-center">Você não tem permissão para visualizar ou alterar as permissões de acesso ao sistema.</p>
            </div>
        );
    }

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth('/api/users');
            if (!res.ok) throw new Error("Erro ao carregar usuários");
            const data = await res.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        const previousUsers = [...users];

        // Optimistic UI Update
        setUsers(users.map(u => {
            if (u.id === userId) {
                return {
                    ...u,
                    role: newRole,
                    classroom: newRole === 'Pastor' ? 'Todas' : u.classroom
                };
            }
            return u;
        }));

        try {
            const res = await fetchWithAuth(`/api/users/${userId}/metadata`, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole })
            });

            if (!res.ok) throw new Error("Falha ao salvar a permissão");
        } catch (err) {
            console.error(err);
            alert("Erro de conexão ao salvar cargo. A alteração foi desfeita.");
            setUsers(previousUsers); // Revert on failure
        }
    };

    const handleClassroomChange = async (userId: string, newClassroom: string) => {
        const previousUsers = [...users];

        // Optimistic UI Update
        setUsers(users.map(u => u.id === userId ? { ...u, classroom: newClassroom } : u));

        try {
            const res = await fetchWithAuth(`/api/users/${userId}/metadata`, {
                method: 'PATCH',
                body: JSON.stringify({ classroom: newClassroom })
            });

            if (!res.ok) throw new Error("Falha ao salvar a turma");
        } catch (err) {
            console.error(err);
            alert("Erro de conexão ao salvar a turma. A alteração foi desfeita.");
            setUsers(previousUsers); // Revert on failure
        }
    };
    const handleToggleActive = async (userId: string, currentStatus: boolean) => {
        const previousUsers = [...users];
        const newStatus = !currentStatus;

        // Optimistic UI Update
        setUsers(users.map(u => u.id === userId ? { ...u, active: newStatus } : u));

        try {
            const res = await fetchWithAuth(`/api/users/${userId}/metadata`, {
                method: 'PATCH',
                body: JSON.stringify({ active: newStatus })
            });

            if (!res.ok) throw new Error("Falha ao salvar o status");
        } catch (err) {
            console.error(err);
            alert("Erro ao alterar o status do acesso. A alteração foi desfeita.");
            setUsers(previousUsers); // Revert on failure
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir permanentemente o acesso de ${userName}? Esta ação não pode ser desfeita.`)) {
            return;
        }

        const previousUsers = [...users];
        setUsers(users.filter(u => u.id !== userId));

        try {
            const res = await fetchWithAuth(`/api/users/${userId}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Falha ao excluir o acesso");
            }
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Erro de conexão ao excluir o acesso. A alteração foi desfeita.");
            setUsers(previousUsers); // Revert on failure
        }
    };

    const filteredUsers = users.filter(user => {
        if (statusFilter === 'active') return user.active !== false;
        if (statusFilter === 'inactive') return user.active === false;
        return true;
    });

    return (
        <div className="space-y-6 animate-fadeIn mt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
                        <ShieldIcon className="h-6 w-6 text-brand-blue" />
                        Controle de Acessos
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Gerencie as permissões e cargos de quem utiliza o painel administrativo.</p>
                </div>
                <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'active' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Ativos
                        </button>
                        <button
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'inactive' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Inativos
                        </button>
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'all' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Todos
                        </button>
                    </div>
                    <button
                        onClick={fetchUsers}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg transition-colors border border-gray-200"
                    >
                        Recarregar Dados
                    </button>
                </div>
            </div>

            {/* QR Code de Cadastro Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-shrink-0 shadow-inner">
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/cadastro')}`}
                        alt="QR Code de Cadastro"
                        className="w-40 h-40 object-contain"
                    />
                </div>
                <div className="flex-1 space-y-3 text-center md:text-left">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-brand-blue ring-1 ring-inset ring-blue-700/10 animate-pulse">
                        Novo Recurso: Auto-Cadastro
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">QR Code para Novos Alunos</h3>
                    <p className="text-sm text-gray-500 max-w-xl leading-relaxed">
                        Imprima ou exiba este QR Code na entrada da igreja. Os pais/responsáveis podem escaneá-lo com a câmera do celular para preencher a ficha de cadastro de seus filhos diretamente, sem precisar de login.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-1">
                        <a
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.location.origin + '/cadastro')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition text-xs font-semibold flex items-center gap-2 shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Imprimir / Abrir em Alta Resolução
                        </a>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.origin + '/cadastro');
                                alert("Link de cadastro copiado para a área de transferência!");
                            }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-xs font-semibold flex items-center gap-2 border border-gray-200"
                        >
                            Copiar Link Direto
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm font-medium">
                    Oops: {error}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Usuário
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    E-mail
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Cargo e Permissões
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Turma Associada
                                </th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-blue"></div>
                                            Buscando contas salvas no Clerk...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhum acesso correspondente encontrado.</td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-brand-blue font-bold text-lg">
                                                    {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                                className={`text-sm rounded-full px-3 py-1 font-semibold border-0 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${user.role === 'Pastor' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                                                        user.role === 'Coordenadora' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                                            user.role === 'Supervisora' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                                user.role === 'Visitante' ? 'bg-red-50 text-red-750 ring-red-600/20' :
                                                                    'bg-gray-50 text-gray-600 ring-gray-600/20'
                                                    }`}
                                            >
                                                <option value="Pastor" className="text-gray-900 bg-white">Pastor (Acesso Total)</option>
                                                <option value="Coordenadora" className="text-gray-900 bg-white">Coordenadora (Edição Avançada)</option>
                                                <option value="Supervisora" className="text-gray-900 bg-white">Supervisora (Edição da Equipe)</option>
                                                <option value="Ministra" className="text-gray-900 bg-white">Ministra (Presença e Saída)</option>
                                                <option value="Visitante" className="text-gray-900 bg-white">Visitante (Sem Acesso)</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.role === 'Pastor' ? (
                                                <span className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
                                                    Todas as Turmas
                                                </span>
                                            ) : (
                                                <select
                                                    value={user.classroom || ''}
                                                    disabled={userRole !== 'Pastor'}
                                                    onChange={(e) => handleClassroomChange(user.id, e.target.value)}
                                                    className="text-sm rounded-lg px-2 py-1 font-medium border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:bg-gray-100 disabled:text-gray-500"
                                                >
                                                    <option value="">Sem Turma</option>
                                                    <option value="Maternal">Maternal</option>
                                                    <option value="2 a 3 anos">2 a 3 anos</option>
                                                    <option value="4 a 5 anos">4 a 5 anos</option>
                                                    <option value="6 a 7 anos">6 a 7 anos</option>
                                                    <option value="8 a 10 anos">8 a 10 anos</option>
                                                </select>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => handleToggleActive(user.id, user.active ?? true)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                                                    user.active !== false
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                                }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${user.active !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                {user.active !== false ? 'Ativo' : 'Inativo'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                                                className="p-1 text-gray-400 hover:text-red-600 rounded transition duration-150"
                                                title="Excluir Acesso"
                                            >
                                                <svg className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Admin;
