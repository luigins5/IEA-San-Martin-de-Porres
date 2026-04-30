import React, { useState, useMemo } from 'react';
import { Grade, Student } from '../../types';
import Card from '../ui/Card';
import { GoogleGenAI } from '@google/genai';

export const conceptsCSV = `id,code,text
1,EXC,Excelente desempeño académico
2,BUE,Buen desempeño, con áreas de mejora
3,REG,Desempeño regular, requiere más esfuerzo
4,DEF,Desempeño deficiente, riesgo académico
5,COM,Participación constante en clase
6,TAR,Llegadas tardías frecuentes
7,INC,Incumplimiento de tareas`;

export const getPeriodFromDate = (dateString: string, numberOfPeriods: number): number => {
    if (!dateString) return 1;
    let month: number;
    if (dateString.includes('-')) {
        month = parseInt(dateString.split('-')[1], 10);
    } else {
        month = new Date(dateString).getMonth() + 1;
    }
    
    if (numberOfPeriods === 4) {
        if (month <= 3) return 1;
        if (month <= 6) return 2;
        if (month <= 9) return 3;
        return 4;
    } else if (numberOfPeriods === 3) {
        if (month <= 4) return 1;
        if (month <= 8) return 2;
        return 3;
    } else if (numberOfPeriods === 2) {
        if (month <= 6) return 1;
        return 2;
    }
    return 1;
};

export const GradesManagementModal: React.FC<any> = ({ student, grades, onClose, onSaveGrade, onDeleteGrade, teacherSubjects, concepts, activePeriod, numberOfPeriods, isPeriodLocked }) => {
    const [score, setScore] = useState<number | ''>('');
    const [percentage, setPercentage] = useState<number | ''>('');
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [comments, setComments] = useState('');
    const [conceptCode, setConceptCode] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingGrade, setEditingGrade] = useState<Grade | null>(null);

    const handleGenerateComment = async () => {
        if (!score || !assignmentTitle) return;
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'dummy' });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Genera un comentario corto, constructivo y profesional dirigido a los padres de un estudiante que obtuvo una nota de ${score} en la actividad "${assignmentTitle}". Máximo 2 oraciones.`
            });
            if (response.text) {
                setComments(response.text);
            }
        } catch (error) {
            console.error("Error generating comment", error);
            setComments("Nota asignada. " + (Number(score) >= 3 ? "Buen trabajo." : "Se recomienda repasar los conceptos."));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEdit = (g: Grade) => {
        setEditingGrade(g);
        setScore(g.score);
        setPercentage(g.percentage);
        setAssignmentTitle(g.assignmentTitle);
        setComments(g.comments || '');
        setConceptCode(g.conceptCode || '');
    };

    const handleSave = () => {
        if (score === '' || percentage === '' || !assignmentTitle) {
            alert('Por favor complete Actividad, Nota y Porcentaje.');
            return;
        }
        onSaveGrade({
            id: editingGrade?.id,
            studentId: student.id,
            subject: teacherSubjects[0] || 'General',
            class: student.class,
            assignmentTitle,
            score: Number(score),
            percentage: Number(percentage),
            date: editingGrade?.date || new Date().toISOString().split('T')[0],
            comments,
            conceptCode,
            period: activePeriod // explicitly set period for proper filtering
        });
        
        // Reset
        setEditingGrade(null);
        setScore('');
        setPercentage('');
        setAssignmentTitle('');
        setComments('');
        setConceptCode('');
    };

    const cancelEdit = () => {
        setEditingGrade(null);
        setScore('');
        setPercentage('');
        setAssignmentTitle('');
        setComments('');
        setConceptCode('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4 overflow-y-auto">
            <Card className="w-full max-w-4xl bg-white p-6 dark:bg-slate-800 my-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold dark:text-white">
                        Calificaciones: {student.name} ({student.class})
                    </h3>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">
                            Periodo {activePeriod}
                        </span>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg dark:bg-slate-700/50">
                        <h4 className="font-bold mb-4 dark:text-white">{editingGrade ? 'Editar Calificación' : 'Nueva Calificación'}</h4>
                        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Actividad *</label>
                                <input type="text" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} disabled={isPeriodLocked} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required placeholder="Ej: Examen Parcial" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Nota *</label>
                                    <input type="number" min="0" max="5" step="0.1" value={score} onChange={e => setScore(e.target.value === '' ? '' : Number(e.target.value))} disabled={isPeriodLocked} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required placeholder="0.0 - 5.0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Porcentaje (%) *</label>
                                    <input type="number" min="1" max="100" value={percentage} onChange={e => setPercentage(e.target.value === '' ? '' : Number(e.target.value))} disabled={isPeriodLocked} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required placeholder="Ej: 20" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Concepto (Opcional)</label>
                                <select value={conceptCode} onChange={e => setConceptCode(e.target.value)} disabled={isPeriodLocked} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                    <option value="">Seleccione un concepto...</option>
                                    {concepts.map((c: any) => (
                                        <option key={c.id || c.code} value={c.code}>{c.code} - {c.text}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 flex justify-between items-center dark:text-gray-300">
                                    <span>Comentario al Acudiente (Opcional)</span>
                                    {!isPeriodLocked && (
                                        <button type="button" onClick={handleGenerateComment} disabled={isGenerating || !score || !assignmentTitle} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 disabled:opacity-50 transition-colors">
                                            {isGenerating ? 'Generando...' : '✨ Sugerir con IA'}
                                        </button>
                                    )}
                                </label>
                                <textarea value={comments} onChange={e => setComments(e.target.value)} disabled={isPeriodLocked} rows={3} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Observaciones para el boletín..." />
                            </div>
                            
                            {!isPeriodLocked && (
                                <div className="flex gap-2 pt-2">
                                    <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                                        {editingGrade ? 'Actualizar Nota' : 'Guardar Nota'}
                                    </button>
                                    {editingGrade && (
                                        <button type="button" onClick={cancelEdit} className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-semibold hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            )}
                            {isPeriodLocked && (
                                <div className="p-3 bg-red-100 text-red-800 rounded text-sm font-semibold flex items-center dark:bg-red-900/50 dark:text-red-200">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    El periodo actual está bloqueado. Contacte a coordinación.
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="bg-white border rounded-lg p-4 flex flex-col h-full max-h-[500px] dark:bg-slate-800 dark:border-slate-700">
                        <h4 className="font-bold mb-4 dark:text-white flex justify-between items-center">
                            <span>Resumen del Periodo {activePeriod}</span>
                            <span className="text-sm font-normal text-gray-500">Asignatura: {teacherSubjects[0] || 'General'}</span>
                        </h4>
                        
                        {grades.length === 0 ? (
                            <div className="text-center text-gray-500 py-8 flex flex-col items-center justify-center h-full">
                                <svg className="w-12 h-12 mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                <p>No hay notas registradas</p>
                            </div>
                        ) : (
                            <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                                {grades.map((g: Grade) => (
                                    <div key={g.id} className={`border rounded-lg p-3 transition-colors ${editingGrade?.id === g.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 hover:border-gray-300 dark:bg-slate-700 dark:border-slate-600'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h5 className="font-bold text-gray-800 dark:text-white leading-tight">{g.assignmentTitle}</h5>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {new Date(g.date).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-baseline gap-2">
                                                    <span className={`text-lg font-bold ${g.score >= 3 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {g.score.toFixed(1)}
                                                    </span>
                                                    <span className="text-sm font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded dark:bg-gray-600 dark:text-gray-300">
                                                        {g.percentage}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {(g.comments || g.conceptCode) && (
                                            <div className="mt-2 pt-2 border-t text-sm dark:border-slate-600">
                                                {g.conceptCode && <div className="text-indigo-600 mb-1 dark:text-indigo-400 pb-1"><strong>Concepto:</strong> {g.conceptCode}</div>}
                                                {g.comments && <div className="text-gray-600 italic dark:text-gray-300 pb-1">"{g.comments}"</div>}
                                            </div>
                                        )}
                                        
                                        {!isPeriodLocked && (
                                           <div className="flex justify-end gap-3 mt-2 pt-2 border-t dark:border-slate-600">
                                               <button onClick={() => handleEdit(g)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold dark:text-blue-400">Editar</button>
                                               <button onClick={() => { if(window.confirm('¿Eliminar esta calificación?')) onDeleteGrade(g.id) }} className="text-red-600 hover:text-red-800 text-sm font-semibold dark:text-red-400">Eliminar</button>
                                           </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {grades.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Porcentaje Total Asignado:</span>
                                    <span className={`font-bold ${grades.reduce((a:number,b:Grade) => a + b.percentage, 0) > 100 ? 'text-red-500' : grades.reduce((a:number,b:Grade) => a + b.percentage, 0) === 100 ? 'text-green-600' : 'text-orange-500'}`}>
                                        {grades.reduce((a:number,b:Grade) => a + b.percentage, 0)}%
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export const BulkUploadGradesModal: React.FC<any> = ({ onClose, onSave, myStudents, teacherSubjects, allGrades, isPeriodLocked, activePeriod }) => {
    const [csvData, setCsvData] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleProcess = () => {
        if (!csvData.trim()) return;
        if (isPeriodLocked) {
            alert('El periodo está bloqueado.');
            return;
        }
        setIsProcessing(true);
        try {
            const rows = csvData.trim().split('\n');
            const newGrades: any[] = [];
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].split(',').map(s => s.trim());
                if (row.length < 4) continue;
                
                const studentName = row[0];
                const assignmentTitle = row[1];
                const score = parseFloat(row[2]);
                const percentage = parseFloat(row[3]);
                
                if (!studentName || !assignmentTitle || isNaN(score) || isNaN(percentage)) continue;
                
                // Find student by checking if full name includes the typed name
                const student = myStudents.find((s: any) => s.name.toLowerCase().includes(studentName.toLowerCase()));
                if (!student) {
                    console.warn(`Estudiante no encontrado: ${studentName}`);
                    continue;
                }

                newGrades.push({
                    studentId: student.id,
                    subject: teacherSubjects[0] || 'General',
                    class: student.class,
                    assignmentTitle,
                    score,
                    percentage,
                    date: new Date().toISOString().split('T')[0],
                    comments: row[4] || 'Carga masiva',
                    conceptCode: row[5] || '',
                    period: activePeriod || 1
                });
            }
            
            if (newGrades.length === 0) {
                alert('No se encontraron calificaciones válidas para importar. Revise el formato.');
                setIsProcessing(false);
                return;
            }
            
            onSave(newGrades);
        } catch (error) {
            console.error('Error al procesar CSV', error);
            alert('Error inesperado al procesar el texto.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <Card className="w-full max-w-3xl bg-white p-6 dark:bg-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold dark:text-white">Carga Masiva de Calificaciones</h3>
                    <button onClick={onClose} className="dark:text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Pegue los datos desde Excel o Google Sheets. La primera fila debe ser el encabezado.
                    </p>
                    <p className="text-xs font-mono bg-gray-100 p-2 rounded dark:bg-slate-700 dark:text-gray-300 mb-4">
                        Formato: NombreEstudiante, Actividad, Nota, Porcentaje, ComentarioOpcional, ConceptoOpcional
                    </p>
                    <textarea 
                        className="w-full h-48 p-3 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white font-mono text-sm"
                        placeholder="EstudianteEjemplo, Examen Final, 4.5, 30, Excelente trabajo, EXC\n..."
                        value={csvData}
                        onChange={(e) => setCsvData(e.target.value)}
                        disabled={isProcessing || isPeriodLocked}
                    ></textarea>
                </div>
                
                <div className="flex justify-between items-center">
                    <button onClick={() => {
                        const headers = "Estudiante,Actividad,Nota,Porcentaje,Comentario,Concepto\n";
                        const blob = new Blob([headers], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'plantilla_notas.csv';
                        a.click();
                        window.URL.revokeObjectURL(url);
                    }} className="text-blue-600 hover:text-blue-800 text-sm font-semibold dark:text-blue-400">
                        Descargar Plantilla CSV
                    </button>
                    
                    <div className="flex gap-2">
                        <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-semibold hover:bg-gray-300 transition dark:bg-gray-700 dark:text-gray-200">Cancelar</button>
                        <button 
                            onClick={handleProcess} 
                            disabled={isProcessing || !csvData.trim() || isPeriodLocked} 
                            className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {isProcessing ? 'Procesando...' : 'Importar Calificaciones'}
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

const GradesPage: React.FC = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4 dark:text-white">Gestión Global de Calificaciones</h1>
            <p className="text-gray-600 dark:text-gray-300">
                Esta sección ha sido rediseñada. Administre las calificaciones directamente desde la sección "Mis Estudiantes" haciendo clic en el botón de notas junto a cada alumno de sus respectivas clases.
            </p>
        </div>
    );
};

export default GradesPage;
