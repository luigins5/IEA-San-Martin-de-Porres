
import React, { useState, useEffect, useMemo } from 'react';
import { Student, Grade, Teacher, TeacherCourseAssignment } from '../../types';
import Card from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DownloadIcon, UploadIcon, PlusIcon, EditIcon, TrashIcon } from '../icons';
import { useData } from '../../context/DataContext';

// Components and utilities are now exported from here to be used by other components like MyStudentsPage.

export const getPeriodFromDate = (dateString: string, numberOfPeriods = 4): number => {
    if (!dateString || !dateString.includes('-')) return 1;
    const month = parseInt(dateString.split('-')[1], 10); // 1-12

    switch (numberOfPeriods) {
        case 1:
            return 1;
        case 2: // Semesters
            return month <= 6 ? 1 : 2;
        case 3: // Trimesters
            if (month <= 4) return 1;
            if (month <= 8) return 2;
            return 3;
        case 5: // 5 periods
            if (month <= 2) return 1; // Jan, Feb
            if (month <= 4) return 2; // Mar, Apr
            if (month <= 7) return 3; // May, Jun, Jul
            if (month <= 9) return 4; // Aug, Sep
            return 5; // Oct, Nov, Dec
        case 4: // Bimesters (and default)
        default:
            if (month <= 3) return 1;
            if (month <= 6) return 2;
            if (month <= 9) return 3;
            return 4;
    }
};

export const conceptsCSV = `Concepto;codigo
(S). Demuestra calidad y compromiso en la presentación y elaboración de sus trabajos, se motiva por el conocimiento y cumplimiento de sus deberes. Felicitaciones.;C001
(B). Demuestra dificultad en el desarrollo de trabajos prácticos y poco valora la importancia de las diferentes actividades artísticas, le falta más compromiso por realizar sus actividades y entregarlas a tiempo.;C002
Su desempeño es bajo (2) por que no estudia, fomenta indisciplina, cuaderno desordenado, no escribe ni lee correctamente.;C003
Su desempeño es básico, (3) procure estudiar con mas interés.;C004
Su desempeño es alto (4) pero puede mejorar.;C005
Felicitaciones su desempeño es superior (5) ya que estudia mas de la cuenta, investiga y produce conocimiento, su bitácora o cuaderno de apuntes es el reflejo de su estudio.;C006
(S) Presenta actitudes y comportamientos excelentes en clase de informática. Con su grupo y en los espacios donde interactúa. Colabora con sus compañeros cuando tienen dificultades y en el desarrollo de la clase.;C007
(S) Desarrolla trabajos y actividades de informática de la mejor manera y en el tiempo establecido .;C008
(B) Algunas veces intenta desarrollar trabajos y actividades de informática de la mejor manera y en el tiempo establecido.;C009
(S) Demuestra habilidades y buen comportamiento en el desarrollo de las diferentes actividades deportivas.;C010
(S) Su actitud frente a las diferentes actividades teóricas y prácticas de la Educación Física son de gran valor y aceptación.;C011
(S) Participa con interés y se integra con facilidad al grupo y demuestra un comportamiento y respeto ejemplar hacia los demás;C012
(S) Práctica el deporte con eficiencia e interés manteniendo su disciplina y buenas relaciones con sus compañeros.;C013
(S) Su desempeño en actividades físicas y deportivas son excelentes demuestra cada vez el deseo de superación.;C014
(S) Presenta buenas actividades frente al trabajo grupal y se interesa por el desarrollo de la clase de educación física.;C015
(A) Muestra afición por las actividades recreativas y deportivas, debe aprovechar más sus aptitudes y lograr un mejor desempeño.;C016
(A) Su actitud por mejorar y superar sus habilidades deportivas son cada vez mejor ya que cada día demuestra valores y gustos por la clase.;C017
(A) Su interés y desempeño están en el cumplimiento puntual de su uniforme y ejecución correcta de los diferentes ejercicios.;C018
(B) Debe mejorar su interés y desempeño en las actividades del área, cumpliendo con su uniforme y disciplina en clase.;C019
(B) Presenta dificultad en la práctica de las diferentes actividades recreativas y deportivas, debe presentar mejor atención e interés por las diferentes actividades.;C020
(B) Actúa con desinterés a pesar de que posee buenas capacidades pero no las aprovecha para así superar las dificultades y mejor integración con el grupo.;C021
(B) Debe cambiar su actitud participando con mayor interés por el área, he integrarse con más confianza frente al grupo.;C022
(B) La ejecución de las actividades recreativas y deportivas las realiza con algún grado de desinterés.;C023
(B) Comprende los aspectos teóricos sobre la organización deportiva y las aplica adecuadamente, debe mejorar su disciplina.;C024
(b) Demuestra apatía y desinterés por las actividades recreativas y deportivas, no tiene voluntad en el cumplimiento a pesar de tener buenas cualidades.;C025
Respeta los turnos en las actividades de juego y trabajo.;C026
Demuestra respeto por las personas que trabajan dentro de la institución.;C027
Le agrada el trabajo en grupo.;C028
Identifica las normas de higiene personal y participa en jornadas de orden y aseo de la institución y salón de clases.;C029
Se adaptó con facilidad a la institución y cumple con sus deberes escolares.;C030
Establece buenas relaciones de amistad y compañerismo en el desarrollo de las actividades escolares.;C031
Participa, se integra y coopera en juegos y actividades grupales que les permiten reafirmar su yo.;C032
Es responsable en la realización de actividades escolares.;C033
PARTICIPA APORTANDO COMENTARIOS REFLEXIVOS ACORDES CON EL TEMA;C034
DEMUESTRA INTERES POR LA ASIGNATURA;C035
SE PREOCUPA POR APRENDER Y ACLARAR DUDAS RELACIONADAS CON EL COMPORTAMIENTO HUMANO;C036
TIENE UNA ACTITUD CRITICA Y REFLEXIVA RESPECTO AL ENTORNO SOCIAL;C037
SU INDISCIPLINA ESCOLAR HACE QUE SU RENDIMIENTO SE VEA DESMEJORADO;C038
DESATIENDE EXPLICACIONES Y EXPOSICIONES;C039
Felicitaciones por su comportamiento.;C040
Con su comportamiento es un ejemplo a seguir.;C041
Mantenga su espíritu de responsabilidad. Felicitaciones.;C042
El compromiso asumido en este período, fue muy importante, tanto para usted como para la Institución.;C043
Sus cualidades hacen que cada día sea mejor. Puede ser superior.;C044
En responsabilidad podemos alcanzar un mejor nivel.;C045
Se le tiene en cuenta el comportamiento en este período, con miras a ser mejor.;C046
Se espera un mayor compromiso en cuanto a su comportamiento.;C047
Si pone de su parte, puede mejorar.;C048
No presta cuidado a los llamados de atención, realizados por el profesor.;C049
Debe poner más de su parte para mejorar.;C050
Se le recuerda que no está acatando el compromiso con la Institución. Debe cambiar de actitud.;C051
Debe poner de su parte y apoyo de sus padres para mejorar su comportamiento.;C052
El estudiante debe asumir su compromiso, de lo contrario, se debe atener al debido proceso.;C053
Realiza con facilidad descripciones orales claras y coherentes a cerca de eventos, lugares, seres y objetos.;C054
Realiza con cierta facilidad descripciones orales claras y coherentes a cerca de eventos, lugares, seres y objetos.;C055
Tiene dificultad par realiza descripciones orales a cerca de eventos, lugares, seres y objetos.;C056
Desarrolla gran facilidad de redacción y análisis en temas descriptivos y narrativos.;C057
Tiene dificultad en redactar ensayos sobre temas de su preferencia usando correctamente la gramática.;C058
Da cuenta en forma acertada de la estructura, intención y estrategias textuales particulares, presentes en diferentes tipos de textos y actos comunicativos.;C059
Presenta dificultades para reconocer el lenguaje como medio de organización del pensamiento, comprensión e interpretación del mundo.;C060
No da cuenta de la estructura, intención y estrategias textuales particulares, presentes en diferentes tipos de textos y actos comunicativos.;C061
Desarrolla muy bien sus habilidades y destrezas de lectura y producción de textos.;C062
Desarrolla sus habilidades y destrezas de lectura y producción de textos.;C063
Debe mejorar en la presentación de argumentos válidos y críticos para distintos contextos.;C064
Identifica las consecuencias de la contaminación ambiental y propone soluciones a este problema.;C065
Demuestra interés por saber de qué se ocupa la geografía.;C066
Participa con liderazgo en las actividades curriculares y extracurriculares.;C067
Identifica y tiene en cuenta los diversos aspectos que hacen parte de los fenómenos que estudia (ubicación geográfica, evaluación histórica, organización política, económica, social, cultural).;C068
Maneja con excelencia la temática;C069`;


// MODALS
export const GradeFormModal: React.FC<{
    student: Student;
    gradeToEdit: Grade | null;
    teacherSubjects: string[];
    onClose: () => void;
    onSave: (grade: Omit<Grade, 'id'> & {id?: string}) => void;
    concepts: { code: string; text: string }[];
}> = ({ student, gradeToEdit, teacherSubjects, onClose, onSave, concepts }) => {
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [subject, setSubject] = useState(teacherSubjects[0] || '');
    const [score, setScore] = useState<number | ''>(5);
    const [percentage, setPercentage] = useState<number | ''>(10);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [comments, setComments] = useState('');
    const [conceptCode, setConceptCode] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (gradeToEdit) {
            setAssignmentTitle(gradeToEdit.assignmentTitle);
            setSubject(gradeToEdit.subject);
            setScore(gradeToEdit.score);
            setPercentage(gradeToEdit.percentage);
            setDate(gradeToEdit.date);
            setComments(gradeToEdit.comments || '');
            setConceptCode(gradeToEdit.conceptCode || '');
        }
    }, [gradeToEdit]);

    const handleGenerateComment = async () => {
        if (!score) return;
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Genera un comentario breve (máximo 15 palabras) para un estudiante con una calificación de ${score} de 5 en la actividad "${assignmentTitle}" de la materia ${subject}. El comentario debe ser constructivo y apropiado para un entorno escolar.`;
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const text = response.text;
            if (text) {
                setComments(text.trim());
            }
        } catch (error) {
            console.error("Error generating comment:", error);
            setComments("No se pudo generar el comentario.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (score === '' || percentage === '') return;

        const formData = {
            studentId: student.id,
            class: student.class,
            subject,
            assignmentTitle,
            score: Number(score),
            percentage: Number(percentage),
            date,
            comments,
            conceptCode,
        };

        if (gradeToEdit) {
            onSave({ ...gradeToEdit, ...formData });
        } else {
            onSave(formData);
        }
        
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">{gradeToEdit ? 'Editar Calificación' : 'Añadir Calificación'} para {student.name}</h2>
                <form onSubmit={handleSubmit} className="space-y-3 text-sm">
                    <input type="text" placeholder="Título de la actividad" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:text-white" required/>
                    <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:text-white" required>
                        {teacherSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder="Nota (0-5)" min="0" max="5" step="0.1" value={score} onChange={e => setScore(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:text-white" required />
                        <input type="number" placeholder="Porcentaje (%)" min="1" max="100" value={percentage} onChange={e => setPercentage(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:text-white" required />
                    </div>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:text-white" required />
                    <textarea placeholder="Comentarios (opcional)" value={comments} onChange={e => setComments(e.target.value)} rows={2} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:text-white"></textarea>
                    <button type="button" onClick={handleGenerateComment} disabled={isGenerating} className="text-xs text-primary hover:underline disabled:text-gray-400">{isGenerating ? 'Generando...' : 'Generar comentario con IA'}</button>
                    <div>
                        <label htmlFor="conceptCode" className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Concepto Predefinido (Opcional)</label>
                        <select id="conceptCode" value={conceptCode} onChange={e => setConceptCode(e.target.value)} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:text-white text-xs">
                            <option value="">Seleccione por código o descripción</option>
                            {concepts.map(c => (
                                <option key={c.code} value={c.code}>
                                    [{c.code}] {c.text.substring(0, 90)}{c.text.length > 90 ? '...' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-3 border-t dark:border-gray-600">
                        <button type="button" onClick={onClose} className="bg-gray-200 font-bold py-2 px-3 text-sm rounded">Cancelar</button>
                        <button type="submit" className="bg-primary text-white font-bold py-2 px-3 text-sm rounded">Guardar</button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export const GradesManagementModal: React.FC<{
    student: Student;
    grades: Grade[];
    onClose: () => void;
    onSaveGrade: (grade: Omit<Grade, 'id'> & {id?: string}) => void;
    onDeleteGrade: (gradeId: string) => void;
    teacherSubjects: string[];
    concepts: {code: string, text: string}[];
    activePeriod: number;
    numberOfPeriods?: number;
    isPeriodLocked: boolean;
}> = ({ student, grades, onClose, onSaveGrade, onDeleteGrade, teacherSubjects, concepts, activePeriod, numberOfPeriods = 4, isPeriodLocked }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState<Grade | null>(null);

    const periodGrades = grades.filter(g => getPeriodFromDate(g.date, numberOfPeriods) === activePeriod);
    
    const gradesBySubject = periodGrades.reduce((acc, grade) => {
        if (!acc[grade.subject]) acc[grade.subject] = [];
        acc[grade.subject].push(grade);
        return acc;
    }, {} as Record<string, Grade[]>);

    const handleEdit = (grade: Grade) => {
        setEditingGrade(grade);
        setIsFormOpen(true);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                <Card className="w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-primary">Gestionar Calificaciones: {student.name}</h2>
                        <button onClick={onClose} className="text-gray-500 text-3xl">&times;</button>
                    </div>
                    {isPeriodLocked && (
                        <div className="p-2 mb-3 text-sm text-center bg-yellow-100 text-yellow-800 rounded-md dark:bg-yellow-900/50 dark:text-yellow-300 font-semibold">
                            Este período está cerrado. Las calificaciones son de solo lectura.
                        </div>
                    )}
                    <div className="flex-grow overflow-y-auto pr-2 text-sm">
                        {Object.keys(gradesBySubject).length > 0 ? Object.entries(gradesBySubject).map(([subject, subjectGrades]) => (
                            <div key={subject} className="mb-4">
                                <h3 className="font-bold text-base mb-2 p-2 bg-gray-100 rounded dark:bg-gray-700">{subject}</h3>
                                {(subjectGrades as Grade[]).map(g => (
                                    <div key={g.id} className="grid grid-cols-6 gap-2 items-center p-2 border-b dark:border-gray-600">
                                        <span className="col-span-2">{g.assignmentTitle}</span>
                                        <span className="font-semibold">{g.score.toFixed(1)}</span>
                                        <span>{g.percentage}%</span>
                                        <span className="text-xs text-gray-500 italic col-span-1">{g.comments || 'Sin comentarios'}</span>
                                        <div className="flex gap-2 justify-end">
                                            <button type="button" onClick={() => handleEdit(g)} disabled={isPeriodLocked} className="p-1 text-blue-600 rounded-full hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed"><EditIcon className="w-4 h-4"/></button>
                                            <button type="button" onClick={() => onDeleteGrade(g.id)} disabled={isPeriodLocked} className="p-1 text-red-600 rounded-full hover:bg-red-100 disabled:text-gray-400 disabled:cursor-not-allowed"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )) : <p className="text-center text-text-secondary py-6">No hay calificaciones para este período.</p>}
                    </div>
                    <div className="pt-4 border-t mt-auto dark:border-gray-600 flex justify-between items-center">
                        <button type="button" onClick={() => { setEditingGrade(null); setIsFormOpen(true); }} disabled={isPeriodLocked} className="bg-primary text-white font-bold py-2 px-3 text-sm rounded flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed">
                           <PlusIcon className="w-4 h-4"/> Añadir Actividad
                        </button>
                        <button type="button" onClick={onClose} className="bg-gray-200 font-bold py-2 px-3 text-sm rounded">Cerrar</button>
                    </div>
                </Card>
            </div>
            {isFormOpen && <GradeFormModal student={student} gradeToEdit={editingGrade} teacherSubjects={teacherSubjects} onClose={() => setIsFormOpen(false)} onSave={onSaveGrade} concepts={concepts} />}
        </>
    );
};

interface BulkUploadGradesModalProps {
    onClose: () => void;
    onSave: (newGrades: Omit<Grade, 'id'>[]) => void;
    myStudents: Student[];
    teacherSubjects: string[];
    allGrades: Grade[];
    isPeriodLocked: boolean;
}

export const BulkUploadGradesModal = ({ onClose, onSave, myStudents, teacherSubjects, allGrades, isPeriodLocked }: BulkUploadGradesModalProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<Omit<Grade, 'id'>[]>([]);
    const [errors, setErrors] = useState<{ rowIndex: number, message: string }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDownloadTemplate = () => {
        const headers = "documento_estudiante,titulo_actividad,materia,nota,porcentaje,fecha(YYYY-MM-DD),comentarios";
        const studentExample = myStudents[0] || { documentNumber: '123456789' };
        const subjectExample = teacherSubjects[0] || 'Materia Ejemplo';
        const example1 = `${studentExample.documentNumber},Examen Parcial 1,${subjectExample},4.5,30,2024-03-15,Buen trabajo`;
        const example2 = `${studentExample.documentNumber},Taller en clase,${subjectExample},5.0,10,2024-03-18,Participación destacada`;
        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${example1}\n${example2}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_calificaciones.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            processFile(selectedFile);
        }
    };
    
    const processFile = (fileToProcess: File) => {
        setIsProcessing(true); setParsedData([]); setErrors([]);
        const reader = new FileReader();
        reader.onload = (e) => {
            const target = e.target as FileReader;
            const text = target?.result as string;
            const rows = text.split('\n').map(row => row.trim()).filter(row => row);
            const header = rows[0]?.split(',').map(h => h.trim());
            
            const requiredHeaders = ["documento_estudiante", "titulo_actividad", "materia", "nota", "porcentaje", "fecha(YYYY-MM-DD)"];
            if (!header || !requiredHeaders.every(h => header.includes(h))) {
                setErrors([{ rowIndex: 0, message: `El encabezado es inválido. Debe contener: ${requiredHeaders.join(', ')}` }]);
                setIsProcessing(false); return;
            }

            const studentMap = new Map((myStudents as Student[]).map((s) => [s.documentNumber, s]));
            const validGrades: Omit<Grade, 'id'>[] = [];
            const newErrors: { rowIndex: number, message: string }[] = [];
            
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split(',');
                const rowData: any = {};
                header.forEach((h, index) => { rowData[h] = values[index]?.trim(); });

                const student = studentMap.get(rowData.documento_estudiante);
                if (!student) { newErrors.push({ rowIndex: i, message: `Estudiante con documento ${rowData.documento_estudiante} no encontrado.`}); continue; }
                
                const score = parseFloat(rowData.nota);
                if (isNaN(score) || score < 0 || score > 5) { newErrors.push({ rowIndex: i, message: `Nota '${rowData.nota}' inválida.`}); continue; }
                
                const percentage = parseInt(rowData.porcentaje, 10);
                if (isNaN(percentage) || percentage < 0 || percentage > 100) { newErrors.push({ rowIndex: i, message: `Porcentaje '${rowData.porcentaje}' inválido.`}); continue; }

                if (!teacherSubjects.map(s => s.toLowerCase()).includes(rowData.materia.toLowerCase())) {
                    newErrors.push({ rowIndex: i, message: `Materia '${rowData.materia}' no está en su lista de asignaturas.`}); continue;
                }

                validGrades.push({
                    studentId: student.id,
                    class: student.class,
                    assignmentTitle: rowData.titulo_actividad,
                    subject: rowData.materia,
                    score,
                    percentage,
                    date: rowData['fecha(YYYY-MM-DD)'],
                    comments: rowData.comentarios || '',
                });
            }
            setParsedData(validGrades); setErrors(newErrors); setIsProcessing(false);
        };
        reader.readAsText(fileToProcess);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-3xl h-full max-h-[90vh] flex flex-col">
                 <h2 className="text-xl font-bold mb-4">Carga Masiva de Calificaciones</h2>
                 {isPeriodLocked && (
                    <div className="p-3 mb-4 text-sm text-center bg-yellow-100 text-yellow-800 rounded-md dark:bg-yellow-900/50 dark:text-yellow-300 font-semibold">
                        Este período está cerrado y no se pueden cargar nuevas calificaciones.
                    </div>
                 )}
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <button onClick={handleDownloadTemplate} className="bg-secondary text-primary-text font-bold py-2 px-3 rounded flex items-center justify-center gap-2 dark:text-gray-900"><DownloadIcon className="w-5 h-5"/>Descargar Plantilla</button>
                    <input type="file" accept=".csv" onChange={handleFileChange} disabled={isPeriodLocked} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer dark:file:bg-primary/20 dark:file:text-accent disabled:opacity-50 disabled:cursor-not-allowed" />
                 </div>
                 <div className="flex-grow border-t pt-4 overflow-y-auto dark:border-gray-600">
                    <h3 className="font-bold text-base mb-2">Previsualización y Confirmación</h3>
                    {isProcessing ? <p>Procesando...</p> : (
                         <>
                            {errors.length > 0 && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 dark:bg-red-900/50 dark:text-red-300">
                                    <h4 className="font-bold mb-1">Errores encontrados:</h4>
                                    <ul className="list-disc list-inside text-xs">{errors.slice(0, 5).map(err => <li key={err.rowIndex}>Fila {err.rowIndex + 1}: {err.message}</li>)} {errors.length > 5 && <li>...</li>}</ul>
                                </div>
                            )}
                             {parsedData.length > 0 && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 dark:bg-green-900/50 dark:text-green-300"><h4 className="font-bold">{parsedData.length} calificaciones listas.</h4></div>}
                             {!file && <p className="text-text-secondary text-sm">Suba un archivo para previsualizar.</p>}
                         </>
                    )}
                 </div>
                 <div className="flex justify-end gap-3 mt-auto pt-4 border-t dark:border-gray-600">
                    <button onClick={onClose} className="bg-gray-300 font-bold py-2 px-3 text-sm rounded">Cancelar</button>
                    <button onClick={() => onSave(parsedData)} disabled={parsedData.length === 0 || isProcessing || isPeriodLocked} className="bg-primary text-white font-bold py-2 px-3 text-sm rounded disabled:bg-gray-400">Confirmar Carga</button>
                </div>
            </Card>
        </div>
    );
};


const periodLabels = ["1er Periodo", "2do Periodo", "3er Periodo", "4to Periodo", "5to Periodo"];

const GradesPage: React.FC = () => {
    const { user } = useAuth();
    const { students: allStudents, grades, addGrade, updateGrade, deleteGrade, assignments, globalSettings, campusSettings } = useData();
    
    const [activePeriod, setActivePeriod] = useState<number | null>(null);
    const [existingPeriods, setExistingPeriods] = useState<number[]>([]);
    
    const [concepts, setConcepts] = useState<{ code: string; text: string }[]>([]);
    const [managingStudent, setManagingStudent] = useState<Student | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [numberOfPeriods, setNumberOfPeriods] = useState(4);
    
    // Search and Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');

    useEffect(() => {
        let settings: any = null;
        if (globalSettings) {
            settings = { ...globalSettings };
        }
        
        if (user?.campusId && campusSettings) {
            settings = { ...settings, ...campusSettings };
        }

        if (settings && settings.numberOfPeriods) {
            setNumberOfPeriods(settings.numberOfPeriods);
        }
    }, [user]);

    useEffect(() => {
        const parsed = conceptsCSV
            .split('\n').slice(1).filter(row => row.trim())
            .map(row => {
                const parts = row.split(';');
                const code = parts.pop()?.trim() || '';
                const text = parts.join(';').trim().replace(/^\uFEFF/, '');
                return { code, text };
            }).filter(c => c.code && c.text);
        setConcepts(parsed);
    }, []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Explicitly typed return
    const myStudents = useMemo<Student[]>(() => {
        if (!user) return [];
        
        let filteredStudents: Student[] = [];

        if (user.role === UserRole.SUPER_ADMIN) {
            filteredStudents = allStudents.filter((s: Student) => s.status === 'active');
        } else if (user.role === UserRole.CAMPUS_ADMIN) {
            filteredStudents = allStudents.filter((s: Student) => s.campusId === user.campusId && s.status === 'active');
        } else {
            const teacherAssignments = assignments.filter((a: TeacherCourseAssignment) => a.teacherId === user.id);
            const myClasses = new Set(teacherAssignments.map((a: TeacherCourseAssignment) => `${a.class}-${a.section}`));
            filteredStudents = allStudents.filter((s: Student) => myClasses.has(`${s.class}-${s.section}`) && s.status === 'active');
        }
        
        // Apply search and filters
        filteredStudents = filteredStudents.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.documentNumber.includes(searchQuery);
            const matchesClass = filterClass ? s.class === filterClass : true;
            const matchesSection = filterSection ? s.section === filterSection : true;
            return matchesSearch && matchesClass && matchesSection;
        });
        
        return filteredStudents.sort((a: Student, b: Student) => {
            const partsA = a.name.split(' ');
            const partsB = b.name.split(' ');
            const lastNameA = partsA.length > 1 ? partsA[1] : partsA[0];
            const lastNameB = partsB.length > 1 ? partsB[1] : partsB[0];
            const firstNameA = partsA[0];
            const firstNameB = partsB[0];
            
            const lastNameComparison = lastNameA.localeCompare(lastNameB);
            if (lastNameComparison !== 0) {
                return lastNameComparison;
            }
            return firstNameA.localeCompare(firstNameB);
        });
    }, [user, allStudents, assignments]);

    useEffect(() => {
        const periods = Array.from({ length: numberOfPeriods }, (_, i) => i + 1);
        setExistingPeriods(periods);
        
        if (!activePeriod) {
            const today = new Date().toISOString().split('T')[0];
            const currentPeriod = getPeriodFromDate(today, numberOfPeriods);
            setActivePeriod(currentPeriod);
        }
    }, [numberOfPeriods, activePeriod]);

    const SUBJECTS_LIST = [
        'Matemáticas', 'Español', 'Ciencias Naturales', 'Ciencias Sociales', 
        'Inglés', 'Tecnología e Informática', 'Educación Física', 'Artística', 
        'Ética y Valores', 'Religión', 'Filosofía', 'Química', 'Física', 'Economía'
    ];

    const teacherSubjects = useMemo(() => {
        if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.CAMPUS_ADMIN) {
            return SUBJECTS_LIST;
        }
        const teacher = user as Teacher;
        return [teacher?.subject, teacher?.secondarySubject].filter(Boolean) as string[];
    }, [user]);

    const calculatePeriodAverage = (studentId: string, period: number, numberOfPeriods: number): { grade: number; totalPercentage: number } | null => {
        const studentGradesForPeriod = grades.filter((g: Grade) => g.studentId === studentId && getPeriodFromDate(g.date, numberOfPeriods) === period);
        if (studentGradesForPeriod.length === 0) return null;

        const weightedSumBySubject = studentGradesForPeriod.reduce<Record<string, { totalScore: number; totalPercentage: number }>>((acc, grade) => {
            if (!acc[grade.subject]) {
                acc[grade.subject] = { totalScore: 0, totalPercentage: 0 };
            }
            acc[grade.subject].totalScore += grade.score * (grade.percentage / 100);
            acc[grade.subject].totalPercentage += grade.percentage;
            return acc;
        }, {});

        const subjectAverages: number[] = [];
        Object.values(weightedSumBySubject).forEach(subjectData => {
            if(subjectData.totalPercentage > 0) {
                 const subjectFinal = (subjectData.totalScore / subjectData.totalPercentage) * 100;
                 subjectAverages.push(subjectFinal);
            }
        });
        
        if(subjectAverages.length === 0) return null;
        
        const finalGrade = subjectAverages.reduce((sum, avg) => sum + avg, 0) / subjectAverages.length;

        return { grade: finalGrade, totalPercentage: 100 };
    };

    const getQualitativeFinalGrade = (score: number | null) => {
        if (score === null) return { text: 'N/A', className: 'bg-gray-100 text-gray-800' };
        if (score < 3.0) return { text: 'Bajo', className: 'bg-red-100 text-red-800' };
        if (score < 4.0) return { text: 'Básico', className: 'bg-yellow-100 text-yellow-800' };
        if (score < 4.6) return { text: 'Alto', className: 'bg-blue-100 text-blue-800' };
        return { text: 'Superior', className: 'bg-green-100 text-green-800' };
    };

    const handleSaveGrade = async (gradeData: Omit<Grade, 'id'> & {id?: string}) => {
        const gradeWithConcept = { ...gradeData };
        if (!gradeWithConcept.conceptCode) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const conceptsForScore = concepts.filter((c) => {
                    const score = gradeData.score;
                    if(score >= 4.6 && c.text.startsWith('(S)')) return true;
                    if(score >= 4.0 && score < 4.6 && c.text.startsWith('(A)')) return true;
                    if(score >= 3.0 && score < 4.0 && c.text.startsWith('(B)')) return true;
                    if(score < 3.0 && c.text.startsWith('(b)')) return true;
                    return false;
                }).map(c => `${c.text} (Código: ${c.code})`).join('\n');
        
                const prompt = `De la siguiente lista de conceptos para una calificación, elige el más adecuado para la actividad "${gradeData.assignmentTitle}" de la materia "${gradeData.subject}" y devuelve solo el código.\n\nLista:\n${conceptsForScore}`;
                
                if(conceptsForScore.length > 0){
                    const response: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                    const code = response.text?.trim().match(/C\d{3}/);
                    if (code) gradeWithConcept.conceptCode = code[0];
                }
            } catch (error) { console.error("Error finding concept:", error); }
        }
        
        try {
            if (gradeData.id) {
                await updateGrade(gradeData.id, gradeWithConcept);
            } else {
                await addGrade(gradeWithConcept);
            }
            setNotification({ message: '¡Calificación guardada!', type: 'success' });
        } catch (error: any) {
            setNotification({ message: `Error: ${error.message}`, type: 'error' });
        }
    };

    const handleDeleteGrade = async (gradeId: string) => {
        if (window.confirm('¿Está seguro?')) {
            try {
                await deleteGrade(gradeId);
                setNotification({ message: 'Calificación eliminada.', type: 'success' });
            } catch (error: any) {
                setNotification({ message: `Error: ${error.message}`, type: 'error' });
            }
        }
    };
    
    const handleBulkSaveGrades = async (newGrades: Omit<Grade, 'id'>[]) => {
        let successCount = 0;
        for (const grade of newGrades) {
            try {
                await addGrade(grade);
                successCount++;
            } catch (error: any) {
                 setNotification({ message: `Error al guardar: ${error.message}`, type: 'error' });
            }
        }
        setNotification({ message: `¡Se guardaron ${successCount} de ${newGrades.length} calificaciones!`, type: 'success' });
    };

    const handleExportExcel = () => {
        if (!activePeriod) return;
        const headers = ["Nombre Estudiante", "Clase", "Promedio Periodo"];
        const rows = myStudents.map((student: Student) => {
            const avgInfo = calculatePeriodAverage(student.id, activePeriod, numberOfPeriods);
            return [student.name, `${student.class} - ${student.section}`, avgInfo ? avgInfo.grade.toFixed(2) : 'N/A'].join(',');
        });
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `calificaciones_periodo_${activePeriod}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const gradeOptions = [
        { category: 'Preescolar', grades: ['Pre jardín', 'Jardín', 'Transición'] },
        { category: 'Primaria', grades: ['1ro', '2do', '3ro', '4to', '5to'] },
        { category: 'Secundaria', grades: ['6', '7', '8', '9', '10', '11'] }
    ];

    return (
        <>
            {notification && (
                <div className={`fixed bottom-5 right-5 z-[100] p-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {notification.message}
                </div>
            )}
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold dark:text-white">Resumen de Calificaciones</h2>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-wrap">
                        <div className="relative group flex-grow">
                            <input 
                                type="text" 
                                placeholder="Buscar estudiante..." 
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                            />
                            <div className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-primary transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                            </div>
                        </div>
                        <select 
                            value={filterClass} 
                            onChange={e => setFilterClass(e.target.value)}
                            className="py-2.5 px-3 rounded-lg border border-slate-200 text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        >
                            <option value="">Todos los grados</option>
                            {gradeOptions.map(cat => (
                                <optgroup key={cat.category} label={cat.category}>
                                    {cat.grades.map(g => <option key={g} value={g}>{g}</option>)}
                                </optgroup>
                            ))}
                        </select>
                        <select 
                            value={filterSection} 
                            onChange={e => setFilterSection(e.target.value)}
                            className="py-2.5 px-3 rounded-lg border border-slate-200 text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        >
                            <option value="">Todas las secciones</option>
                            {['A', 'B', 'C', '1', '2', '3'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => setIsBulkUploadModalOpen(true)} className="bg-secondary text-primary-text font-bold py-2 px-4 rounded flex items-center justify-center gap-2 dark:text-gray-900">
                            <UploadIcon className="w-5 h-5"/> Carga Masiva
                        </button>
                        <button onClick={handleExportExcel} disabled={!activePeriod} className="bg-green-600 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 disabled:bg-gray-400">
                            <DownloadIcon className="w-5 h-5"/> Exportar (Excel)
                        </button>
                    </div>
                </div>

                {existingPeriods.length > 0 && activePeriod ? (
                    <>
                        <div className="mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex space-x-1">
                            {existingPeriods.map(period => (
                                <button
                                    key={period}
                                    type="button"
                                    onClick={() => setActivePeriod(period)}
                                    className={`flex-1 text-center py-2 px-3 rounded-md font-semibold text-sm transition-all duration-200 ${activePeriod === period ? 'bg-primary text-white shadow' : 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-700'}`}
                                >
                                    {periodLabels[period - 1]}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-3">Estudiante</th>
                                        <th className="px-6 py-3">Promedio del Periodo</th>
                                        <th className="px-6 py-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myStudents.map((student) => {
                                        const avgInfo = calculatePeriodAverage(student.id, activePeriod, numberOfPeriods);
                                        const qualitative = getQualitativeFinalGrade(avgInfo?.grade ?? null);
                                        return (
                                            <tr key={student.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{student.name}</td>
                                                <td className="px-6 py-4 font-bold">
                                                    {avgInfo ? (
                                                        <div className="flex items-center gap-2">
                                                            <span>{avgInfo.grade.toFixed(2)}</span>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${qualitative.className}`}>{qualitative.text}</span>
                                                        </div>
                                                    ) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button onClick={() => setManagingStudent(student)} className="font-medium text-primary hover:underline">Gestionar Calificaciones</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <p className="text-text-secondary">No hay calificaciones registradas para ningún período.</p>
                        <p className="mt-2 text-sm">Vaya a "Mis Estudiantes" o "Gestión de Notas" para empezar a calificar.</p>
                    </div>
                )}
            </Card>

            {managingStudent && activePeriod && <GradesManagementModal
                student={managingStudent}
                grades={grades.filter(g => g.studentId === managingStudent.id)}
                onClose={() => setManagingStudent(null)}
                onSaveGrade={handleSaveGrade}
                onDeleteGrade={handleDeleteGrade}
                teacherSubjects={teacherSubjects}
                concepts={concepts}
                activePeriod={activePeriod}
                numberOfPeriods={numberOfPeriods}
                isPeriodLocked={false}
            />}
            {isBulkUploadModalOpen && <BulkUploadGradesModal 
                onClose={() => setIsBulkUploadModalOpen(false)}
                onSave={handleBulkSaveGrades}
                myStudents={myStudents}
                teacherSubjects={teacherSubjects}
                allGrades={grades}
                isPeriodLocked={false}
            />}
        </>
    );
};

export default GradesPage;
