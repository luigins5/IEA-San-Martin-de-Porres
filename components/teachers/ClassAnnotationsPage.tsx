
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TeacherCourseAssignment, Student, Grade, AttendanceRecord, UserRole } from '../../types';
import { useData } from '../../context/DataContext';
import { PlusIcon, SaveIcon, CheckIcon, ClipboardCheckIcon, TrashIcon, UploadIcon, DownloadIcon, ChevronRightIcon, ChevronDownIcon, EditIcon, ClipboardDocumentListIcon, AcademicCapIcon, CalendarIcon, CloseIcon, ExclamationTriangleIcon, SearchIcon } from '../icons';
import { getPeriodFromDate } from './GradesPage';
import Card from '../ui/Card';
import { SearchableConceptSelect } from '../ui/SearchableConceptSelect';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BulkUploadModal = ({ onClose, onSave, classStudents, isReadOnly, concepts }: { onClose: () => void, onSave: (data: any[]) => void, classStudents: Student[], isReadOnly: boolean, concepts: {code: string, text: string}[] }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const downloadTemplate = () => {
        const headers = "documento_identidad,nombre_estudiante,criterio,nota,observacion,faltas\n";
        // Exportar TODOS los estudiantes de la clase
        const lines = classStudents.map(s => 
            `${s.documentNumber},${s.name.replace(/,/g, '')},Actividad en clase,,,`
        ).join('\n');
        
        const blob = new Blob(["\ufeff" + headers + lines], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `plantilla_notas_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadConcepts = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Listado de Conceptos Cualitativos", 14, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 28);

        const tableBody = concepts.map(c => [
            c.code,
            c.text
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Código', 'Concepto']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
            columnStyles: {
                0: { cellWidth: 30, halign: 'center' },
                1: { cellWidth: 'auto' }
            }
        });

        doc.save('conceptos_cualitativos.pdf');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        
        setFile(f);
        setIsProcessing(true);
        setErrors([]);
        setParsedData([]);

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string;
                const rows = text.split('\n').filter(r => r.trim());
                if (rows.length <= 1) {
                    setErrors(["El archivo está vacío o solo contiene encabezados."]);
                    setIsProcessing(false);
                    return;
                }

                const dataRows = rows.slice(1);
                const results: any[] = [];
                const newErrors: string[] = [];

                dataRows.forEach((row, index) => {
                    // Try to split by semicolon first, if not, use comma (European standard vs US)
                    const separator = row.includes(';') ? ';' : ',';
                    const cols = row.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
                    if (cols.length < 2) return;

                    // Support backwards compatibility or new format
                    const hasNameCol = cols.length >= 6; 
                    // Remove BOM from first column if present
                    const docNum = cols[0].replace(/^\uFEFF/, '');
                    const criterion = (hasNameCol ? cols[2] : cols[1]) || 'Examen';
                    const scoreRaw = hasNameCol ? cols[3] : cols[2];
                    let observation = (hasNameCol ? cols[4] : cols[3]) || '';
                    const faultsRaw = hasNameCol ? cols[5] : cols[4];

                    // Interpretar código de concepto si el usuario digitó un código en lugar del texto
                    if (observation && concepts && concepts.length > 0) {
                        const trimmedCode = observation.trim();
                        const matchedConcept = concepts.find(c => c.code.toLowerCase() === trimmedCode.toLowerCase());
                        if (matchedConcept) {
                            observation = matchedConcept.text;
                        }
                    }

                    const student = classStudents.find(s => s.documentNumber === docNum);
                    
                    let score: number | undefined = undefined;
                    if (scoreRaw !== undefined && scoreRaw !== '') {
                         // Parse score with comma or dot decimal separator
                         score = parseFloat(scoreRaw.replace(',', '.'));
                    }
                    
                    let faults: number | undefined = undefined;
                    if (faultsRaw !== undefined && faultsRaw !== '') {
                        faults = parseInt(faultsRaw);
                    }

                    if (!student) {
                        newErrors.push(`Fila ${index + 2}: El estudiante con documento ${docNum} no pertenece a esta clase.`);
                    } else if (score !== undefined && (isNaN(score) || score < 0 || score > 5)) {
                        newErrors.push(`Fila ${index + 2}: La nota (${scoreRaw}) debe ser un número entre 0.0 y 5.0 para ${student.name}.`);
                    } else if (score === undefined && faults === undefined) {
                        newErrors.push(`Fila ${index + 2}: Debe ingresar una nota o una cantidad de faltas para el estudiante ${student.name}.`);
                    } else {
                        results.push({
                            studentId: student.id,
                            studentName: student.name,
                            score,
                            criterion,
                            observation,
                            faults
                        });
                    }
                });

                setParsedData(results);
                setErrors(newErrors);
            } catch (err) {
                setErrors(["Error al procesar el archivo. Asegúrese de que sea un CSV válido."]);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(f);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center backdrop-blur-sm p-4 sm:p-6">
            <Card className="bg-white dark:bg-slate-900 p-0 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b dark:border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Importar Calificaciones y Faltas</h2>
                        <p className="text-sm text-slate-500">Carga notas y faltas para múltiples estudiantes mediante un CSV.</p>
                        {isReadOnly && <p className="text-sm text-red-500 font-bold mt-1">El periodo está cerrado (Solo lectura).</p>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                        <CloseIcon className="w-6 h-6 text-slate-400"/>
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Template download and info */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 text-white rounded-lg">
                                <DownloadIcon className="w-5 h-5"/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-blue-900 dark:text-blue-300">¿No tienes el formato?</p>
                                <p className="text-xs text-blue-700 dark:text-blue-400">Descarga la plantilla con los estudiantes de este grupo.</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            <button 
                                onClick={downloadTemplate}
                                className="flex-1 sm:w-auto px-4 py-2 bg-white text-blue-600 font-bold rounded-lg text-xs border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm"
                            >
                                Descargar Plantilla
                            </button>
                        </div>
                    </div>

                    {/* File Dropzone */}
                    <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                        <input type="file" accept=".csv" onChange={handleFileChange} disabled={isReadOnly} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <div className="pointer-events-none">
                            <UploadIcon className="w-12 h-12 mx-auto text-slate-300 group-hover:text-blue-500 transition-colors mb-4"/>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{file ? file.name : 'Haz clic o arrastra tu archivo CSV aquí'}</p>
                            <p className="text-xs text-slate-400 mt-2">Tamaño máximo: 5MB</p>
                        </div>
                    </div>

                    {/* Feedback area */}
                    <div className="max-h-48 overflow-y-auto space-y-3 custom-scrollbar">
                        {isProcessing && (
                            <div className="flex items-center justify-center p-4">
                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="ml-3 text-sm font-medium text-slate-600">Procesando registros...</span>
                            </div>
                        )}

                        {errors.length > 0 && (
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl">
                                <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase mb-2 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-4 h-4"/> Errores en el archivo:
                                </h4>
                                <ul className="text-xs text-rose-600 dark:text-rose-300 list-disc list-inside space-y-1">
                                    {errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </div>
                        )}

                        {parsedData.length > 0 && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-2">Registros listos ({parsedData.length}):</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {parsedData.slice(0, 5).map((item, i) => (
                                        <div key={i} className="flex justify-between text-[10px] bg-white/50 dark:bg-slate-800 p-2 rounded">
                                            <span className="font-medium">{item.studentName}</span>
                                            <span className="font-bold text-blue-600">
                                                {item.score !== undefined ? `Nota: ${item.score}` : ''}
                                                {item.score !== undefined && item.faults !== undefined ? ' | ' : ''}
                                                {item.faults !== undefined ? `Faltas: ${item.faults}` : ''}
                                            </span>
                                        </div>
                                    ))}
                                    {parsedData.length > 5 && <p className="text-[10px] text-slate-400 italic">Y {parsedData.length - 5} estudiantes más...</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800 flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">
                        Cancelar
                    </button>
                    <button 
                        disabled={parsedData.length === 0 || isProcessing || isReadOnly}
                        onClick={() => onSave(parsedData)}
                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                        Importar {parsedData.length} Registros
                    </button>
                </div>
            </Card>
        </div>
    );
};

// Nuevo Modal para añadir concepto personalizado
const AddCustomConceptModal = ({ onClose, onSave }: { onClose: () => void, onSave: (text: string) => void }) => {
    const [text, setText] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim().length < 5) {
            alert('El concepto es muy corto.');
            return;
        }
        onSave(text.trim());
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-md shadow-2xl animate-fade-in-up border-none">
                <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Nuevo Concepto Personalizado</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escriba el comentario u observación que desea guardar para usarlo posteriormente en sus calificaciones.</p>
                    <textarea 
                        autoFocus
                        value={text}
                        onChange={e => setText(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[120px] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        placeholder="Ej: El estudiante demuestra un excelente dominio de los temas vistos durante la semana..."
                        required
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:bg-slate-800">Cancelar</button>
                        <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-500/20 transition-all">Guardar Concepto</button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const EditRecordModal = ({ record, onClose, onSave, concepts }: { record: any, onClose: () => void, onSave: (data: any) => void, concepts: any[] }) => {
    const isGrade = record.type === 'Nota';
    const [formData, setFormData] = useState({
        score: record.value || '',
        detail: record.detail || '', 
        observation: record.raw?.comments || '',
        count: isGrade ? 0 : (record.value || 1)
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...record, ...formData });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Editar {record.type}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6"/>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isGrade ? (
                        <>
                            <div>
                                <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300">Actividad / Criterio</label>
                                <input 
                                    type="text" 
                                    value={formData.detail} 
                                    onChange={e => setFormData({...formData, detail: e.target.value})}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300">Nota (0.0 - 5.0)</label>
                                    <input 
                                        type="number" min="0.0" max="5.0" step="0.1"
                                        value={formData.score} 
                                        onChange={e => setFormData({...formData, score: e.target.value})}
                                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300">Observación</label>
                                <SearchableConceptSelect 
                                    concepts={concepts}
                                    value={formData.observation}
                                    onChange={(val) => setFormData({...formData, observation: val})}
                                    placeholder="Seleccionar concepto..."
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300">Tipo de Ausencia</label>
                                <select 
                                    value={formData.detail} 
                                    onChange={e => setFormData({...formData, detail: e.target.value})}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                                >
                                    <option value="Ausente">Ausente (Injustificada)</option>
                                    <option value="Justificada">Justificada</option>
                                    <option value="Presente">Retardo / Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300">Cantidad de Horas/Fallas</label>
                                <input 
                                    type="number" min="1"
                                    value={formData.count} 
                                    onChange={e => setFormData({...formData, count: parseInt(e.target.value)})}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors text-sm dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-colors text-sm">Guardar Cambios</button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const CRITERIA_OPTIONS = [
    'Examen',
    'Trabajo individual',
    'Trabajo en grupo',
    'Exposición',
    'Otro'
];

const BulkUploadConceptsModal = ({ onClose, onSave }: { onClose: () => void, onSave: (data: any[]) => void }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const downloadTemplate = () => {
        const headers = "concepto\n";
        const lines = "Escribe el texto del concepto aquí\nParticipación activa\nPuntualidad\n";
        const blob = new Blob(["\ufeff" + headers + lines], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `plantilla_nuevos_conceptos.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        
        setFile(f);
        setIsProcessing(true);
        setErrors([]);
        setParsedData([]);

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string;
                const rows = text.split('\n').filter(r => r.trim());
                if (rows.length <= 1) {
                    setErrors(["El archivo está vacío o solo contiene encabezados."]);
                    setIsProcessing(false);
                    return;
                }

                const dataRows = rows.slice(1);
                const results: any[] = [];
                const newErrors: string[] = [];

                dataRows.forEach((row, index) => {
                    const separator = row.includes(';') ? ';' : ',';
                    const cols = row.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
                    if (cols.length < 1) return;

                    const textStr = cols[0].replace(/^\uFEFF/, '');

                    if (!textStr) {
                         newErrors.push(`Fila ${index + 2}: El concepto no puede estar vacío.`);
                    } else if (textStr.toLowerCase().includes('escribe el texto')) {
                        // Ignorar fila de ejemplo
                        return;
                    } else {
                        results.push({ text: textStr });
                    }
                });

                if (results.length === 0 && newErrors.length === 0) {
                     newErrors.push("No se encontraron conceptos válidos para importar.");
                }

                setParsedData(results);
                setErrors(newErrors);
            } catch (err) {
                setErrors(["Error al procesar el archivo. Asegúrese de que sea un CSV válido."]);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(f);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center backdrop-blur-sm p-4 sm:p-6 pb-20">
            <Card className="bg-white dark:bg-slate-900 p-0 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b dark:border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Cargar Nuevos Conceptos</h2>
                        <p className="text-sm text-slate-500">Añade conceptos rápidamente a tu repositorio. El sistema asignará los códigos de forma automática.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                        <CloseIcon className="w-6 h-6 text-slate-400"/>
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 p-4 rounded-xl">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Instrucciones de carga:</h4>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
                            <li>1. Descarga la plantilla CSV a continuación.</li>
                            <li>2. Abre el archivo en Excel o Google Sheets.</li>
                            <li>3. En la columna <strong>"concepto"</strong>, escribe cada uno de tus conceptos en una fila nueva.</li>
                            <li>4. <strong>No agregues códigos.</strong> El sistema generará y asignará el siguiente código a cada uno de forma automática.</li>
                            <li>5. Guarda como CSV y súbelo aquí.</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-600 text-white rounded-lg">
                                <DownloadIcon className="w-5 h-5"/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-teal-900 dark:text-teal-300">¿No tienes el formato?</p>
                                <p className="text-xs text-teal-700 dark:text-teal-400">Descarga la plantilla .CSV de conceptos.</p>
                            </div>
                        </div>
                        <button 
                            onClick={downloadTemplate}
                            className="px-4 py-2 bg-white text-teal-600 font-bold rounded-lg text-xs border border-teal-200 hover:bg-teal-100 transition-colors shadow-sm whitespace-nowrap"
                        >
                            Descargar Plantilla
                        </button>
                    </div>

                    <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                        <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <div className="pointer-events-none">
                            <UploadIcon className="w-12 h-12 mx-auto text-slate-300 group-hover:text-teal-500 transition-colors mb-4"/>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{file ? file.name : 'Haz clic o arrastra tu archivo CSV aquí'}</p>
                            <p className="text-xs text-slate-400 mt-2">Tamaño máximo: 5MB</p>
                        </div>
                    </div>

                    {errors.length > 0 && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl">
                            <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase mb-2 flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-4 h-4"/> Errores en el archivo:
                            </h4>
                            <ul className="text-xs text-rose-600 dark:text-rose-300 list-disc list-inside space-y-1">
                                {errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    )}
                    {parsedData.length > 0 && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                            <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-2">Registros listos para auto-asignar código ({parsedData.length}):</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {parsedData.slice(0, 5).map((item, i) => (
                                    <div key={i} className="flex gap-2 text-xs bg-white/50 dark:bg-slate-800 p-2 rounded">
                                        <span className="font-bold text-teal-600 dark:text-teal-400">[Auto]</span>
                                        <span className="text-slate-700 dark:text-slate-300 truncate">{item.text}</span>
                                    </div>
                                ))}
                                {parsedData.length > 5 && <p className="text-[10px] text-slate-400 italic">Y {parsedData.length - 5} más...</p>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800 flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">
                        Cancelar
                    </button>
                    <button 
                        disabled={parsedData.length === 0 || isProcessing}
                        onClick={() => onSave(parsedData)}
                        className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 hover:bg-teal-700 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                        Importar {parsedData.length} Nuevos Conceptos
                    </button>
                </div>
            </Card>
        </div>
    );
};

const ClassSearchModal = ({ onClose, onSelect, myClasses, teachers, campuses }: any) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredClasses = myClasses.filter((c: any) => {
        const teacher = teachers.find((t: any) => t.id === c.teacherId);
        const campus = campuses?.find((cmp: any) => cmp.id === teacher?.campusId);
        const searchString = `${c.subject} ${c.class} ${c.section || ''} ${teacher?.name || ''} ${campus?.name || ''}`.toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center backdrop-blur-sm p-4 sm:p-6 pb-20">
            <Card className="bg-white dark:bg-slate-900 p-0 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b dark:border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Buscar Asignatura</h2>
                        <p className="text-sm text-slate-500">Busca por materia, grado, docente o sede.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                        <CloseIcon className="w-6 h-6 text-slate-400"/>
                    </button>
                </div>
                
                <div className="p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="relative">
                        <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Ej. Matemáticas, Sede Principal, Transición..." 
                            autoFocus
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {filteredClasses.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 font-medium">No se encontraron asignaturas.</div>
                    ) : (
                        <div className="grid gap-2">
                            {filteredClasses.map((c: any) => {
                                const teacher = teachers.find((t: any) => t.id === c.teacherId);
                                const campus = campuses?.find((cmp: any) => cmp.id === teacher?.campusId);
                                
                                return (
                                    <button 
                                        key={c.id}
                                        onClick={() => { onSelect(c.id); onClose(); }}
                                        className="text-left w-full p-4 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-100 dark:hover:border-blue-800 transition-all flex items-center justify-between group"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {c.subject} <span className="text-slate-400 font-normal ml-2">({c.class} {c.section && `- ${c.section}`})</span>
                                            </p>
                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                {campus && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400 rounded flex items-center gap-1 font-medium border border-slate-200 dark:border-slate-700"><AcademicCapIcon className="w-3 h-3"/> {campus.name}</span>}
                                                {teacher && <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">🏫 {teacher.name}</span>}
                                            </div>
                                        </div>
                                        <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

const ClassAnnotationsPage: React.FC = () => {
    const { user } = useAuth();
    const { assignments, teachers, campuses, students: allStudents, attendanceRecords, saveAttendance, addGrade, updateGrade, grades, deleteGrade, deleteAttendance, exams, getUserSetting, setUserSetting, globalSettings, campusSettings, concepts, addConcept } = useData();
    const [myClasses, setMyClasses] = useState<TeacherCourseAssignment[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [isClassSearchModalOpen, setIsClassSearchModalOpen] = useState(false);
    const [isConceptsBulkModalOpen, setIsConceptsBulkModalOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
    const [numberOfPeriods, setNumberOfPeriods] = useState(4);
    const [inputs, setInputs] = useState<Record<string, any>>({});
    const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isConceptModalOpen, setIsConceptModalOpen] = useState(false);
    
    // Validations State
    const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
    const [editingRecord, setEditingRecord] = useState<any | null>(null);
    const [selectedHistoryRecords, setSelectedHistoryRecords] = useState<string[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);

    const handleSelectHistoryRecord = (id: string) => {
        setSelectedHistoryRecords(prev => 
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const handleBulkDeleteHistory = async () => {
        if (selectedHistoryRecords.length === 0) return;
        setDeleteTarget(selectedHistoryRecords);
    };

    const handleSelectAllClassRecords = (classStudents: Student[]) => {
        const allHistIds = classStudents.flatMap(s => getStudentHistory(s.id).map(h => h.id));
        if (allHistIds.length === 0) {
            alert("No hay notas ni faltas registradas en este periodo para esta asignatura.");
            return;
        }
        setSelectedHistoryRecords(allHistIds);
    };

    const executeDeleteHistoryRecords = async () => {
        if (!deleteTarget || deleteTarget.length === 0) return;
        try {
            for (const id of deleteTarget) {
                const isGrade = grades.some(g => g.id === id);
                if (isGrade) {
                    await deleteGrade(id);
                } else {
                    await deleteAttendance(id);
                }
            }
            setSelectedHistoryRecords([]);
            setDeleteTarget(null);
        } catch (e) {
            console.error(e);
            console.error('Error al eliminar registros.');
        }
    };

    useEffect(() => {
        let settings: any = null;
        if (globalSettings) settings = { ...globalSettings };
        
        if (user?.campusId && campusSettings) {
            settings = { ...settings, ...campusSettings };
        }
        if (settings && settings.numberOfPeriods) setNumberOfPeriods(settings.numberOfPeriods);

        const today = new Date().toISOString().split('T')[0];
        const currentPeriod = getPeriodFromDate(today, settings?.numberOfPeriods || 4);
        setSelectedPeriod(currentPeriod);

        if (user) {
            let teacherAssignments = [];
            if (user.role === UserRole.SUPER_ADMIN) {
                teacherAssignments = assignments;
            } else if (user.role === UserRole.CAMPUS_ADMIN) {
                const campusTeachersIds = teachers.filter(t => t.campusId === user.campusId).map(t => t.id);
                teacherAssignments = assignments.filter(a => campusTeachersIds.includes(a.teacherId));
            } else {
                const currentTeacher = teachers.find(t => t.email === user.email);
                const teacherId = currentTeacher?.id || user.id;
                teacherAssignments = assignments.filter(a => a.teacherId === teacherId);
            }
            
            const uniqueAssignmentsMap = new Map();
            teacherAssignments.forEach(a => {
                const teacher = teachers.find(t => t.id === a.teacherId);
                const campusId = teacher?.campusId || 'no-campus';
                const key = `${campusId}-${a.teacherId}-${a.subject}-${a.class}-${a.section}`;
                if (!uniqueAssignmentsMap.has(key)) {
                    uniqueAssignmentsMap.set(key, a);
                }
            });
            const uniqueAssignments = Array.from(uniqueAssignmentsMap.values());

            setMyClasses(uniqueAssignments);
            setSelectedClassId(prev => {
                if (!prev && uniqueAssignments.length > 0) return uniqueAssignments[0].id;
                if (prev && !uniqueAssignments.find(a => a.id === prev) && uniqueAssignments.length > 0) return uniqueAssignments[0].id;
                return prev;
            });
        }
    }, [user, assignments, teachers, globalSettings, campusSettings]);

    const isPeriodLocked = globalSettings?.lockedPeriods?.includes(selectedPeriod) || false;
    const isReadOnly = isPeriodLocked && user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.CAMPUS_ADMIN;

    const handleSaveCustomConcept = async (text: string) => {
        if (user && text.trim() !== '') {
            const nextCodeNumber = concepts.length > 0 ? 
                Math.max(...concepts.map(c => parseInt(c.code.replace(/[^\d]/g, '')) || 0)) + 1 
                : 530;
                
            const paddedNum = nextCodeNumber.toString().padStart(3, '0');
            const newConcept = { code: `C${paddedNum}`, text };
            await addConcept(newConcept);
        }
        setIsConceptModalOpen(false);
    };

    const selectedClass = myClasses.find(c => c.id === selectedClassId);
    
    const availableExams = useMemo(() => {
        if (!selectedClass || !user) return [];
        return exams.filter(exam => 
            exam.teacherId === user.id && 
            exam.subject === selectedClass.subject &&
            String(exam.schoolPeriod) === String(selectedPeriod)
        );
    }, [exams, selectedClass, user, selectedPeriod]);

    const classStudents = useMemo(() => {
        if (!selectedClass) return [];
        const assignedTeacher = teachers.find(t => t.id === selectedClass.teacherId);
        const targetCampusId = assignedTeacher?.campusId;

        return allStudents.filter(s => {
            const normalize = (str: string | undefined | null) => String(str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
            
            const teacherClass = normalize(selectedClass.class);
            const teacherSection = normalize(selectedClass.section);
            const studentClass = normalize(s.class);
            const studentSection = normalize(s.section);

            // Levenshtein / Fallback checks for common encoding errors mapping (e.g., Transicin vs Transicion)
            const replaceEncodingErrors = (str: string) => str.replace('transicin', 'transicion').replace('dimesion', 'dimension');
            
            const tC = replaceEncodingErrors(teacherClass);
            const sC = replaceEncodingErrors(studentClass);

            const isClassMatch = sC === tC || 
                               sC === `${tC}-${teacherSection}` ||
                               sC === `${tC} ${teacherSection}` ||
                               sC.includes(tC) || tC.includes(sC);
            
            const isSectionMatch = studentSection === teacherSection || 
                                 (!studentSection && sC.includes(teacherSection));

            const statusMatch = s.status !== 'inactive';
            const campusMatch = !targetCampusId || !s.campusId || String(s.campusId) === String(targetCampusId) || user?.role === UserRole.SUPER_ADMIN;
            const searchMatch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || Boolean(s.documentNumber?.includes(searchQuery));
            
            return isClassMatch && isSectionMatch && statusMatch && campusMatch && searchMatch;
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [selectedClass, allStudents, searchQuery, teachers, user]);

    const getSavedAccumulatedFaults = (studentId: string) => {
        return attendanceRecords
            .filter(r => 
                r.studentId === studentId && 
                r.period === selectedPeriod && 
                (r.status === 'Ausente' || r.status === 'Justificado')
            )
            .reduce((acc, curr) => acc + (curr.count || 1), 0);
    };

    const handleInputChange = (studentId: string, field: string, value: string) => {
        setInputs(prev => {
            const defaultInputs = { score: '', faults: '', observation: '', criterion: '', customCriterion: '' };
            return {
                ...prev,
                [studentId]: {
                    ...(prev[studentId] || defaultInputs),
                    [field]: value
                }
            };
        });
        
        if (savedStatus[studentId]) {
            setSavedStatus(prev => ({ ...prev, [studentId]: false }));
        }

        if (validationErrors[studentId]?.[field]) {
            setValidationErrors(prev => {
                const newStudentErrors = { ...prev[studentId] };
                delete newStudentErrors[field];
                return { ...prev, [studentId]: newStudentErrors };
            });
        }
    };

    const handleSaveStudentRow = async (student: Student) => {
        const input = inputs[student.id] || { score: '', faults: '', observation: '', criterion: '', customCriterion: '' };
        
        const scoreStr = input.score !== undefined ? String(input.score) : '';
        const faultsStr = input.faults !== undefined ? String(input.faults) : '';
        
        const hasScoreInput = scoreStr.trim() !== '';
        const hasCriterionInput = input.criterion && input.criterion.trim() !== '';
        const hasObservationInput = input.observation && input.observation.trim() !== '';
        const hasFaultsInput = faultsStr.trim() !== '' && parseInt(faultsStr) > 0;

        if (!hasScoreInput && !hasCriterionInput && !hasObservationInput && !hasFaultsInput) return;

        const currentErrors: Record<string, string> = {};
        const isGradeEntry = hasScoreInput || hasCriterionInput || hasObservationInput;

        if (isGradeEntry) {
             if (!hasCriterionInput) currentErrors.criterion = "Requerido";
             if (input.criterion === 'Otro' && (!input.customCriterion || input.customCriterion.trim() === '')) {
                 currentErrors.customCriterion = "Requerido";
             }
             if (!hasScoreInput) {
                 currentErrors.score = "Requerido";
             } else {
                 const score = parseFloat(scoreStr);
                 if (isNaN(score) || score < 0.0 || score > 5.0) {
                     currentErrors.score = "0.0 a 5.0";
                 }
             }
             if (!hasObservationInput) currentErrors.observation = "Requerido";
        }

        if (Object.keys(currentErrors).length > 0) {
            setValidationErrors(prev => ({ ...prev, [student.id]: currentErrors }));
            return;
        }

        const score = parseFloat(String(scoreStr));
        const newFaults = parseInt(String(faultsStr));
        const today = new Date().toISOString().split('T')[0];

        try {
            if (!isNaN(score) && selectedClass && isGradeEntry) {
                const selectedConcept = concepts.find(c => c.text === input.observation);
                let finalTitle = input.criterion || 'Actividad en clase';
                if (input.criterion === 'Otro') {
                    finalTitle = input.customCriterion || 'Otro';
                }

                await addGrade({
                    studentId: student.id,
                    subject: selectedClass.subject,
                    class: student.class,
                    assignmentTitle: finalTitle,
                    score: score,
                    percentage: 10,
                    date: today,
                    comments: input.observation || 'Nota rápida',
                    conceptCode: selectedConcept ? selectedConcept.code : '' 
                });
            }

            if (!isNaN(newFaults) && newFaults > 0) {
                const existingRecord = attendanceRecords.find(r => r.studentId === student.id && r.date === today && r.period === selectedPeriod);
                const totalDailyFaults = (existingRecord?.count || 0) + newFaults;
                await saveAttendance({
                    studentId: student.id,
                    date: today,
                    status: 'Ausente',
                    count: totalDailyFaults,
                    period: selectedPeriod
                });
            }

            setSavedStatus(prev => ({ ...prev, [student.id]: true }));
            setInputs(prev => ({ ...prev, [student.id]: { score: '', faults: '', observation: '', criterion: input.criterion, customCriterion: input.customCriterion } }));
            setTimeout(() => setSavedStatus(prev => ({ ...prev, [student.id]: false })), 2000);

        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar los datos.");
        }
    };

    const handleBulkSave = async (data: any[]) => {
        if (!selectedClass) return;
        
        let count = 0;
        const today = new Date().toISOString().split('T')[0];
        
        for (const item of data) {
            try {
                const selectedConcept = concepts.find(c => c.text === item.observation);
                
                if (item.score !== undefined) {
                    const existingGrade = grades.find(g => 
                        g.studentId === item.studentId && 
                        g.assignmentTitle === item.criterion &&
                        getPeriodFromDate(g.date, numberOfPeriods) === selectedPeriod
                    );

                    if (existingGrade) {
                        if (existingGrade.score !== item.score || existingGrade.comments !== (item.observation || 'Carga masiva')) {
                            await updateGrade(existingGrade.id, {
                                score: item.score,
                                comments: item.observation || 'Carga masiva',
                                conceptCode: selectedConcept ? selectedConcept.code : existingGrade.conceptCode
                            });
                            count++;
                        }
                    } else {
                        await addGrade({
                            studentId: item.studentId,
                            subject: selectedClass.subject,
                            class: selectedClass.class,
                            assignmentTitle: item.criterion,
                            score: item.score,
                            percentage: 10,
                            date: today,
                            comments: item.observation || 'Carga masiva',
                            conceptCode: selectedConcept ? selectedConcept.code : ''
                        });
                        count++;
                    }
                }
                
                if (item.faults !== undefined && item.faults > 0) {
                    const existingRecord = attendanceRecords.find(r => r.studentId === item.studentId && r.date === today && r.period === selectedPeriod);
                    const totalDailyFaults = (existingRecord?.count || 0) + item.faults;
                    await saveAttendance({
                        studentId: item.studentId,
                        date: today,
                        status: 'Ausente',
                        count: totalDailyFaults,
                        period: selectedPeriod
                    });
                }
                count++;
            } catch (err) {
                console.error("Error cargando nota masiva para studentId:", item.studentId, err);
            }
        }
        
        setIsBulkModalOpen(false);
        alert(`Se han importado ${count} registros exitosamente.`);
    };

    const handleDownloadTemplate = () => {
        if (!selectedClass) {
            alert("Seleccione una asignatura primero.");
            return;
        }

        const headers = "documento_identidad,nombre_estudiante,criterio,nota,observacion,faltas\n";
        // Exportar TODOS los estudiantes filtrados de la clase actual
        const lines = classStudents.map(s => 
            `${s.documentNumber},${s.name.replace(/,/g, '')},Examen,,,`
        ).join('\n');
        
        const blob = new Blob(["\uFEFF" + headers + lines], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `plantilla_notas_${selectedClass.subject.replace(/\s+/g,'_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdateRecord = async (updatedRecord: any) => {
        try {
            if (updatedRecord.type === 'Nota') {
                await updateGrade(updatedRecord.id, {
                    assignmentTitle: updatedRecord.detail,
                    score: parseFloat(String(updatedRecord.score)),
                    comments: updatedRecord.observation
                });
            } else {
                await saveAttendance({
                    studentId: updatedRecord.studentId || '',
                    date: updatedRecord.date,
                    status: updatedRecord.detail,
                    count: parseInt(String(updatedRecord.count)),
                    period: selectedPeriod
                });
            }
            setEditingRecord(null);
        } catch (e) {
            console.error("Error updating", e);
            alert("Error al actualizar el registro.");
        }
    };

    const getStudentHistory = (studentId: string) => {
        const studentGrades = grades
            .filter(g => g.studentId === studentId && getPeriodFromDate(g.date, numberOfPeriods) === selectedPeriod)
            .map(g => ({ ...g, type: 'Nota', value: g.score, detail: g.assignmentTitle, id: g.id, date: g.date, raw: g, studentId }));
        
        const studentAttendance = attendanceRecords
            .filter(a => a.studentId === studentId && a.period === selectedPeriod)
            .map(a => ({ ...a, type: 'Falla', value: a.count, detail: a.status, id: a.id, date: a.date, raw: a, studentId }));

        return [...studentGrades, ...studentAttendance].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    const getScoreColorClass = (scoreStr: string) => {
        if (!scoreStr) return 'border-transparent bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500';
        const s = parseFloat(String(scoreStr));
        if (isNaN(s)) return 'border-slate-200';
        if (s <= 2.9) return 'bg-red-50 text-red-600 focus:ring-2 focus:ring-red-500 border-red-200';
        if (s <= 3.9) return 'bg-amber-50 text-amber-600 focus:ring-2 focus:ring-amber-500 border-amber-200';
        return 'bg-emerald-50 text-emerald-600 focus:ring-2 focus:ring-emerald-500 border-emerald-200';
    };

    const getRowColorClass = (scoreStr: string) => {
        if (!scoreStr) return '';
        const s = parseFloat(String(scoreStr));
        if (isNaN(s)) return '';
        if (s <= 2.9) return 'bg-red-50/40 dark:bg-red-900/10 hover:bg-red-100/50 dark:hover:bg-red-900/20'; // Reprobado
        if (s <= 3.9) return 'bg-amber-50/40 dark:bg-amber-900/10 hover:bg-amber-100/50 dark:hover:bg-amber-900/20'; // Básico
        return 'bg-emerald-50/40 dark:bg-emerald-900/10 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20'; // Alto
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="bg-gradient-to-r from-blue-600 to-blue-600 rounded-2xl p-6 lg:p-8 shadow-xl text-white flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                <div className="relative z-10 text-center">
                    <h2 className="font-bold text-3xl flex items-center justify-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                            <ClipboardDocumentListIcon className="w-8 h-8 text-white" />
                        </div>
                        <span className="tracking-tight">Gestión de Notas</span>
                    </h2>
                    <p className="text-blue-100 mt-2 font-medium text-lg opacity-90">Registro rápido de calificaciones y asistencia.</p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                <div className="flex flex-col gap-4 w-full relative z-10 mt-2">
                    <div className="flex flex-wrap gap-3 justify-center items-center w-full">
                         <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-lg border border-white/20">
                            <div className="relative group">
                                <button
                                    onClick={() => setIsClassSearchModalOpen(true)}
                                    className="pl-4 pr-10 py-2.5 text-sm font-bold rounded-xl bg-transparent text-slate-700 hover:bg-slate-50 min-w-[200px] max-w-[300px] text-left truncate transition-colors relative flex items-center"
                                >
                                    {selectedClassId ? (() => {
                                        const c = myClasses.find(cls => cls.id === selectedClassId);
                                        if (!c) return "Seleccionar Asignatura...";
                                        return `${c.subject} (${c.class}${c.section ? `-${c.section}` : ''})`;
                                    })() : "Buscar Asignatura..."}
                                    <SearchIcon className="w-4 h-4 text-slate-400 absolute right-3 pointer-none"/>
                                </button>
                            </div>
                            <div className="h-8 w-px bg-slate-200 mx-1"></div>
                            <div className="relative group">
                                <select 
                                    value={selectedPeriod} 
                                    onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                                    className="appearance-none pl-4 pr-10 py-2.5 text-sm font-bold rounded-xl bg-transparent text-slate-700 focus:outline-none focus:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map(p => <option key={p} value={p}>P{p}</option>)}
                                </select>
                                <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-none"/>
                            </div>
                        </div>
                        <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-64 pl-4 pr-4 py-3 text-sm rounded-2xl bg-white/20 text-white placeholder-blue-100 border border-white/30 focus:bg-white/30 focus:border-white focus:outline-none transition-all backdrop-blur-sm shadow-inner"/>
                        
                        {selectedClassId && (
                            <button onClick={handleDownloadTemplate} className="bg-white/20 hover:bg-white/30 text-white border border-white/30 font-bold py-3 px-4 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 shadow-md">
                                <DownloadIcon className="w-5 h-5" /> <span className="hidden sm:inline">Plantilla</span>
                            </button>
                        )}
                    </div>
                    {/* Action Buttons Row */}
                    {!isReadOnly && selectedClassId && (
                        <div className="flex flex-wrap gap-3 justify-center items-center w-full pt-2 border-t border-white/10">
                            <button onClick={() => handleSelectAllClassRecords(classStudents)} title="Seleccionar y limpiar todas las notas" className="bg-rose-500/20 hover:bg-rose-500/40 text-white border border-rose-400/30 font-bold py-2.5 px-5 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 shadow-md backdrop-blur-sm">
                                <TrashIcon className="w-5 h-5"/> <span className="inline">Limpiar Todo</span>
                            </button>
                            <button onClick={() => setIsBulkModalOpen(true)} className="bg-white text-blue-600 font-bold py-2.5 px-6 rounded-2xl hover:bg-blue-50 transition-all text-sm flex items-center justify-center gap-2 shadow-md">
                                <UploadIcon className="w-5 h-5" /> <span className="inline">Masiva Notas</span>
                            </button>
                            <button onClick={() => setIsConceptsBulkModalOpen(true)} title="Carga Masiva de Conceptos" className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-2.5 px-5 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 shadow-md border border-teal-400/50">
                                <UploadIcon className="w-5 h-5" /> <span className="inline">Masiva Conceptos</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-8 py-6 font-semibold">Estudiante</th>
                                <th className="px-4 py-6 font-semibold w-48">Criterio</th>
                                <th className="px-3 py-6 font-semibold w-32 text-center">Nota</th>
                                <th className="px-4 py-6 font-semibold w-auto min-w-[200px]">Observación</th>
                                <th className="px-3 py-6 font-semibold w-24 text-center">Faltas</th>
                                <th className="px-3 py-6 font-semibold text-center w-24">Acum.</th>
                                <th className="px-6 py-6 font-semibold text-center w-24">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {classStudents.map(student => {
                                const input = inputs[student.id] || { score: '', faults: '', observation: '', criterion: '', customCriterion: '' };
                                const isSaved = savedStatus[student.id];
                                const baseAccumulated = getSavedAccumulatedFaults(student.id);
                                const isExpanded = expandedStudentId === student.id;
                                const hasPendingChanges = input.score || input.faults || input.observation;
                                const studentErrors = validationErrors[student.id] || {};

                                const latestSavedGrade = getStudentHistory(student.id).find(h => h.type === 'Nota');
                                const effectiveScore = input.score || (isSaved ? latestSavedGrade?.value : null);
                                const rowBg = getRowColorClass(effectiveScore as string) || (isExpanded ? 'bg-slate-50/80 dark:bg-slate-800/50' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30');

                                return (
                                    <React.Fragment key={student.id}>
                                        <tr className={`group transition-all duration-300 border-b border-slate-50 dark:border-slate-800/50 ${rowBg}`}>
                                            <td className="px-8 py-5 align-middle">
                                                <div className="flex items-center gap-4">
                                                    <button onClick={() => setExpandedStudentId(isExpanded ? null : student.id)} className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-blue-100 text-blue-600 rotate-90' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}>
                                                        <ChevronRightIcon className="w-4 h-4" />
                                                    </button>
                                                    <div>
                                                        <p className="font-bold text-slate-700 dark:text-slate-200 text-base">{student.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md tracking-wider">{student.documentNumber}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 align-middle">
                                                <div className="space-y-2">
                                                    <select value={input.criterion} onChange={(e) => handleInputChange(student.id, 'criterion', e.target.value)}
                                                        disabled={isReadOnly}
                                                        className={`w-full py-2 px-3 rounded-xl text-xs bg-slate-50 text-slate-600 font-medium outline-none transition-all dark:bg-slate-800 dark:text-slate-300 cursor-pointer ${studentErrors.criterion ? 'border-2 border-red-400 bg-red-50' : 'border-none'} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                        <option value="">Seleccionar Criterio...</option>
                                                        {availableExams.map(exam => <option key={exam.id} value={exam.title}>{exam.title}</option>)}
                                                        {CRITERIA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                    {input.criterion === 'Otro' && (
                                                        <input type="text" placeholder="Especifique..." value={input.customCriterion} onChange={(e) => handleInputChange(student.id, 'customCriterion', e.target.value)}
                                                            disabled={isReadOnly}
                                                            className={`w-full py-2 px-3 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none dark:bg-slate-800 dark:text-white ${studentErrors.customCriterion ? 'border-2 border-red-400 bg-red-50' : 'border-none'} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-5 align-middle">
                                                <input type="number" min="0.0" max="5.0" step="0.1" value={input.score} onChange={(e) => handleInputChange(student.id, 'score', e.target.value)} placeholder="-"
                                                    disabled={isReadOnly}
                                                    className={`w-full py-3 text-center rounded-2xl text-base font-bold transition-all outline-none shadow-sm ${studentErrors.score ? 'border-2 border-red-400 bg-red-50' : getScoreColorClass(input.score)} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
                                            </td>
                                            <td className="px-4 py-5 align-middle">
                                                <div className="flex gap-2 items-center">
                                                    <div className="flex-1 min-w-0">
                                                        <SearchableConceptSelect 
                                                            concepts={concepts}
                                                            value={input.observation}
                                                            onChange={(val) => handleInputChange(student.id, 'observation', val)}
                                                            disabled={isReadOnly}
                                                            hasError={!!studentErrors.observation}
                                                            isSmall
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => setIsConceptModalOpen(true)}
                                                        disabled={isReadOnly}
                                                        className={`p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors dark:bg-blue-900/20 dark:text-blue-400 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                                        title="Añadir concepto personalizado"
                                                    >
                                                        <PlusIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-3 py-5 align-middle">
                                                <input type="number" min="0" value={input.faults} onChange={(e) => handleInputChange(student.id, 'faults', e.target.value)} placeholder="0"
                                                    disabled={isReadOnly}
                                                    className={`w-full py-2.5 text-center rounded-xl text-sm font-bold bg-slate-50 text-slate-700 focus:bg-white focus:ring-2 focus:ring-rose-100 outline-none transition-all dark:bg-slate-800 dark:text-white border-none ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}/>
                                            </td>
                                            <td className="px-3 py-5 text-center align-middle">
                                                <span className={`text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full ${baseAccumulated > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{baseAccumulated}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center align-middle">
                                                <button onClick={() => handleSaveStudentRow(student)} disabled={isReadOnly || ((!hasPendingChanges || isSaved) && Object.keys(studentErrors).length === 0)}
                                                    className={`p-3 rounded-xl transition-all duration-500 shadow-sm ${isSaved ? 'bg-emerald-500 text-white scale-110' : hasPendingChanges || Object.keys(studentErrors).length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1' : 'bg-slate-100 text-slate-300 dark:bg-slate-800 cursor-not-allowed'} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    {isSaved ? <CheckIcon className="w-5 h-5" /> : <SaveIcon className="w-5 h-5" />}
                                                </button>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                                <td colSpan={7} className="px-8 pb-8 pt-2">
                                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col gap-4">
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="font-bold text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                                <ClipboardCheckIcon className="w-5 h-5 text-blue-500"/>Historial Detallado
                                                            </h4>
                                                            {selectedHistoryRecords.length > 0 && (
                                                                <button onClick={handleBulkDeleteHistory} className="border border-red-500 text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 dark:bg-red-900/20 dark:text-red-400">
                                                                    <TrashIcon className="w-4 h-4"/> Eliminar ({selectedHistoryRecords.length})
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="overflow-x-auto rounded-lg">
                                                            <table className="w-full text-xs text-left">
                                                                <thead className="text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                                                    <tr>
                                                                        <th className="px-4 py-3">Fecha</th>
                                                                        <th className="px-4 py-3">Tipo</th>
                                                                        <th className="px-4 py-3">Criterio</th>
                                                                        <th className="px-4 py-3 text-center">Nota</th>
                                                                        <th className="px-4 py-3">Observación</th>
                                                                        <th className="px-4 py-3 text-center">Acciones</th>
                                                                        <th className="px-4 py-3 text-center text-red-500" title="Seleccionar todas">
                                                                            <input 
                                                                                type="checkbox"
                                                                                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300 cursor-pointer"
                                                                                checked={getStudentHistory(student.id).length > 0 && getStudentHistory(student.id).every(item => selectedHistoryRecords.includes(item.id))}
                                                                                onChange={(e) => {
                                                                                    const histIds = getStudentHistory(student.id).map(h => h.id);
                                                                                    if (e.target.checked) {
                                                                                        setSelectedHistoryRecords(prev => Array.from(new Set([...prev, ...histIds])));
                                                                                    } else {
                                                                                        setSelectedHistoryRecords(prev => prev.filter(id => !histIds.includes(id)));
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                                    {getStudentHistory(student.id).map((item) => (
                                                                        <tr key={item.id} className={`transition-colors ${selectedHistoryRecords.includes(item.id) ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                                                            <td className="px-4 py-3 text-slate-500 font-mono">{new Date(item.date).toLocaleDateString()}</td>
                                                                            <td className="px-4 py-3">
                                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${item.type === 'Nota' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>{item.type}</span>
                                                                            </td>
                                                                            <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{item.detail}</td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                {item.type === 'Nota' ? <span className="font-bold text-sm">{item.value}</span> : <span className="font-bold text-slate-800 dark:text-white text-sm">{item.value}</span>}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-slate-500 italic max-w-[250px] truncate" title={(item.raw as any).comments || ''}>{(item.raw as any).comments || '-'}</td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <div className="flex justify-center gap-2">
                                                                                    <button onClick={() => setEditingRecord(item)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg"><EditIcon className="w-4 h-4" /></button>
                                                                                    <button onClick={() => setDeleteTarget([item.id])} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300 cursor-pointer" 
                                                                                    checked={selectedHistoryRecords.includes(item.id)}
                                                                                    onChange={() => handleSelectHistoryRecord(item.id)}
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {isClassSearchModalOpen && (
                <ClassSearchModal 
                    onClose={() => setIsClassSearchModalOpen(false)} 
                    onSelect={(id: string) => setSelectedClassId(id)}
                    myClasses={myClasses}
                    teachers={teachers}
                    campuses={campuses}
                />
            )}
            {isConceptsBulkModalOpen && (
                <BulkUploadConceptsModal
                    onClose={() => setIsConceptsBulkModalOpen(false)}
                    onSave={async (data) => {
                        let count = 0;
                        let nextCodeNumber = concepts.length > 0 ? 
                            Math.max(...concepts.map(c => parseInt(c.code.replace(/[^\d]/g, '')) || 0)) + 1 
                            : 1;

                        for(const item of data) {
                            if (!concepts.find(c => c.text.toLowerCase() === item.text.toLowerCase())) {
                                try {
                                    const codeStr = nextCodeNumber.toString().padStart(2, '0');
                                    await addConcept({ code: codeStr, text: item.text });
                                    nextCodeNumber++;
                                    count++;
                                } catch(e) {
                                    console.error("Error added concept", e);
                                }
                            }
                        }
                        setIsConceptsBulkModalOpen(false);
                        alert(`Se importaron ${count} conceptos nuevos exitosamente.`);
                    }}
                />
            )}
            {isBulkModalOpen && <BulkUploadModal onClose={() => setIsBulkModalOpen(false)} onSave={handleBulkSave} classStudents={classStudents} isReadOnly={isReadOnly} concepts={concepts} />}
            {isConceptModalOpen && <AddCustomConceptModal onClose={() => setIsConceptModalOpen(false)} onSave={handleSaveCustomConcept} />}
            {editingRecord && <EditRecordModal record={editingRecord} onClose={() => setEditingRecord(null)} onSave={handleUpdateRecord} concepts={concepts} />}
            
            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                        <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Confirmar Eliminación</h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-6 font-medium">
                            ¿Estás seguro de eliminar {deleteTarget.length === 1 ? 'este registro' : `los ${deleteTarget.length} registros seleccionados`}? Esta acción es irreversible.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={executeDeleteHistoryRecords} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassAnnotationsPage;
