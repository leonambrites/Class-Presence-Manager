import React, { useState } from 'react';
import { UserRole } from '../types';

interface LoginProps {
    onLogin: (role: UserRole) => void;
}

const PIN_MAP: Record<UserRole, string> = {
    'Pastor': 'pastor123',
    'Coordenadora': 'coord123',
    'Supervisora': 'super123',
    'Ministra': 'minis123'
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) {
            setError('Por favor, selecione um perfil.');
            return;
        }

        if (pin === PIN_MAP[selectedRole]) {
            setError('');
            onLogin(selectedRole);
        } else {
            setError('Senha incorreta. Tente novamente.');
        }
    };

    const roles: UserRole[] = ['Pastor', 'Coordenadora', 'Supervisora', 'Ministra'];

    return (
        <div className="min-h-screen bg-brand-light flex flex-col justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Gestão Mundo Kids</h1>
                    <p className="text-gray-500">Faça login para acessar o sistema</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Selecione seu Perfil</label>
                        <div className="grid grid-cols-2 gap-3">
                            {roles.map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => { setSelectedRole(role); setError(''); setPin(''); }}
                                    className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${selectedRole === role
                                            ? 'bg-brand-blue border-brand-blue text-white shadow-md'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-brand-blue hover:text-brand-blue'
                                        }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedRole && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Senha de Acesso ({selectedRole})</label>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => { setPin(e.target.value); setError(''); }}
                                placeholder="Digite a senha..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center">
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!selectedRole || !pin}
                        className="w-full bg-brand-blue hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Entrar no Sistema
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
