import React, { useState } from 'react';
import { View } from '../types';
import { DashboardIcon, CheckCircleIcon, UsersIcon, CalendarIcon, BookOpenIcon, LogOutIcon, UserPlusIcon, MoreHorizontalIcon } from './icons';
import { LOGO_URL } from '../constants';

interface HeaderProps {
    currentView: View;
    onNavigate: (view: View) => void;
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

const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Close menu when navigating
    const handleNavClick = (view: View) => {
        onNavigate(view);
        setIsMenuOpen(false);
    };

    const navItems = [
        { view: View.Dashboard, icon: <DashboardIcon />, label: "Dashboard" },
        { view: View.Attendance, icon: <CheckCircleIcon />, label: "Presença" },
        { view: View.Students, icon: <UsersIcon />, label: "Alunos" },
        { view: View.Volunteers, icon: <UserPlusIcon />, label: "Professores" },
        { view: View.Schedule, icon: <CalendarIcon />, label: "Escala" },
        { view: View.Topics, icon: <BookOpenIcon />, label: "Assuntos" },
        { view: View.Dismissal, icon: <LogOutIcon />, label: "Saída" },
    ];

    const mainMobileItems = [
        { view: View.Dashboard, icon: <DashboardIcon />, label: "Início" },
        { view: View.Attendance, icon: <CheckCircleIcon />, label: "Presença" },
        { view: View.Students, icon: <UsersIcon />, label: "Alunos" },
        { view: View.Schedule, icon: <CalendarIcon />, label: "Escala" },
    ];

    const extraMobileItems = [
        { view: View.Volunteers, icon: <UserPlusIcon />, label: "Professores" },
        { view: View.Topics, icon: <BookOpenIcon />, label: "Assuntos" },
        { view: View.Dismissal, icon: <LogOutIcon />, label: "Saída" },
    ];

    return (
        <>
            <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
                <div className="container mx-auto p-4">
                    <div className="flex justify-center md:justify-between items-center">
                        <div className="flex items-center gap-3">
                            <img
                                src={LOGO_URL}
                                alt="Mundo Kids Logo"
                                className="h-10 w-auto object-contain"
                            />
                            <h1 className="text-xl sm:text-2xl font-bold text-brand-dark whitespace-nowrap">
                                Gestão de Turmas
                            </h1>
                        </div>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-4">
                            <nav className="flex items-center space-x-1">
                                {navItems.map(item => <NavButton key={item.view} {...item} currentView={currentView} onClick={onNavigate} />)}
                            </nav>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Bottom Navigation */}
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
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;