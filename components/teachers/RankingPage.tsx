
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { TeacherCourseAssignment, Student, Grade, UserRole } from '../../types';
import Card from '../ui/Card';
import { getPeriodFromDate } from './GradesPage';
import { ChevronDownIcon, CalendarIcon } from '../icons';

const RankingPage: React.FC = () => {
    const { user } = useAuth();
    const { assignments, students, grades, globalSettings } = useData();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
    const [numberOfPeriods, setNumberOfPeriods] = useState(4);

    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
    const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('');

    const isStudentOrParent = user?.role === UserRole.STUDENT || user?.role === UserRole.PARENT;
    const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.CAMPUS_ADMIN;

    // Get unique classes and sections for admin filters
    const availableClasses = useMemo(() => {
        if (!isAdmin) return [];
        const classes = new Set(students.map(s => s.class).filter(Boolean));
        return Array.from(classes).sort();
    }, [students, isAdmin]);

    const availableSections = useMemo(() => {
        if (!isAdmin || !selectedClassFilter) return [];
        const sections = new Set(students.filter(s => s.class === selectedClassFilter).map(s => s.section).filter(Boolean));
        return Array.from(sections).sort();
    }, [students, isAdmin, selectedClassFilter]);

    useEffect(() => {
        if (globalSettings && globalSettings.numberOfPeriods) {
            setNumberOfPeriods(globalSettings.numberOfPeriods);
        }

        const today = new Date().toISOString().split('T')[0];
        setSelectedPeriod(getPeriodFromDate(today, numberOfPeriods));

        if (user) {
            if (user.role === UserRole.TEACHER) {
                const teacherAssignments = assignments.filter(a => a.teacherId === user.id);
                if (teacherAssignments.length > 0) {
                    setSelectedClassId(teacherAssignments[0].id);
                }
            } else if (isStudentOrParent) {
                const targetStudent = user.role === UserRole.STUDENT 
                    ? students.find(s => s.id === user.id)
                    : students.find(s => s.id === (user as any).studentId);
                
                if (targetStudent) {
                    const studentGrades = grades.filter(g => g.studentId === targetStudent.id);
                    if (studentGrades.length > 0) {
                        setSelectedSubject(studentGrades[0].subject);
                    }
                }
            }
        }
    }, [user, assignments, numberOfPeriods, students, grades, isStudentOrParent]);

    const myClasses = useMemo(() => assignments.filter(a => a.teacherId === user?.id), [assignments, user]);
    
    const selectedClass = useMemo(() => {
        if (user?.role === UserRole.TEACHER) {
            return myClasses.find(c => c.id === selectedClassId);
        } else if (isStudentOrParent) {
            const targetStudent = user?.role === UserRole.STUDENT 
                ? students.find(s => s.id === user.id)
                : students.find(s => s.id === (user as any).studentId);
            
            return targetStudent ? { class: targetStudent.class, section: targetStudent.section } : null;
        }
        return null; // For admin, selectedClass is null
    }, [user, myClasses, selectedClassId, students, isStudentOrParent]);

    const availableSubjects = useMemo(() => {
        if (isAdmin) {
            if (selectedClassFilter && selectedSectionFilter) {
                const classAssignments = assignments.filter(a => a.class === selectedClassFilter && a.section === selectedSectionFilter);
                return Array.from(new Set(classAssignments.map(a => a.subject))).sort();
            }
            return Array.from(new Set(assignments.map(a => a.subject))).sort();
        }
        if (!selectedClass) return [];
        const classGrades = grades.filter(g => g.class === selectedClass.class);
        return Array.from(new Set(classGrades.map(g => g.subject))).sort();
    }, [selectedClass, grades, isAdmin, assignments, selectedClassFilter, selectedSectionFilter]);

    useEffect(() => {
        if (!selectedSubject && availableSubjects.length > 0) {
            setSelectedSubject(availableSubjects[0]);
        }
    }, [availableSubjects, selectedSubject]);

    const rankingData = useMemo(() => {
        if (!isAdmin && !selectedClass) return [];

        let groupStudents = students.filter(s => s.status === 'active');

        if (isAdmin) {
            if (selectedClassFilter) {
                groupStudents = groupStudents.filter(s => s.class === selectedClassFilter);
            }
            if (selectedSectionFilter) {
                groupStudents = groupStudents.filter(s => s.section === selectedSectionFilter);
            }
        } else if (selectedClass) {
            groupStudents = groupStudents.filter(s => 
                s.class === selectedClass.class && 
                s.section === selectedClass.section
            );
        }

        const currentSubject = user?.role === UserRole.TEACHER 
            ? (selectedClass as any).subject 
            : selectedSubject;

        if (!currentSubject) return [];

        return groupStudents.map(student => {
            const studentGrades = grades.filter(g => 
                g.studentId === student.id && 
                g.subject === currentSubject &&
                getPeriodFromDate(g.date, numberOfPeriods) === selectedPeriod
            );

            let average = 0;
            if (studentGrades.length > 0) {
                const totalWeighted = studentGrades.reduce((acc, g) => acc + (g.score * (g.percentage / 100)), 0);
                const totalPercentage = studentGrades.reduce((acc, g) => acc + g.percentage, 0);
                average = totalPercentage > 0 ? (totalWeighted / totalPercentage) * 100 : 0;
            }

            return {
                id: student.id,
                name: student.name,
                className: `${student.class}-${student.section}`,
                average: average,
                count: studentGrades.length
            };
        }).filter(d => d.average > 0).sort((a, b) => b.average - a.average);
    }, [selectedClass, students, grades, selectedPeriod, numberOfPeriods, user, selectedSubject, isAdmin, selectedClassFilter, selectedSectionFilter]);

    // Función para generar mensajes únicos por estudiante
    const generateUniqueFeedback = (name: string, score: number) => {
        const firstName = name.split(' ')[0];
        const seed = name.length + Math.round(score * 10);
        
        if (score >= 4.6) {
            const msgs = [
                `¡Brillante desempeño, ${firstName}! Eres un modelo a seguir.`,
                `¡Excelencia pura! Tu dedicación en ${selectedSubject} es notable.`,
                `${firstName}, tu esfuerzo te ha llevado a la cima. ¡Felicidades!`,
                `¡Impresionante! Mantienes un nivel superior constante, ${firstName}.`,
                `Tu compromiso con el aprendizaje es inspirador, ${firstName}.`
            ];
            return msgs[seed % msgs.length];
        }
        if (score >= 4.0) {
            const msgs = [
                `¡Gran trabajo, ${firstName}! Estás muy cerca de la excelencia.`,
                `Vas por muy buen camino. ¡Sigue con esa energía!`,
                `${firstName}, demuestras un alto dominio de los temas vistos.`,
                `Tu progreso es constante y sólido, ${firstName}. ¡Adelante!`,
                `Muy buen nivel, ${firstName}. Tienes madera de líder.`
            ];
            return msgs[seed % msgs.length];
        }
        if (score >= 3.0) {
            const msgs = [
                `Buen esfuerzo, ${firstName}. Sabemos que puedes dar mucho más.`,
                `Paso a paso vas mejorando. ¡No bajes el ritmo!`,
                `${firstName}, tienes las bases, ahora vamos por el siguiente nivel.`,
                `Cumples con tus objetivos, pero tu potencial es aún mayor.`,
                `Sigue practicando, ${firstName}. La constancia es la clave.`
            ];
            return msgs[seed % msgs.length];
        }
        const msgs = [
            `Ánimo, ${firstName}. Estamos aquí para apoyarte en tu mejora.`,
            `Cada pequeño paso cuenta. ¡No te rindas ahora!`,
            `${firstName}, es momento de redoblar esfuerzos para el próximo periodo.`,
            `Sabemos que tienes talento. ¡Vamos a sacarlo a relucir!`,
            `Con dedicación extra, lograrás superar este bache, ${firstName}.`
        ];
        return msgs[seed % msgs.length];
    };

    const getQualitativeStyles = (score: number) => {
        if (score >= 4.6) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 4.0) return 'text-blue-600 bg-blue-50 border-blue-100';
        if (score >= 3.0) return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-rose-600 bg-rose-50 border-rose-100';
    };

    const top3 = rankingData.slice(0, 3);
    const theRest = rankingData.slice(3);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header con Periodo al costado derecho */}
            <header className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold tracking-tight">Ranking de Estudiantes</h1>
                    <p className="text-indigo-100 mt-2 font-medium opacity-90">
                        {isStudentOrParent ? 'Cuadro de honor de tu grupo.' : 'Cuadro de honor basado en el rendimiento actual.'}
                    </p>
                </div>
                
                {/* Selector de Periodo integrado en el Header */}
                <div className="relative z-10 flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
                    <span className="text-xs font-bold text-indigo-100 uppercase px-3">Periodo</span>
                    {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map(p => (
                        <button
                            key={p}
                            onClick={() => setSelectedPeriod(p)}
                            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${selectedPeriod === p ? 'bg-white text-indigo-600 shadow-lg' : 'text-white hover:bg-white/10'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            </header>

            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    {user?.role === UserRole.TEACHER ? (
                        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 w-full md:w-auto overflow-x-auto">
                            {myClasses.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedClassId(c.id)}
                                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${selectedClassId === c.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                                >
                                    {c.class}-{c.section} <span className="opacity-60 font-normal ml-1">({c.subject})</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 w-full sm:w-auto">
                            {isAdmin && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grado</span>
                                        <div className="relative group min-w-[100px]">
                                            <select 
                                                value={selectedClassFilter}
                                                onChange={(e) => {
                                                    setSelectedClassFilter(e.target.value);
                                                    setSelectedSectionFilter('');
                                                }}
                                                className="appearance-none w-full bg-transparent font-bold text-sm text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-8"
                                            >
                                                <option value="">Todos</option>
                                                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grupo</span>
                                        <div className="relative group min-w-[80px]">
                                            <select 
                                                value={selectedSectionFilter}
                                                onChange={(e) => setSelectedSectionFilter(e.target.value)}
                                                disabled={!selectedClassFilter}
                                                className="appearance-none w-full bg-transparent font-bold text-sm text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-8 disabled:opacity-50"
                                            >
                                                <option value="">Todos</option>
                                                {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                                </>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Materia</span>
                                <div className="relative group min-w-[160px]">
                                    <select 
                                        value={selectedSubject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="appearance-none w-full bg-transparent font-bold text-sm text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-8"
                                    >
                                        {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                        {availableSubjects.length === 0 && <option value="">Sin asignaturas</option>}
                                    </select>
                                    <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {rankingData.length > 0 ? (
                <div className="space-y-8">
                    {/* Podium */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-5xl mx-auto pt-4">
                        {/* 2nd Place */}
                        {top3[1] && (
                            <div className="order-2 md:order-1 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                <div className="flex flex-col items-center">
                                    <div className="relative mb-4 group">
                                        <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-slate-300 dark:bg-slate-700 dark:border-slate-600 overflow-hidden shadow-xl group-hover:scale-110 transition-transform">
                                            <img src={`https://ui-avatars.com/api/?name=${top3[1].name}&background=64748b&color=fff`} alt="" />
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-400 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">2°</div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-t-3xl shadow-xl border-x border-t border-slate-100 dark:border-slate-800 w-full text-center min-h-[160px] flex flex-col justify-center">
                                        <p className="font-bold text-slate-800 dark:text-white line-clamp-1">
                                            {top3[1].name}
                                            {isAdmin && <span className="block text-xs font-normal text-slate-400 mt-0.5">{top3[1].className}</span>}
                                        </p>
                                        {/* Nota y luego el mensaje único debajo */}
                                        <p className="text-2xl font-black text-slate-500 mt-1">{top3[1].average.toFixed(2)}</p>
                                        <p className="text-[10px] italic text-slate-400 mt-2 px-2 leading-tight">"{generateUniqueFeedback(top3[1].name, top3[1].average)}"</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {top3[0] && (
                            <div className="order-1 md:order-2 animate-fade-in-up">
                                <div className="flex flex-col items-center">
                                    <div className="relative mb-6 scale-125 group">
                                        <div className="w-24 h-24 rounded-full bg-amber-50 border-4 border-amber-400 overflow-hidden shadow-2xl group-hover:scale-110 transition-transform ring-4 ring-amber-400/20">
                                            <img src={`https://ui-avatars.com/api/?name=${top3[0].name}&background=f59e0b&color=fff`} alt="" />
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-xl ring-2 ring-white">1°</div>
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl animate-bounce">👑</div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-8 rounded-t-3xl shadow-2xl border-x border-t border-indigo-100 dark:border-indigo-900/30 w-full text-center min-h-[200px] flex flex-col justify-center ring-1 ring-indigo-50 dark:ring-indigo-900/20">
                                        <p className="font-black text-xl text-slate-800 dark:text-white line-clamp-1">
                                            {top3[0].name}
                                            {isAdmin && <span className="block text-sm font-normal text-slate-400 mt-1">{top3[0].className}</span>}
                                        </p>
                                        {/* Nota y luego el mensaje único debajo */}
                                        <p className="text-4xl font-black text-amber-500 mt-2 drop-shadow-sm">{top3[0].average.toFixed(2)}</p>
                                        <p className="text-xs italic font-medium text-indigo-400 mt-3 px-4 leading-snug">"{generateUniqueFeedback(top3[0].name, top3[0].average)}"</p>
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-4">Puntaje Superior</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {top3[2] && (
                            <div className="order-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                <div className="flex flex-col items-center">
                                    <div className="relative mb-4 group">
                                        <div className="w-24 h-24 rounded-full bg-orange-50 border-4 border-orange-300 dark:bg-orange-900/20 dark:border-orange-800 overflow-hidden shadow-xl group-hover:scale-110 transition-transform">
                                            <img src={`https://ui-avatars.com/api/?name=${top3[2].name}&background=f97316&color=fff`} alt="" />
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-400 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">3°</div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-t-3xl shadow-xl border-x border-t border-slate-100 dark:border-slate-800 w-full text-center min-h-[150px] flex flex-col justify-center">
                                        <p className="font-bold text-slate-800 dark:text-white line-clamp-1">
                                            {top3[2].name}
                                            {isAdmin && <span className="block text-xs font-normal text-slate-400 mt-0.5">{top3[2].className}</span>}
                                        </p>
                                        {/* Nota y luego el mensaje único debajo */}
                                        <p className="text-2xl font-black text-orange-500 mt-1">{top3[2].average.toFixed(2)}</p>
                                        <p className="text-[10px] italic text-slate-400 mt-2 px-2 leading-tight">"{generateUniqueFeedback(top3[2].name, top3[2].average)}"</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* List of others */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden max-w-4xl mx-auto">
                        <div className="p-6 border-b border-slate-50 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-white">{isStudentOrParent ? 'Lista Completa' : 'Posiciones Adicionales'}</h3>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {(isStudentOrParent ? rankingData : theRest).map((student, idx) => {
                                const position = isStudentOrParent ? idx + 1 : idx + 4;
                                const uniqueMessage = generateUniqueFeedback(student.name, student.average);
                                return (
                                    <div key={student.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <span className="w-8 text-center font-bold text-slate-400 text-sm">{position}</span>
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-xs overflow-hidden">
                                                <img src={`https://ui-avatars.com/api/?name=${student.name}&background=f1f5f9&color=64748b`} alt="" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                                    {student.name}
                                                    {isAdmin && <span className="ml-2 text-xs font-normal text-slate-400">({student.className})</span>}
                                                </p>
                                                {/* Mensaje único debajo del nombre en la lista */}
                                                <p className="text-[10px] text-indigo-500 font-medium italic mt-0.5">"{uniqueMessage}"</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="font-black text-slate-800 dark:text-white min-w-[3rem] text-right">{student.average.toFixed(2)}</span>
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getQualitativeStyles(student.average)}`}>
                                                {student.average >= 4.6 ? 'Superior' : student.average >= 4.0 ? 'Alto' : student.average >= 3.0 ? 'Básico' : 'Bajo'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Sin datos suficientes</h3>
                    <p className="text-slate-500 mt-2">Registra calificaciones en el periodo activo para ver el ranking.</p>
                </div>
            )}
        </div>
    );
};

export default RankingPage;
