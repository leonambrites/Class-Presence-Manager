import React, { useMemo, useState } from 'react';
import { Student, StudentType } from '../types';
import { calculateAge } from '../utils';

interface StudentProfileProps {
    student: Student;
    students?: Student[];
    onLinkSiblings?: (studentId1: string, studentId2: string) => void;
    onClose: () => void;
}

const StudentProfile: React.FC<StudentProfileProps> = ({ student, students, onLinkSiblings, onClose }) => {
    const [siblingSearch, setSiblingSearch] = useState('');

    const currentSiblings = useMemo(() => {
        if (!students || !student.familyId) return [];
        return students.filter(s => s.id !== student.id && s.familyId === student.familyId);
    }, [student, students]);

    const potentialSiblings = useMemo(() => {
        if (!students || students.length === 0) return [];
        return students.filter(s => {
            if (s.id === student.id) return false;
            if (student.familyId && s.familyId === student.familyId) return false;
            
            const matchesPhone = s.phone && student.phone && s.phone.replace(/\D/g, '') === student.phone.replace(/\D/g, '');
            const matchesMother = s.motherName && student.motherName && s.motherName.trim().toLowerCase() === student.motherName.trim().toLowerCase();
            const matchesFather = s.fatherName && student.fatherName && s.fatherName.trim().toLowerCase() === student.fatherName.trim().toLowerCase();
            
            return matchesPhone || matchesMother || matchesFather;
        });
    }, [student, students]);

    const siblingSuggestions = useMemo(() => {
        if (!students || siblingSearch.trim().length < 2) return [];
        const query = siblingSearch.toLowerCase();
        return students.filter(s => {
            if (s.id === student.id) return false;
            if (student.familyId && s.familyId === student.familyId) return false;
            return s.name.toLowerCase().includes(query);
        }).slice(0, 5);
    }, [students, siblingSearch, student]);

    const stats = useMemo(() => {
        const totalPresences = student.attendance.filter(a => a.present).length;
        const totalRecords = student.attendance.length;
        const attendanceRate = totalRecords > 0 ? Math.round((totalPresences / totalRecords) * 100) : 0;

        const presentDates = student.attendance
            .filter(a => a.present)
            .map(a => a.date)
            .sort((a, b) => b.localeCompare(a));

        const lastAttendance = presentDates.length > 0 ? presentDates[0] : null;

        const daysSinceLastAttendance = (() => {
            if (!lastAttendance) return null;
            const last = new Date(lastAttendance + 'T00:00:00');
            const now = new Date();
            return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        })();

        // Monthly chart data (last 6 months)
        const monthlyData: { label: string; count: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = d.getMonth();
            const year = d.getFullYear();
            const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

            const count = student.attendance.filter(a => {
                if (!a.present) return false;
                const ad = new Date(a.date + 'T00:00:00');
                return ad.getMonth() === month && ad.getFullYear() === year;
            }).length;

            monthlyData.push({ label, count });
        }
        const maxMonthly = Math.max(...monthlyData.map(m => m.count), 1);

        return { totalPresences, attendanceRate, lastAttendance, daysSinceLastAttendance, monthlyData, maxMonthly };
    }, [student]);

    const sortedHistory = useMemo(() => {
        return [...student.attendance]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 50); // last 50 records
    }, [student]);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-blue to-blue-600 text-white p-6 rounded-t-2xl">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/80 bg-white/10 flex items-center justify-center flex-shrink-0">
                                {student.photo ? (
                                    <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white/80 text-3xl select-none">👤</span>
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{student.name}</h2>
                                <p className="text-blue-100 mt-1">{student.class} — {calculateAge(student.birthday, student.age)} anos</p>
                                {student.birthday && (
                                    <p className="text-blue-200 text-sm mt-0.5">🎂 {new Date(student.birthday + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white text-2xl font-bold leading-none">&times;</button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${student.type === StudentType.Membro ? 'bg-green-400/30 text-green-100' : 'bg-yellow-400/30 text-yellow-100'}`}>
                            {student.type}
                        </span>
                        {student.hasAllergy && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-400/30 text-red-100">
                                ⚠ Alergia: {student.allergyDescription}
                            </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${student.imageUseAllowed ? 'bg-emerald-400/30 text-emerald-100' : 'bg-rose-400/30 text-rose-100'}`}>
                            📷 Imagem: {student.imageUseAllowed ? 'Autorizada' : 'Não Autorizada'}
                        </span>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {(!student.motherName && !student.fatherName) ? (
                            <div>
                                <span className="text-gray-500 block">Responsável</span>
                                <p className="font-semibold text-gray-800">{student.guardianName || '—'}</p>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <span className="text-gray-500 block">Nome da Mãe</span>
                                    <p className="font-semibold text-gray-800">{student.motherName || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Nome do Pai</span>
                                    <p className="font-semibold text-gray-800">{student.fatherName || '—'}</p>
                                </div>
                                {student.hasOtherGuardian && (
                                    <div className="sm:col-span-2">
                                        <span className="text-gray-500 block">Outro Responsável ({student.otherGuardianRelationship})</span>
                                        <p className="font-semibold text-gray-800">{student.otherGuardianName || '—'}</p>
                                    </div>
                                )}
                            </>
                        )}
                        <div>
                            <span className="text-gray-500 block">Telefone de Contato</span>
                            <p className="font-semibold text-gray-800">{student.phone || '—'}</p>
                        </div>
                        <div className="sm:col-span-2 border-t pt-3 mt-1">
                            <span className="text-gray-500 block font-medium text-xs">Autorização de Imagem</span>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${student.imageUseAllowed ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'}`}>
                                    {student.imageUseAllowed ? 'Autorizado pelo Responsável' : 'Não Autorizado'}
                                </span>
                                {student.imageUseAllowed && student.imageUseDocument && (
                                    <a
                                        href={student.imageUseDocument}
                                        download={`autorizacao_${student.name.toLowerCase().replace(/\s+/g, '_')}.pdf`}
                                        className="text-xs font-bold text-brand-blue hover:text-blue-700 transition flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-lg border border-blue-200"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Baixar Termo Assinado (PDF)
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Família e Irmãos (Options A & B) */}
                {students && (
                    <div className="px-6 py-4 border-b border-gray-100 bg-white">
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">Família e Irmãos</h3>
                        
                        {currentSiblings.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                <span className="text-xs text-gray-500 font-medium">Irmãos Vinculados:</span>
                                <div className="flex flex-wrap gap-2">
                                    {currentSiblings.map(sib => (
                                        <span key={sib.id} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-semibold shadow-sm">
                                            👤 {sib.name} ({sib.class})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 font-semibold">Nenhum irmão vinculado a este cadastro.</p>
                        )}

                        {/* Sibling Linkage Autocomplete (Option B) */}
                        <div className="mt-4 border-t pt-3.5 relative">
                            <label className="text-xs font-bold text-gray-700 block mb-1">
                                Buscar outro irmão para vincular:
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={siblingSearch}
                                    onChange={(e) => setSiblingSearch(e.target.value)}
                                    placeholder="Digite o nome do irmão para buscar..."
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg p-2 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                {siblingSuggestions.length > 0 && (
                                    <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 divide-y divide-gray-100 max-h-40 overflow-y-auto">
                                        {siblingSuggestions.map(sib => (
                                            <li key={sib.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm(`Deseja vincular ${student.name} e ${sib.name} como irmãos? Isso unificará os dados familiares.`)) {
                                                            onLinkSiblings?.(student.id, sib.id);
                                                            setSiblingSearch('');
                                                        }
                                                    }}
                                                    className="w-full text-left p-2.5 hover:bg-blue-50/50 transition flex flex-col gap-0.5"
                                                >
                                                    <span className="text-xs font-bold text-gray-950">{sib.name}</span>
                                                    <span className="text-[10px] text-gray-500 font-semibold">
                                                        Sala: {sib.class} • Responsável: {sib.guardianName}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {siblingSearch.trim().length >= 2 && siblingSuggestions.length === 0 && (
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg p-2.5 text-center text-xs text-gray-500 z-50">
                                        Nenhum aluno encontrado com "{siblingSearch}".
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Option A: Smart suggestions */}
                        {potentialSiblings.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <span className="text-xs font-bold text-yellow-800 block">💡 Sugestão de Vínculo:</span>
                                {potentialSiblings.map(sib => (
                                    <div key={sib.id} className="flex items-center justify-between bg-yellow-50/70 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-900 shadow-sm">
                                        <div className="min-w-0 flex-1 pr-2">
                                            <p className="font-bold">Possível irmão: {sib.name}</p>
                                            <p className="text-[10px] text-yellow-800 mt-0.5">
                                                Sala: {sib.class} • Responsável: {sib.guardianName}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onLinkSiblings?.(student.id, sib.id);
                                            }}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-3 py-1 rounded-lg border border-yellow-400 shadow-sm transition"
                                        >
                                            Vincular
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Stats */}
                <div className="px-6 py-4 grid grid-cols-3 gap-4 border-b border-gray-100">
                    <div className="text-center">
                        <span className="text-3xl font-bold text-brand-blue">{stats.totalPresences}</span>
                        <p className="text-xs text-gray-500 mt-1">Presenças</p>
                    </div>
                    <div className="text-center">
                        <span className={`text-3xl font-bold ${stats.attendanceRate >= 70 ? 'text-brand-green' : stats.attendanceRate >= 40 ? 'text-brand-yellow' : 'text-brand-red'}`}>
                            {stats.attendanceRate}%
                        </span>
                        <p className="text-xs text-gray-500 mt-1">Frequência</p>
                    </div>
                    <div className="text-center">
                        {stats.lastAttendance ? (
                            <>
                                <span className={`text-3xl font-bold ${(stats.daysSinceLastAttendance ?? 999) >= 30 ? 'text-brand-red animate-pulse' : (stats.daysSinceLastAttendance ?? 999) >= 14 ? 'text-brand-yellow' : 'text-brand-green'}`}>
                                    {stats.daysSinceLastAttendance}d
                                </span>
                                <p className="text-xs text-gray-500 mt-1">Desde última</p>
                            </>
                        ) : (
                            <>
                                <span className="text-3xl font-bold text-gray-300">—</span>
                                <p className="text-xs text-gray-500 mt-1">Sem registros</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Monthly Chart */}
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-600 mb-3">Frequência Mensal</h3>
                    <div className="flex items-end gap-2 h-24">
                        {stats.monthlyData.map((m, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-xs font-bold text-gray-700">{m.count}</span>
                                <div
                                    className="w-full rounded-t-md bg-gradient-to-t from-brand-blue to-blue-400 transition-all duration-300"
                                    style={{ height: `${Math.max((m.count / stats.maxMonthly) * 100, 4)}%` }}
                                />
                                <span className="text-[10px] text-gray-500 capitalize">{m.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Attendance History */}
                <div className="px-6 py-4">
                    <h3 className="text-sm font-semibold text-gray-600 mb-3">Histórico de Presença</h3>
                    {sortedHistory.length > 0 ? (
                        <div className="overflow-x-auto max-h-60 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dia</th>
                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Presença</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Saída</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sortedHistory.map((att, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-gray-800">
                                                {new Date(att.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                                {att.day === 'Sunday' ? 'Domingo' : att.day === 'Wednesday' ? 'Quarta' : att.day || '—'}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {att.present ? (
                                                    <span className="inline-block w-5 h-5 rounded-full bg-green-500 text-white text-xs leading-5">✓</span>
                                                ) : (
                                                    <span className="inline-block w-5 h-5 rounded-full bg-red-200 text-red-600 text-xs leading-5">✗</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">{att.dismissedBy || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 py-6">Nenhum registro de presença.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
