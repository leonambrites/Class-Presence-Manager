import React, { useState } from 'react';
import { View } from '../types';
import { DashboardIcon, CheckCircleIcon, UsersIcon, CalendarIcon, BookOpenIcon, LogOutIcon } from './icons';

interface HeaderProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const NavButton: React.FC<{
    currentView: View;
    view: View;
    onClick: (view: View) => void;
    // FIX: Specify the props type for the icon element to allow cloning with new props.
    icon: React.ReactElement<React.ComponentProps<'svg'>>;
    label: string;
    isMobile?: boolean;
}> = ({ currentView, view, onClick, icon, label, isMobile = false }) => {
    const isActive = currentView === view;
    const iconOnlyClassName = "h-6 w-6";
    const iconWithLabelClassName = "h-5 w-5 mr-2";
    
    return (
        <button
            onClick={() => onClick(view)}
            title={label}
            className={`flex items-center justify-center md:justify-start px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isActive
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
            } ${isMobile ? 'w-full' : ''}`}
        >
            {React.cloneElement(icon, { className: isMobile || label.length === 0 ? iconOnlyClassName : iconWithLabelClassName })}
            {isMobile && <span className="ml-3">{label}</span>}
            {!isMobile && <span className="hidden lg:inline">{label}</span>}
        </button>
    );
};


const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavClick = (view: View) => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  const navItems = [
      { view: View.Dashboard, icon: <DashboardIcon />, label: "Dashboard" },
      { view: View.Attendance, icon: <CheckCircleIcon />, label: "Presença" },
      { view: View.Students, icon: <UsersIcon />, label: "Alunos" },
      { view: View.Schedule, icon: <CalendarIcon />, label: "Escala" },
      { view: View.Topics, icon: <BookOpenIcon />, label: "Assuntos" },
      { view: View.Dismissal, icon: <LogOutIcon />, label: "Saída" },
  ];

  return (
    <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center">
                <h1 className="text-xl sm:text-2xl font-bold text-brand-dark whitespace-nowrap">
                    Gestão de Turmas
                </h1>
                
                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-4">
                    <nav className="flex items-center space-x-1">
                        {navItems.map(item => <NavButton key={item.view} {...item} currentView={currentView} onClick={onNavigate} />)}
                    </nav>
                </div>

                {/* Hamburger Button */}
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)} 
                    className="md:hidden p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-blue"
                    aria-label="Open navigation menu"
                    aria-expanded={isMenuOpen}
                >
                    <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                        {isMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>
            
            {/* Mobile Menu */}
            <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden mt-4 border-t pt-4`}>
                <nav className="flex flex-col space-y-2">
                    {navItems.map(item => <NavButton key={item.view} {...item} currentView={currentView} onClick={handleNavClick} isMobile={true} />)}
                </nav>
            </div>
        </div>
    </header>
  );
};

export default Header;