import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Student, Grade } from '../../types';
import Card from '../ui/Card';
import { useData } from '../../context/DataContext';

const ParentGradesPage: React.FC = () => {
    const { user } = useAuth();
    const { students, grades: allGrades } = useData();
    const [student, setStudent] = useState<Student | null>(null);

    useEffect(() => {
        if (user && (user as any).studentId) {
            const found = students.find(s => s.id === (user as any).studentId);
            setStudent(found || null);
        }
    }, [user, students]);

    if (!student) return <div className="p-4 text-center">Cargando información del estudiante...</div>;

    const grades = allGrades.filter(g => g.studentId === student.id);

    const gradesBySubject = grades.reduce<Record<string, Grade[]>>((acc, grade) => {
        const subject = grade.subject;
        if (!acc[subject]) {
            acc[subject] = [];
        }
        acc[subject].push(grade);
        return acc;
    }, {});

    const calculateSubjectGrade = (subjectGrades: Grade[]): { grade: number; totalPercentage: number } => {
        const totalPercentage = subjectGrades.reduce((sum, g) => sum + g.percentage, 0);
        const weightedSum = subjectGrades.reduce((sum, g) => sum + (g.score * g.percentage), 0);
        if (totalPercentage === 0) return { grade: 0, totalPercentage: 0 };
        return { grade: weightedSum / totalPercentage, totalPercentage };
    };
    
     const getQualitativeScore = (score: number) => {
        if (score >= 1 && score <= 2.99) return 'Bajo';
        if (score >= 3 && score <= 3.99) return 'Básico';
        if (score >= 4 && score <= 4.59) return 'Alto';
        if (score >= 4.6 && score <= 5) return 'Superior';
        return 'N/A';
    };

    const getScoreColor = (score: number) => {
        if (score >= 1 && score <= 2.99) return 'text-red-600 dark:text-red-400';
        if (score >= 3 && score <= 3.99) return 'text-yellow-600 dark:text-yellow-400';
        if (score >= 4 && score <= 4.59) return 'text-blue-600 dark:text-blue-400';
        if (score >= 4.6 && score <= 5) return 'text-green-600 dark:text-green-400';
        return 'text-gray-500';
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 text-text-primary dark:text-white">Calificaciones de {student.name}</h1>
            {Object.keys(gradesBySubject).length > 0 ? (
                <div className="space-y-4">
                    {Object.keys(gradesBySubject).map(subject => {
                        const subjectGrades = gradesBySubject[subject];
                        const { grade, totalPercentage } = calculateSubjectGrade(subjectGrades);
                        return (
                        <Card key={subject}>
                            <div className="flex justify-between items-center mb-3 pb-3 border-b dark:border-slate-700">
                                <h2 className="text-lg font-bold text-text-primary dark:text-white">{subject}</h2>
                                <div className="text-right">
                                    <p className="text-xs text-text-secondary dark:text-slate-400">Nota Final</p>
                                    <p className={`text-xl font-bold ${getScoreColor(grade)}`}>{grade.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">({totalPercentage}% completado)</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="text-left text-text-secondary dark:text-slate-400">
                                        <tr>
                                            <th className="py-2 px-2 font-semibold">Actividad</th>
                                            <th className="py-2 px-2 font-semibold">Nota</th>
                                            <th className="py-2 px-2 font-semibold">Porcentaje</th>
                                            <th className="py-2 px-2 font-semibold">Comentarios</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subjectGrades.map(g => (
                                            <tr key={g.id} className="border-t dark:border-slate-700">
                                                <td className="py-2 px-2">{g.assignmentTitle}</td>
                                                <td className={`py-2 px-2 font-bold ${getScoreColor(g.score)}`}>{g.score.toFixed(1)} <span className="text-xs font-normal text-gray-500">({getQualitativeScore(g.score)})</span></td>
                                                <td className="py-2 px-2">{g.percentage}%</td>
                                                <td className="py-2 px-2 text-gray-600 dark:text-slate-400 italic">{g.comments || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )})}
                </div>
            ) : (
                <Card className="text-center py-10">
                    <p className="text-sm text-text-secondary">Aún no hay calificaciones registradas para este estudiante.</p>
                </Card>
            )}
        </div>
    );
};

export default ParentGradesPage;