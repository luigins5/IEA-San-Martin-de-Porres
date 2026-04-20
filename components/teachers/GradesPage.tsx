import React, { useState } from 'react';
import { Grade, Student } from '../../types';
import Card from '../ui/Card';
import { GoogleGenAI } from '@google/genai';

export const getPeriodFromDate = (dateString: string, numberOfPeriods: number): number => {
    const date = new Date(dateString);
    const month = date.getMonth();
    if (numberOfPeriods === 4) {
        if (month < 3) return 1;
        if (month < 6) return 2;
        if (month < 9) return 3;
        return 4;
    } else if (numberOfPeriods === 3) {
        if (month < 4) return 1;
        if (month < 8) return 2;
        return 3;
    } else if (numberOfPeriods === 2) {
        if (month < 6) return 1;
        return 2;
    }
    return 1;
};

export const GradesManagementModal: React.FC<any> = ({ student, grades, onClose, onSaveGrade, onDeleteGrade, teacherSubjects, concepts, activePeriod, numberOfPeriods, isPeriodLocked }) => {
    const [score, setScore] = useState<number | ''>('');
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [comments, setComments] = useState('');
    const [conceptCode, setConceptCode] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateComment = async () => {
        if (!score || !assignmentTitle) return;
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'dummy' });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Genera un comentario corto y profesional para un estudiante que obtuvo una nota de ${score} en la actividad "${assignmentTitle}".`
            });
            if (response.text) {
                setComments(response.text);
            }
        } catch (error) {
            console.error("Error generating comment", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        if (score === '' || !assignmentTitle) return;
        onSaveGrade({
            studentId: student.id,
            subject: teacherSubjects[0] || 'General',
            class: student.class,
            assignmentTitle,
            score: Number(score),
            percentage: 100,
            date: new Date().toISOString().split('T')[0],
            comments,
            conceptCode
        });
        setScore('');
        setAssignmentTitle('');
        setComments('');
        setConceptCode('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <Card className="w-full max-w-2xl bg-white p-6 dark:bg-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold dark:text-white">Notas de {student.name}</h3>
                    <button onClick={onClose} className="dark:text-white">&times;</button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Actividad</label>
                        <input type="text" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Nota</label>
                        <input type="number" min="0" max="5" step="0.1" value={score} onChange={e => setScore(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Concepto</label>
                        <select value={conceptCode} onChange={e => setConceptCode(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                            <option value="">Seleccione un concepto...</option>
                            {concepts.map((c: any) => (
                                <option key={c.code} value={c.code}>{c.code} - {c.text}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Comentario</label>
                        <div className="flex gap-2">
                            <textarea value={comments} onChange={e => setComments(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                            <button onClick={handleGenerateComment} disabled={isGenerating || !score || !assignmentTitle} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
                                {isGenerating ? '...' : 'IA'}
                            </button>
                        </div>
                    </div>
                    <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded w-full">Guardar Nota</button>
                </div>

                <div className="mt-6">
                    <h4 className="font-bold mb-2 dark:text-white">Historial de Notas</h4>
                    <ul className="space-y-2">
                        {grades.map((g: Grade) => (
                            <li key={g.id} className="flex justify-between items-center bg-gray-50 p-2 rounded dark:bg-slate-700 dark:text-white">
                                <div>
                                    <span className="font-bold">{g.assignmentTitle}</span> - {g.score}
                                    {g.conceptCode && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{concepts.find((c: any) => c.code === g.conceptCode)?.text || g.conceptCode}</div>}
                                </div>
                                <button onClick={() => onDeleteGrade(g.id)} className="text-red-500 text-sm">Eliminar</button>
                            </li>
                        ))}
                    </ul>
                </div>
            </Card>
        </div>
    );
};

export const BulkUploadGradesModal: React.FC<any> = ({ onClose, onSave, myStudents, teacherSubjects, allGrades, isPeriodLocked }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <Card className="w-full max-w-2xl bg-white p-6 dark:bg-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold dark:text-white">Carga Masiva</h3>
                    <button onClick={onClose} className="dark:text-white">&times;</button>
                </div>
                <p className="dark:text-gray-300">Funcionalidad de carga masiva simplificada.</p>
            </Card>
        </div>
    );
};

const GradesPage: React.FC = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">Calificaciones</h1>
            <p>Sección eliminada.</p>
        </div>
    );
};

export default GradesPage;
