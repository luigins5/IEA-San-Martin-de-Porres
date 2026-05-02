
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Student, Grade, Exam, ClassSchedule, Teacher } from '../../types';
import StatCard from '../dashboard/StatCard';
import { AcademicCapIcon, ExamsIcon, ClipboardDocumentListIcon } from '../icons';
import Card from '../ui/Card';
import { useData } from '../../context/DataContext';
import { UpcomingEventsCard } from '../dashboard/DashboardPage';

const ParentDashboard: React.FC<{ setCurrentPage: (page: string) => void }> = ({ setCurrentPage }) => {
    const { user } = useAuth();
    const { students, grades: allGrades, exams: allExams, schedules: allSchedules, teachers } = useData();

    const [student, setStudent] = useState<Student | null>(null);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [schedules, setSchedules] = useState<ClassSchedule[]>([]);

    useEffect(() => {
        if (user && (user as any).studentId) {
            const foundStudent = students.find(s => s.id === (user as any).studentId);
            setStudent(foundStudent || null);
        }
    }, [user, students]);

    useEffect(() => {
        if (!student) return;
        
        setGrades(allGrades.filter(g => g.studentId === student.id));
        setExams(allExams.filter(e => e.campusId === student.campusId));
        setSchedules(allSchedules.filter(s => s.class === student.class && s.section === student.section));
    }, [student, allGrades, allExams, allSchedules]);
    
    // --- Calculations for Stat Cards ---
    const calculateOverallAverage = () => {
        if (grades.length === 0) return "N/A";
        const totalScore = grades.reduce((acc, grade) => acc + (grade.score * (grade.percentage / 100)), 0);
        const totalPercentage = grades.reduce((acc, grade) => acc + grade.percentage, 0);
        if (totalPercentage === 0) return "N/A";
        const average = (totalScore / totalPercentage) * 100 * (5/100);
        return average.toFixed(2);
    };

    const findNextExam = () => {
        const today = new Date().toISOString().split('T')[0];
        const upcomingExams = exams
            .filter(e => e.startDate >= today && e.status === 'Programado')
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        return upcomingExams.length > 0 ? `${upcomingExams[0].title} (${upcomingExams[0].startDate})` : "Ninguno";
    };

    const todaySchedules = schedules
        .filter(s => s.dayOfWeek === new Date().getDay())
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const recentGrades = grades
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
        
    const getTeacherName = (teacherId: string) => teachers.find(t => t.id === teacherId)?.name || 'N/A';

    if (!student) {
        return (
            <div className="text-center py-10">
                <p className="text-text-secondary">Buscando información del estudiante asociado...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-text-primary dark:text-white">Panel de Padre - {student?.name}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={<AcademicCapIcon />} title="Promedio General del Estudiante" value={calculateOverallAverage()} color="#3B82F6" onClick={() => setCurrentPage('parent-grades')} />
                <StatCard icon={<ExamsIcon />} title="Próximo Examen" value={findNextExam()} color="#10B981" onClick={() => setCurrentPage('parent-schedule')} />
                <StatCard icon={<ClipboardDocumentListIcon />} title="Clases Hoy (Hijo/a)" value={String(todaySchedules.length)} color="#F97316" onClick={() => setCurrentPage('parent-schedule')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <h3 className="font-semibold text-base mb-3">Horario de Hoy del Estudiante</h3>
                    {todaySchedules.length > 0 ? (
                        <div className="space-y-2">
                            {todaySchedules.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                                    <div>
                                        <p className="font-semibold text-sm text-primary dark:text-sky-400">{s.startTime} - {s.endTime}</p>
                                        <p className="font-bold text-sm text-text-primary dark:text-white">{s.subject}</p>
                                    </div>
                                    <p className="text-xs text-text-secondary dark:text-slate-400">{getTeacherName(s.teacherId)}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center py-4 text-sm text-text-secondary">No hay clases programadas para hoy.</p>
                    )}
                </Card>
                <div className="space-y-6">
                    <UpcomingEventsCard />
                    <Card>
                        <h3 className="font-semibold text-base mb-3">Calificaciones Recientes</h3>
                        {recentGrades.length > 0 ? (
                            <ul className="space-y-2">
                            {recentGrades.map(grade => (
                                <li key={grade.id} className="flex justify-between items-center pb-2 border-b last:border-0 dark:border-slate-700">
                                    <div>
                                        <p className="font-semibold text-sm text-text-primary dark:text-white">{grade.subject}</p>
                                        <p className="text-xs text-text-secondary dark:text-slate-400">{grade.assignmentTitle}</p>
                                    </div>
                                    <span className="font-bold text-base text-primary">{grade.score.toFixed(1)}</span>
                                </li>
                            ))}
                            </ul>
                        ) : (
                            <p className="text-center py-4 text-sm text-text-secondary">No hay calificaciones recientes.</p>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ParentDashboard;
