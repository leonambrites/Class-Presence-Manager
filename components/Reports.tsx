import React, { useState, useMemo } from 'react';
import { Student, Volunteer, ScheduleEntry, StudentType } from '../types';
import { CLASS_NAMES } from '../constants';
import { FileTextIcon } from './icons';

interface ReportsProps {
    students: Student[];
    volunteers: Volunteer[];
    schedule: ScheduleEntry[];
}

interface ReportRow {
    date: string;
    className: string;
    coordinatorName: string;
    membrosPresentes: number;
    visitantesPresentes: number;
    totalPresentes: number;
}

const Reports: React.FC<ReportsProps> = ({ students, volunteers, schedule }) => {
    // Default to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState('Todas');
    const [selectedCoordinator, setSelectedCoordinator] = useState('Todos');

    // Extract unique coordinators for the filter dropdown
    const coordinators = useMemo(() => {
        const coords = new Map<string, string>(); // id -> name
        schedule.forEach(s => {
            if (s.coordinatorId) {
                const vol = volunteers.find(v => v.id === s.coordinatorId);
                if (vol) coords.set(vol.id, vol.name);
            }
        });
        return Array.from(coords.entries()).map(([id, name]) => ({ id, name }));
    }, [schedule, volunteers]);

    const reportData = useMemo(() => {
        const rows: ReportRow[] = [];

        // 1. Find all unique dates in the given range from attendance records
        const datesSet = new Set<string>();
        students.forEach(student => {
            student.attendance.forEach(a => {
                if (a.date >= startDate && a.date <= endDate) {
                    datesSet.add(a.date);
                }
            });
        });
        const dates = Array.from(datesSet).sort((a, b) => b.localeCompare(a)); // Descending

        // 2. Build rows per date and per class
        dates.forEach(date => {
            CLASS_NAMES.forEach(className => {
                // Check if we should filter by class
                if (selectedClass !== 'Todas' && selectedClass !== className) return;

                // Find schedule for this class/date to get coordinator
                const sched = schedule.find(s => s.date === date && s.className === className);
                const coordinatorId = sched?.coordinatorId || null;

                // Filter by coordinator
                if (selectedCoordinator !== 'Todos' && coordinatorId !== selectedCoordinator) return;

                const coordinatorName = coordinatorId
                    ? volunteers.find(v => v.id === coordinatorId)?.name || 'Desconhecido'
                    : 'Sem Coordenadora';

                // Calculate attendance
                let membrosPresentes = 0;
                let visitantesPresentes = 0;

                students.forEach(student => {
                    if (student.class === className) {
                        const att = student.attendance.find(a => a.date === date);
                        if (att && att.present) {
                            if (student.type === StudentType.Visitante) {
                                visitantesPresentes++;
                            } else {
                                membrosPresentes++;
                            }
                        }
                    }
                });

                const totalPresentes = membrosPresentes + visitantesPresentes;

                // Only add row if there was a schedule OR someone was present (to avoid empty zero rows for every class every day)
                if (totalPresentes > 0 || sched) {
                    rows.push({
                        date,
                        className,
                        coordinatorName,
                        membrosPresentes,
                        visitantesPresentes,
                        totalPresentes
                    });
                }
            });
        });

        return rows;
    }, [students, volunteers, schedule, startDate, endDate, selectedClass, selectedCoordinator]);

    // Format date for display (YYYY-MM-DD to DD/MM/YYYY)
    const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    const handleExportCSV = () => {
        if (reportData.length === 0) return;

        const headers = ['Data', 'Turma', 'Coordenadora', 'Membros Presentes', 'Visitantes Presentes', 'Total Presentes'];
        const csvContent = [
            headers.join(';'),
            ...reportData.map(row => [
                formatDate(row.date),
                row.className,
                row.coordinatorName,
                row.membrosPresentes,
                row.visitantesPresentes,
                row.totalPresentes
            ].join(';'))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `relatorio_presenca_${startDate}_ate_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate totals for the summary cards
    const totalMembros = reportData.reduce((sum, row) => sum + row.membrosPresentes, 0);
    const totalVisitantes = reportData.reduce((sum, row) => sum + row.visitantesPresentes, 0);
    const grandTotal = totalMembros + totalVisitantes;

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                <h2 className="text-3xl font-bold text-brand-dark">Relatórios de Frequência</h2>
                <button
                    onClick={handleExportCSV}
                    disabled={reportData.length === 0}
                    className="mt-4 sm:mt-0 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition shadow-sm"
                >
                    <FileTextIcon className="w-5 h-5" />
                    <span className="ml-2">Exportar para Excel (CSV)</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                        >
                            <option value="Todas">Todas as Turmas</option>
                            {CLASS_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Coordenadora</label>
                        <select
                            value={selectedCoordinator}
                            onChange={(e) => setSelectedCoordinator(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                        >
                            <option value="Todos">Todas as Coordenadoras</option>
                            {coordinators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-brand-blue">
                    <p className="text-sm font-medium text-gray-500">Total Frequência (Período)</p>
                    <p className="text-3xl font-bold text-gray-900">{grandTotal}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500">
                    <p className="text-sm font-medium text-gray-500">Membros Presentes</p>
                    <p className="text-3xl font-bold text-gray-900">{totalMembros}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-orange-400">
                    <p className="text-sm font-medium text-gray-500">Visitantes Presentes</p>
                    <p className="text-3xl font-bold text-gray-900">{totalVisitantes}</p>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turma</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordenadora</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Membros</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Visitantes</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-brand-dark uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.length > 0 ? (
                                reportData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatDate(row.date)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.className}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.coordinatorName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{row.membrosPresentes}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{row.visitantesPresentes}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-brand-blue">{row.totalPresentes}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                        Nenhum registro encontrado para os filtros selecionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
