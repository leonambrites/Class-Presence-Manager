import React, { useState, useEffect } from 'react';
import { ClerkUser, UserRole } from '../types';
import { ShieldIcon } from './icons';

interface AdminProps {
    userRole: UserRole;
}

const Admin: React.FC<AdminProps> = ({ userRole }) => {
    const [users, setUsers] = useState<ClerkUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            const res = await fetch('/api/users');
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
        // Optimistic UI Update
        const previousUsers = [...users];
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

        try {
            const res = await fetch(`/api/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });

            if (!res.ok) throw new Error("Falha ao salvar a permissão");

            // Optionally show a toast here
        } catch (err) {
            console.error(err);
            alert("Erro de conexão ao salvar cargo. A alteração foi desfeita.");
            setUsers(previousUsers); // Revert on failure
        }
    };

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
                <button
                    onClick={fetchUsers}
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                    Recarregar Dados
                </button>
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
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-blue"></div>
                                            Buscando contas salvas no Clerk...
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">Nenhum usuário cadastrado encontrado.</td>
                                </tr>
                            ) : (
                                users.map(user => (
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
                                                                'bg-gray-50 text-gray-600 ring-gray-600/20'
                                                    }`}
                                            >
                                                <option value="Pastor" className="text-gray-900 bg-white">Pastor (Acesso Total)</option>
                                                <option value="Coordenadora" className="text-gray-900 bg-white">Coordenadora (Edição Avançada)</option>
                                                <option value="Supervisora" className="text-gray-900 bg-white">Supervisora (Edição da Equipe)</option>
                                                <option value="Ministra" className="text-gray-900 bg-white">Ministra (Apenas Leitura)</option>
                                            </select>
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
