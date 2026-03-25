import React, { useMemo } from 'react';
import { Student, StudentType } from '../types';
import { calculateAge } from '../utils';

interface StudentProfileProps {
    student: Student;
    onClose: () => void;
}

const StudentProfile: React.FC<StudentProfileProps> = ({ student, onClose }) => {
    const stats = useMemo(() => {
        const totalPresences = student.attendance.filter(a => a.present).length;
        const totalRecords = student.attendance.length;
        const attendanceRate = totalRecords > 0 ? Math.round((totalPresences / totalRecords) * 100) : 0;

        const presentDates = student.attendance
            .filter(a => a.present)
            .map(a => a.date)
            .sort((a, b) => b.localeCompare(a));

        const lastAttendance = presentDates.length > 0 ? presentDates[0] : null;

        let daysSinceLastAttendance: number | null = null;
        if (lastAttendance) {
            const last = new Date(lastAttendance + 'T00:00:00');
            const now = new Date();
            daysSinceLastAttendance = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        }

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
                        <div>
                            <h2 className="text-2xl font-bold">{student.name}</h2>
                            <p className="text-blue-100 mt-1">{student.class} — {calculateAge(student.birthday, student.age)} anos</p>
                            {student.birthday && (
                                <p className="text-blue-200 text-sm mt-0.5">🎂 {new Date(student.birthday + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                            )}
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white text-2xl font-bold leading-none">&times;</button>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${student.type === StudentType.Membro ? 'bg-green-400/30 text-green-100' : 'bg-yellow-400/30 text-yellow-100'}`}>
                            {student.type}
                        </span>
                        {student.hasAllergy && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-400/30 text-red-100">
                                ⚠ Alergia: {student.allergyDescription}
                            </span>
                        )}
                    </div>
                </div>

                {/* Contact Info */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Responsável</span>
                            <p className="font-semibold text-gray-800">{student.guardianName || '—'}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Telefone</span>
                            <p className="font-semibold text-gray-800">{student.phone || '—'}</p>
                        </div>
                    </div>
                </div>

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
                                <span className={`text-2xl font-bold ${(stats.daysSinceLastAttendance ?? 999) > 30 ? 'text-brand-red' : (stats.daysSinceLastAttendance ?? 999) > 14 ? 'text-brand-yellow' : 'text-brand-green'}`}>
                                    {stats.daysSinceLastAttendance}d
                                </span>
                                <p className="text-xs text-gray-500 mt-1">Desde última</p>
                            </>
                        ) : (
                            <>
                                <span className="text-2xl font-bold text-gray-300">—</span>
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
