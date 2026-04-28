import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { UserRole } from '../../types';
import Card from '../ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getPeriodFromDate } from '../teachers/GradesPage';
import StatCard from './StatCard';
import { AcademicCapIcon, DocumentTextIcon, StudentsIcon } from '../icons';

const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6'];

export const MetricsDashboard: React.FC = () => {
    const { user } = useAuth();
    const { students: allStudents, grades, assignments, teachers, globalSettings, campusSettings, campuses } = useData();

    const [filterCampus, setFilterCampus] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [filterPeriod, setFilterPeriod] = useState<number | 'all'>('all');
    const [filterTeacher, setFilterTeacher] = useState('');
    const [filterSubject, setFilterSubject] = useState('');

    const numberOfPeriods = useMemo(() => {
        let n = 4;
        if (globalSettings?.numberOfPeriods) n = globalSettings.numberOfPeriods;
        if (campusSettings?.numberOfPeriods) n = campusSettings.numberOfPeriods;
        return n;
    }, [globalSettings, campusSettings]);

    const availableAssignments = useMemo(() => {
        let filtered = assignments;
        if (user?.role === UserRole.SUPER_ADMIN) {
             if (filterCampus) {
                 filtered = filtered.filter(a => {
                     const t = teachers.find(teacher => teacher.id === a.teacherId);
                     return t?.campusId === filterCampus;
                 });
             }
        } else if (user?.role === UserRole.CAMPUS_ADMIN) {
            filtered = filtered.filter(a => {
                const t = teachers.find(teacher => teacher.id === a.teacherId);
                return t?.campusId === user.campusId;
            });
        } else if (user?.role === UserRole.TEACHER) {
            filtered = filtered.filter(a => a.teacherId === user.id);
        }
        if (filterTeacher) filtered = filtered.filter(a => a.teacherId === filterTeacher);
        if (filterSubject) filtered = filtered.filter(a => a.subject === filterSubject);
        if (filterClass) filtered = filtered.filter(a => a.class === filterClass);
        if (filterSection) filtered = filtered.filter(a => a.section === filterSection);
        return filtered;
    }, [assignments, teachers, user, filterCampus, filterTeacher, filterSubject, filterClass, filterSection]);

    const availableClasses = useMemo(() => {
        if (filterTeacher || filterSubject) return Array.from(new Set(availableAssignments.map(a => a.class))).sort();
        return ['Pre jardín', 'Jardín', 'Transición', '1ro', '2do', '3ro', '4to', '5to', '6', '7', '8', '9', '10', '11'];
    }, [availableAssignments, filterTeacher, filterSubject]);

    const availableSections = useMemo(() => {
        if (filterTeacher || filterSubject || filterClass) return Array.from(new Set(availableAssignments.map(a => a.section))).sort();
        return ['1', '2', '3', 'A', 'B'];
    }, [availableAssignments, filterTeacher, filterSubject, filterClass]);

    const availableSubjects = useMemo(() => {
        let filtered = assignments;
        if (user?.role === UserRole.SUPER_ADMIN) {
             if (filterCampus) {
                 filtered = filtered.filter(a => {
                     const t = teachers.find(teacher => teacher.id === a.teacherId);
                     return t?.campusId === filterCampus;
                 });
             }
        } else if (user?.role === UserRole.CAMPUS_ADMIN) {
            filtered = filtered.filter(a => {
                const t = teachers.find(teacher => teacher.id === a.teacherId);
                return t?.campusId === user.campusId;
            });
        } else if (user?.role === UserRole.TEACHER) {
            filtered = filtered.filter(a => a.teacherId === user.id);
        }
        if (filterTeacher) filtered = filtered.filter(a => a.teacherId === filterTeacher);
        if (filterClass) filtered = filtered.filter(a => a.class === filterClass);
        if (filterSection) filtered = filtered.filter(a => a.section === filterSection);
        return Array.from(new Set(filtered.map(a => a.subject))).sort();
    }, [assignments, teachers, user, filterCampus, filterTeacher, filterClass, filterSection]);

    const studentsForContext = useMemo(() => {
        if (!user) return [];
        let filtered = allStudents;
        if (user.role === UserRole.SUPER_ADMIN) {
            if (filterCampus) filtered = filtered.filter(s => s.campusId === filterCampus);
        } else if (user.role === UserRole.CAMPUS_ADMIN) {
            filtered = filtered.filter(s => s.campusId === user.campusId);
        } else if (user.role === UserRole.TEACHER) {
            filtered = filtered.filter(s => s.campusId === user.campusId);
            // Further restrict students for teachers to only those in their assigned classes
            const validClasses = new Set(assignments.filter(a => a.teacherId === user.id).map(a => `${a.class}-${a.section}`));
            filtered = filtered.filter(s => validClasses.has(`${s.class}-${s.section}`));
        }
        if (filterClass) filtered = filtered.filter(s => s.class === filterClass);
        if (filterSection) filtered = filtered.filter(s => s.section === filterSection);
        if (filterTeacher || filterSubject) {
            const validClasses = new Set(availableAssignments.map(a => `${a.class}-${a.section}`));
            filtered = filtered.filter(s => validClasses.has(`${s.class}-${s.section}`));
        }
        return filtered;
    }, [user, allStudents, filterCampus, filterClass, filterSection, filterTeacher, filterSubject, availableAssignments, assignments]);

    const filteredGrades = useMemo(() => {
        const studentIds = new Set(studentsForContext.map(s => s.id));
        let g = grades.filter(gr => studentIds.has(gr.studentId));
        if (filterSubject) g = g.filter(gr => gr.subject === filterSubject);
        if (filterPeriod !== 'all') {
            g = g.filter(gr => getPeriodFromDate(gr.date, numberOfPeriods) === filterPeriod);
        }
        return g;
    }, [grades, studentsForContext, filterSubject, filterPeriod, numberOfPeriods]);

    // Calculate Metrics
    const metricsData = useMemo(() => {
        let totalScore = 0;
        let totalWeight = 0;
        const studentScores: Record<string, { total: number, weight: number }> = {};
        const subjectScores: Record<string, { pass: number, fail: number, totalScore: number, totalWeight: number }> = {};
        const periodScores: Record<number, { totalScore: number, totalWeight: number }> = {};

        filteredGrades.forEach(g => {
            const weight = g.percentage || 100;
            const scoreVal = g.score * (weight / 100);
            totalScore += scoreVal;
            totalWeight += weight / 100;

            if (!studentScores[g.studentId]) studentScores[g.studentId] = { total: 0, weight: 0 };
            studentScores[g.studentId].total += scoreVal;
            studentScores[g.studentId].weight += weight / 100;

            if (!subjectScores[g.subject]) subjectScores[g.subject] = { pass: 0, fail: 0, totalScore: 0, totalWeight: 0 };
            subjectScores[g.subject].totalScore += scoreVal;
            subjectScores[g.subject].totalWeight += weight / 100;

            const p = getPeriodFromDate(g.date, numberOfPeriods);
            if (!periodScores[p]) periodScores[p] = { totalScore: 0, totalWeight: 0 };
            periodScores[p].totalScore += scoreVal;
            periodScores[p].totalWeight += weight / 100;
        });

        const overallAvg = totalWeight > 0 ? (totalScore / totalWeight).toFixed(2) : '0.00';
        
        let passCount = 0;
        let failCount = 0;
        Object.values(studentScores).forEach(s => {
            const avg = s.weight > 0 ? s.total / s.weight : 0;
            if (avg >= 3.0) passCount++;
            else failCount++;
        });
        
        Object.keys(subjectScores).forEach(subj => {
            // Count passes per subject correctly based on students? It's complex, let's simplify passes/fails per individual grade for subject scores.
             const subjectG = filteredGrades.filter(g => g.subject === subj);
             const sStudents: Record<string, { t: number, w: number }> = {};
             subjectG.forEach(g => {
                 if (!sStudents[g.studentId]) sStudents[g.studentId] = { t: 0, w: 0 };
                 sStudents[g.studentId].t += g.score * ((g.percentage || 100) / 100);
                 sStudents[g.studentId].w += (g.percentage || 100) / 100;
             });
             Object.values(sStudents).forEach(st => {
                 const avg = st.w > 0 ? st.t / st.w : 0;
                 if (avg >= 3.0) subjectScores[subj].pass++;
                 else subjectScores[subj].fail++;
             });
        });

        const subjArray = Object.keys(subjectScores).map(k => {
             const avg = subjectScores[k].totalWeight > 0 ? subjectScores[k].totalScore / subjectScores[k].totalWeight : 0;
             return { subject: k, avg: parseFloat(avg.toFixed(2)), pass: subjectScores[k].pass, fail: subjectScores[k].fail };
        }).sort((a,b) => b.avg - a.avg);

        const periodArray = Object.keys(periodScores).map(pStr => {
             const p = parseInt(pStr);
             const avg = periodScores[p].totalWeight > 0 ? periodScores[p].totalScore / periodScores[p].totalWeight : 0;
             return { period: `P${p}`, avg: parseFloat(avg.toFixed(2)) };
        }).sort((a,b) => a.period.localeCompare(b.period));

        return {
            overallAvg, passCount, failCount, subjArray, periodArray, evaluatedStudents: Object.keys(studentScores).length
        };
    }, [filteredGrades, numberOfPeriods]);

    const pieData = [
        { name: 'Aprobados', value: metricsData.passCount },
        { name: 'Reprobados', value: metricsData.failCount }
    ];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex flex-wrap gap-4 items-end">
                    {user?.role === UserRole.SUPER_ADMIN && (
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-bold mb-1 text-slate-500 uppercase">Sede</label>
                            <select 
                                value={filterCampus} 
                                onChange={e => { setFilterCampus(e.target.value); setFilterTeacher(''); setFilterClass(''); setFilterSection(''); }} 
                                className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Todas las Sedes</option>
                                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold mb-1 text-slate-500 uppercase">Periodo</label>
                        <select 
                            value={filterPeriod} 
                            onChange={e => setFilterPeriod(e.target.value === 'all' ? 'all' : Number(e.target.value))} 
                            className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">Todos los periodos</option>
                            {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map(p => <option key={p} value={p}>Periodo {p}</option>)}
                        </select>
                    </div>

                    {user?.role !== UserRole.TEACHER && (
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-bold mb-1 text-slate-500 uppercase">Profesor</label>
                            <select 
                                value={filterTeacher} 
                                onChange={e => setFilterTeacher(e.target.value)} 
                                className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Todos los Profesores...</option>
                                {teachers
                                    .filter(t => {
                                        if (user?.role === UserRole.SUPER_ADMIN) {
                                            return filterCampus ? t.campusId === filterCampus : true;
                                        }
                                        return t.campusId === user?.campusId;
                                    })
                                    .map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold mb-1 text-slate-500 uppercase">Asignatura</label>
                        <select 
                            value={filterSubject} 
                            onChange={e => setFilterSubject(e.target.value)} 
                            className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Todas las Asignaturas...</option>
                            {availableSubjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold mb-1 text-slate-500 uppercase">Grado</label>
                        <select 
                            value={filterClass} 
                            onChange={e => setFilterClass(e.target.value)} 
                            className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Seleccione Grado...</option>
                            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold mb-1 text-slate-500 uppercase">Grupo</label>
                        <select 
                            value={filterSection} 
                            onChange={e => setFilterSection(e.target.value)} 
                            className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Seleccione Grupo...</option>
                            {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    
                    <button 
                        onClick={() => { setFilterCampus(''); setFilterClass(''); setFilterSection(''); setFilterPeriod('all'); setFilterTeacher(''); setFilterSubject(''); }}
                        className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                        Limpiar Filtros
                    </button>
                </div>
            </Card>

            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard icon={<AcademicCapIcon />} title="Promedio General" value={metricsData.overallAvg} color="#3B82F6" />
                <StatCard icon={<StudentsIcon />} title="Total Evaluados" value={String(metricsData.evaluatedStudents)} color="#8B5CF6" />
                <StatCard icon={<DocumentTextIcon />} title="Aprobados" value={String(metricsData.passCount)} color="#10B981" />
                <StatCard icon={<DocumentTextIcon />} title="Reprobados" value={String(metricsData.failCount)} color="#EF4444" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Promedio por Asignatura</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metricsData.subjArray} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                <RechartsTooltip 
                                    formatter={(value) => [`${value}`, 'Promedio']} 
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{fill: '#f8fafc'}}
                                />
                                <Bar dataKey="avg" fill="url(#colorAvg)" radius={[6, 6, 0, 0]} name="Promedio" barSize={35} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Estado de Aprobación</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={pieData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={70} outerRadius={90} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.85} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', color: '#64748b' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Table and Trends Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Detalle por Asignatura</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 uppercase text-[11px] font-semibold tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Asignatura</th>
                                    <th className="px-4 py-3 text-center">Promedio</th>
                                    <th className="px-4 py-3 text-center">Aprobados</th>
                                    <th className="px-4 py-3 text-center rounded-tr-lg">Reprobados</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {metricsData.subjArray.map(subj => (
                                    <tr key={subj.subject} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{subj.subject}</td>
                                        <td className="px-4 py-3 text-center font-semibold text-blue-500">{subj.avg.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-center font-medium text-emerald-500">{subj.pass}</td>
                                        <td className="px-4 py-3 text-center font-medium text-red-400">{subj.fail}</td>
                                    </tr>
                                ))}
                                {metricsData.subjArray.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-6 text-slate-400 font-medium tracking-wide">Sin datos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Tendencia de Promedio Escolar por Periodo</h3>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metricsData.periodArray} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                <RechartsTooltip 
                                    formatter={(value) => [`${value}`, 'Promedio']} 
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="avg" 
                                    stroke="#8B5CF6" 
                                    strokeWidth={3} 
                                    dot={{r: 4, strokeWidth: 2, fill: '#fff'}} 
                                    activeDot={{r: 6, strokeWidth: 0, fill: '#8B5CF6'}} 
                                    name="Promedio" 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default MetricsDashboard;
