import React, { useState } from 'react';
import { View, UserRole } from '../types';
import { DashboardIcon, CheckCircleIcon, UsersIcon, CalendarIcon, BookOpenIcon, LogOutIcon, UserPlusIcon, MoreHorizontalIcon, FileTextIcon, ShieldIcon } from './icons';
import { LOGO_URL } from '../constants';
import { UserButton } from '@clerk/clerk-react';

interface HeaderProps {
    currentView: View;
    onNavigate: (view: View) => void;
    userRole?: UserRole | null;
}

const NavButton: React.FC<{
    currentView: View;
    view: View;
    onClick: (view: View) => void;
    icon: React.ReactElement<React.ComponentProps<'svg'>>;
    label: string;
}> = ({ currentView, view, onClick, icon, label }) => {
    const isActive = currentView === view;
    return (
        <button
            onClick={() => onClick(view)}
            title={label}
            className={`flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
        >
            {React.cloneElement(icon, { className: "h-5 w-5 mr-2" })}
            <span className="hidden lg:inline">{label}</span>
        </button>
    );
};

const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, userRole }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Close menu when navigating
    const handleNavClick = (view: View) => {
        onNavigate(view);
        setIsMenuOpen(false);
    };

    const navItems = [
        { view: View.Home, icon: <DashboardIcon />, label: "Home" },
        { view: View.Attendance, icon: <CheckCircleIcon />, label: "Presença" },
        { view: View.Schedule, icon: <CalendarIcon />, label: "Escala" },
        { view: View.Topics, icon: <BookOpenIcon />, label: "Aulas" },
        { view: View.Students, icon: <UsersIcon />, label: "Alunos" },
        { view: View.Volunteers, icon: <UserPlusIcon />, label: "Professores" },
        { view: View.Reports, icon: <FileTextIcon />, label: "Relatórios" },
    ];

    if (userRole === 'Pastor' || userRole === 'Coordenadora') {
        navItems.push({ view: View.Admin, icon: <ShieldIcon />, label: "Acessos" });
    }

    const mainMobileItems = [
        { view: View.Home, icon: <DashboardIcon />, label: "Home" },
        { view: View.Attendance, icon: <CheckCircleIcon />, label: "Presença" },
        { view: View.Schedule, icon: <CalendarIcon />, label: "Escala" },
        { view: View.Topics, icon: <BookOpenIcon />, label: "Aulas" },
    ];

    const extraMobileItems = [
        { view: View.Students, icon: <UsersIcon />, label: "Alunos" },
        { view: View.Volunteers, icon: <UserPlusIcon />, label: "Professores" },
        { view: View.Reports, icon: <FileTextIcon />, label: "Relatórios" },
    ];

    if (userRole === 'Pastor' || userRole === 'Coordenadora') {
        extraMobileItems.push({ view: View.Admin, icon: <ShieldIcon />, label: "Acessos" });
    }

    return (
        <>
            <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
                <div className="container mx-auto p-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <img
                                src={LOGO_URL}
                                alt="Mundo Kids Logo"
                                className="h-10 w-auto object-contain"
                            />
                            <h1 className="text-xl sm:text-2xl font-bold text-brand-dark whitespace-nowrap">
                                Gestão Mundo Kids
                            </h1>
                        </div>

                        {/* Mobile User Button for Visitante */}
                        {userRole === 'Visitante' && (
                            <div className="md:hidden flex items-center gap-2">
                                <div className="text-right mr-1">
                                    <p className="text-[10px] text-gray-500 font-medium leading-none">Perfil</p>
                                    <p className="text-xs font-bold text-brand-blue leading-tight">{userRole}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-300 shadow-sm flex items-center justify-center">
                                    <UserButton afterSignOutUrl="/" />
                                </div>
                            </div>
                        )}

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-4">
                            {userRole !== 'Visitante' && (
                                <nav className="flex items-center space-x-1">
                                    {navItems.map(item => <NavButton key={item.view} {...item} currentView={currentView} onClick={onNavigate} />)}
                                </nav>
                            )}

                            {userRole && (
                                <div className={`flex items-center gap-4 ${userRole !== 'Visitante' ? 'ml-4 pl-4 border-l border-gray-200' : ''}`}>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 font-medium">Conectado como</p>
                                        <p className="text-sm font-bold text-brand-blue">{userRole}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-300 shadow-sm flex items-center justify-center">
                                        <UserButton afterSignOutUrl="/" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Bottom Navigation */}
            {userRole !== 'Visitante' && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16">
                    {mainMobileItems.map(item => {
                        const isActive = currentView === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => handleNavClick(item.view)}
                                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-brand-blue' : 'text-gray-500'}`}
                            >
                                {React.cloneElement(item.icon, { className: 'h-6 w-6' })}
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </button>
                        );
                    })}

                    {/* More Menu Toggle */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isMenuOpen || extraMobileItems.some(i => i.view === currentView) ? 'text-brand-blue' : 'text-gray-500'}`}
                    >
                        <MoreHorizontalIcon className="h-6 w-6" />
                        <span className="text-[10px] font-medium">Mais</span>
                    </button>
                </div>
            </div>
            )}

            {/* More Menu Bottom Sheet Overlay */}
            {isMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/20" onClick={() => setIsMenuOpen(false)}>
                    <div
                        className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-xl px-4 pt-4 pb-6 transform transition-transform"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
                        <h3 className="text-sm font-semibold text-gray-400 mb-2 mt-2 px-2 uppercase tracking-wider">Outras Opções</h3>
                        <div className="flex flex-col space-y-1">
                            {extraMobileItems.map(item => (
                                <button
                                    key={item.view}
                                    onClick={() => handleNavClick(item.view)}
                                    className={`flex items-center px-4 py-3 rounded-xl transition-colors ${currentView === item.view ? 'bg-brand-blue/10 text-brand-blue' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                    {React.cloneElement(item.icon, { className: 'h-6 w-6 mr-3' })}
                                    <span className="font-semibold text-base">{item.label}</span>
                                </button>
                            ))}

                            {userRole && (
                                <>
                                    <div className="my-2 border-t border-gray-100"></div>
                                    <div className="px-4 py-3 mb-2 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                                        <span className="text-sm text-brand-dark font-medium">Perfil de Acesso:</span>
                                        <span className="text-sm font-bold text-brand-blue">{userRole}</span>
                                    </div>
                                    <div className="flex items-center px-4 py-2 mt-2 gap-3">
                                        <span className="w-full text-center text-sm text-gray-400 font-medium pr-2 border-r">
                                            Gerenciar conta:
                                        </span>
                                        <UserButton afterSignOutUrl="/" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;