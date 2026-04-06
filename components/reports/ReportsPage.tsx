import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Student, UserRole, Grade } from '../../types';
import Card from '../ui/Card';
import { DocumentTextIcon, DownloadIcon, ClipboardDocumentListIcon, ChevronDownIcon } from '../icons';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { conceptsCSV, getPeriodFromDate } from '../teachers/GradesPage';

const ReportsPage: React.FC = () => {
    const { user } = useAuth();
    const { students: allStudents, grades, attendanceRecords, teachers, assignments, globalSettings, campusSettings } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [concepts, setConcepts] = useState<{ code: string; text: string }[]>([]);
    const [numberOfPeriods, setNumberOfPeriods] = useState(4);

    // Form States
    const [reportType, setReportType] = useState<'boletin' | 'puestos' | 'consolidado' | 'valoracion' | 'libro_final'>('boletin');
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [filterPeriod, setFilterPeriod] = useState(1);
    const [selectedStudentId, setSelectedStudentId] = useState('');

    // Helper to get settings based on context
    const getSettings = () => {
        let settings: any = {
            schoolName: 'Institución Educativa',
            schoolLogo: '',
            rector: 'Rector',
            address: '',
            city: '',
            contactPhone: '',
            contactEmail: '',
            schoolYear: new Date().getFullYear(),
            numberOfPeriods: 4
        };

        if (globalSettings) {
            settings = { ...settings, ...globalSettings };
        }
        
        if (user?.campusId && campusSettings) {
            settings = { ...settings, ...campusSettings };
        }
        return settings;
    };

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

        // Load number of periods from settings
        const settings = getSettings();
        if (settings && settings.numberOfPeriods) {
            setNumberOfPeriods(settings.numberOfPeriods);
        }
    }, [user, globalSettings, campusSettings]);

    // Filtered students for dropdown and table
    const studentsForContext = useMemo(() => {
        if (!user) return [];
        let filtered = allStudents;

        if (user.role === UserRole.STUDENT) {
            return allStudents.filter(s => s.id === user.id);
        }
        if (user.role === UserRole.PARENT) {
            return allStudents.filter(s => s.id === (user as any).studentId); 
        }
        
        if (user.role === UserRole.CAMPUS_ADMIN || user.role === UserRole.TEACHER) {
            filtered = filtered.filter(s => s.campusId === user.campusId);
        }
        
        if (filterClass) {
            filtered = filtered.filter(s => s.class === filterClass);
        }
        if (filterSection) {
            filtered = filtered.filter(s => s.section === filterSection);
        }

        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [user, allStudents, filterClass, filterSection]);

    const accessibleStudents = useMemo(() => {
        return studentsForContext.filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.documentNumber.includes(searchQuery)
        );
    }, [studentsForContext, searchQuery]);

    const getQualitativeScore = (score: number) => {
        if (score >= 4.6) return 'Superior';
        if (score >= 4.0) return 'Alto';
        if (score >= 3.0) return 'Básico';
        return 'Bajo';
    };

    const getConceptText = (code?: string) => {
        if (!code) return '';
        const concept = concepts.find(c => c.code === code);
        return concept ? concept.text : '';
    };

    // Heuristic to split full name into Last Name and First Name
    const splitName = (fullName: string) => {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length >= 3) {
            const lastName = parts.slice(-2).join(' ');
            const firstName = parts.slice(0, -2).join(' ');
            return { lastName, firstName };
        } else if (parts.length === 2) {
            return { lastName: parts[1], firstName: parts[0] };
        }
        return { lastName: '', firstName: fullName };
    };

    const calculateStudentAverages = (studentId: string) => {
        const studentGrades = grades.filter(g => g.studentId === studentId);
        const subjects = Array.from(new Set(studentGrades.map(g => g.subject)));
        
        let periodSum = 0;
        let periodCount = 0;
        let accumSum = 0;
        let accumCount = 0;

        subjects.forEach(subject => {
            const subjectGrades = studentGrades.filter(g => g.subject === subject);
            
            // --- Period Average Calculation ---
            const pGrades = subjectGrades.filter(g => getPeriodFromDate(g.date, numberOfPeriods) === filterPeriod);
            if (pGrades.length > 0) {
                const totalScore = pGrades.reduce((acc, g) => acc + (g.score * g.percentage/100), 0);
                const totalPerc = pGrades.reduce((acc, g) => acc + g.percentage, 0);
                const final = totalPerc > 0 ? (totalScore * 100) / totalPerc : 0;
                
                if (final > 0) {
                    periodSum += final;
                    periodCount++;
                }
            }

            // --- Accumulated Calculation ---
            let subjectAccumSum = 0;
            let subjectAccumCount = 0;
            for(let p = 1; p <= filterPeriod; p++) {
                 const progGrades = subjectGrades.filter(g => getPeriodFromDate(g.date, numberOfPeriods) === p);
                 if (progGrades.length > 0) {
                    const tScore = progGrades.reduce((acc, g) => acc + (g.score * g.percentage/100), 0);
                    const tPerc = progGrades.reduce((acc, g) => acc + g.percentage, 0);
                    const pFinal = tPerc > 0 ? (tScore * 100) / tPerc : 0;
                    if (pFinal > 0) {
                        subjectAccumSum += pFinal;
                        subjectAccumCount++;
                    }
                 }
            }
            if (subjectAccumCount > 0) {
                accumSum += (subjectAccumSum / subjectAccumCount);
                accumCount++;
            }
        });

        const periodAverage = periodCount > 0 ? periodSum / periodCount : 0;
        const accumulatedAverage = accumCount > 0 ? accumSum / accumCount : 0;

        return { periodAverage, accumulatedAverage };
    };

    // --- SHARED PDF HELPERS ---

    const getSchoolHeader = (doc: any) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        renderTextHeader(doc, pageWidth);
    };

    const renderTextHeader = (doc: any, pageWidth: number) => {
        const settings = getSettings();
        if (settings.schoolLogo) {
            try {
                doc.addImage(settings.schoolLogo, 'PNG', 15, 10, 20, 20);
            } catch (e) { console.error("Error adding logo:", e); }
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, 16, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const infoText = [];
        if (settings.address) infoText.push(`Dirección: ${settings.address}`);
        if (settings.city) infoText.push(`Ciudad: ${settings.city}`);
        if (settings.contactPhone) infoText.push(`Teléfono: ${settings.contactPhone}`);
        if (settings.contactEmail) infoText.push(`Email: ${settings.contactEmail}`);
        
        if (infoText.length > 0) {
            doc.text(infoText.join(' | '), pageWidth / 2, 22, { align: 'center' });
        }
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`AÑO LECTIVO ${settings.schoolYear}`, pageWidth / 2, 28, { align: 'center' });
    };

    const addSignatures = (doc: any, startY: number) => {
        const settings = getSettings();
        const rectorName = settings.rector ? settings.rector.toUpperCase() : 'RECTOR';

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        let sigY = startY + 30;
        // Ensure space for signature
        if (sigY + 25 > pageHeight - 15) {
            doc.addPage();
            sigY = 40; 
        }

        doc.setLineWidth(0.3);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        // Rector Signature (Left)
        doc.line(20, sigY, 90, sigY);
        doc.text(rectorName, 20, sigY + 5);
        doc.text('RECTOR', 20, sigY + 10);

        // Director Signature (Right)
        const rightSigStart = pageWidth - 90;
        const rightSigEnd = pageWidth - 20;
        
        doc.line(rightSigStart, sigY, rightSigEnd, sigY);
        doc.text('DIRECTOR DE GRUPO', rightSigStart, sigY + 5);
    };

    // --- REPORT GENERATORS ---

    const generateConsolidadoPDF = () => {
        if (!filterClass || !filterSection) {
            alert("Por favor seleccione un grado y un grupo para generar el consolidado.");
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape' });
        getSchoolHeader(doc);

        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`CONSOLIDADO DE NOTAS - PERIODO ${filterPeriod}`, pageWidth / 2, 45, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`CURSO: ${filterClass} - ${filterSection}`, 15, 52);
        
        const groupStudentIds = studentsForContext.map(s => s.id);
        const groupGrades = grades.filter(g => groupStudentIds.includes(g.studentId));
        const subjectsSet = new Set(groupGrades.map(g => g.subject));
        const subjects = Array.from(subjectsSet).sort();

        const headRow = ['No.', 'Estudiante', ...subjects, 'PROM', 'PUESTO'];

        const bodyData = studentsForContext.map((student, index) => {
            const { periodAverage } = calculateStudentAverages(student.id);
            
            const row: any[] = [
                index + 1,
                student.name.toUpperCase()
            ];

            subjects.forEach(subject => {
                const subjectGrades = grades.filter(g => 
                    g.studentId === student.id && 
                    g.subject === subject && 
                    getPeriodFromDate(g.date, numberOfPeriods) === filterPeriod
                );

                if (subjectGrades.length > 0) {
                    const totalScore = subjectGrades.reduce((acc, g) => acc + (g.score * g.percentage/100), 0);
                    const totalPerc = subjectGrades.reduce((acc, g) => acc + g.percentage, 0);
                    const final = totalPerc > 0 ? (totalScore * 100) / totalPerc : 0;
                    row.push(final.toFixed(1));
                } else {
                    row.push('-');
                }
            });

            row.push(periodAverage.toFixed(2));
            row.push(0); 
            return { raw: row, avg: periodAverage };
        });

        const ranked = [...bodyData].sort((a, b) => b.avg - a.avg);
        bodyData.forEach(item => {
            const rank = ranked.findIndex(r => r === item) + 1;
            item.raw[item.raw.length - 1] = rank;
        });

        autoTable(doc, {
            startY: 55,
            head: [headRow],
            body: bodyData.map(d => d.raw),
            theme: 'grid',
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: [0, 0, 0],
                fontSize: 7,
                halign: 'center',
                valign: 'middle'
            },
            styles: {
                fontSize: 7,
                cellPadding: 1,
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                textColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 8 }, 
                1: { cellWidth: 60 },
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index >= 2 && data.column.index < subjects.length + 2) {
                    const val = parseFloat(data.cell.raw as string);
                    if (!isNaN(val) && val < 3.0) {
                        data.cell.styles.textColor = [255, 0, 0];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        addSignatures(doc, (doc as any).lastAutoTable.finalY);
        doc.save(`Consolidado_${filterClass}_${filterSection}_P${filterPeriod}.pdf`);
    };

    const generateValoracionPDF = () => {
        if (!filterClass || !filterSection) {
            alert("Por favor seleccione un grado y un grupo para generar el informe de valoración.");
            return;
        }

        const doc = new jsPDF();
        getSchoolHeader(doc);

        const campusName = user?.campusName || 'Principal';
        
        // Find Director (first teacher assigned to this class)
        const classTeacherAssignment = assignments.find(a => a.class === filterClass && a.section === filterSection);
        const classTeacher = classTeacherAssignment ? teachers.find(t => t.id === classTeacherAssignment.teacherId) : null;
        const directorName = classTeacher ? classTeacher.name.toUpperCase() : 'DOCENTE ENCARGADO';

        // Table 1: Context Info
        autoTable(doc, {
            startY: 45,
            head: [['id', 'Curso', 'Jornada', 'Director de grupo']],
            body: [['1', `${filterClass}-${campusName}`, 'Diurna', directorName]],
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] }
        });

        // Prepare Data
        const rankingData = studentsForContext.map(student => {
            const { periodAverage } = calculateStudentAverages(student.id);
            const { lastName, firstName } = splitName(student.name);
            return {
                code: student.documentNumber,
                lastName: lastName.toUpperCase(),
                firstName: firstName.toUpperCase(),
                pAvg: periodAverage,
                val: getQualitativeScore(periodAverage)
            };
        });

        // Sort descending by average
        rankingData.sort((a, b) => b.pAvg - a.pAvg);

        const tableBody = rankingData.map((d, index) => [
            `Puesto ${index + 1}`,
            d.code,
            d.lastName,
            d.firstName,
            d.pAvg.toFixed(2),
            d.val
        ]);

        // Table 2: Data
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 5,
            head: [['Puesto', 'Codigo', 'Apellido', 'Nombre', 'Promedio', 'Valoración']],
            body: tableBody,
            theme: 'plain', 
            styles: {
                fontSize: 9,
                cellPadding: 1,
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                textColor: [0, 0, 0]
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 20 },
                2: { cellWidth: 40 },
                3: { cellWidth: 40 },
                4: { cellWidth: 20, halign: 'center' },
                5: { cellWidth: 30, halign: 'center' }
            }
        });

        addSignatures(doc, (doc as any).lastAutoTable.finalY);
        doc.save(`Valoracion_${filterClass}_${filterSection}_P${filterPeriod}.pdf`);
    };

    const generateRankingsPDF = () => {
        if (!filterClass || !filterSection) {
            alert("Por favor seleccione un grado y un grupo para generar el informe de puestos.");
            return;
        }
        const doc = new jsPDF();
        getSchoolHeader(doc);
        const campusName = user?.campusName || 'Principal';
        
        autoTable(doc, {
            startY: 42,
            head: [['Curso:', 'Sede:', 'Jornada:']],
            body: [[`${filterClass} - ${filterSection}`, campusName, 'Diurna']],
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 1 },
            headStyles: { fontStyle: 'bold' }
        });

        const rankingData = studentsForContext.map(student => {
            const { periodAverage } = calculateStudentAverages(student.id);
            const { lastName, firstName } = splitName(student.name);
            return {
                code: student.documentNumber,
                lastName: lastName.toUpperCase(),
                firstName: firstName.toUpperCase(),
                pAvg: periodAverage,
            };
        });

        rankingData.sort((a, b) => b.pAvg - a.pAvg);

        const tableBody = rankingData.map((d, index) => [
            index + 1,
            d.code,
            d.lastName,
            d.firstName,
            d.pAvg.toFixed(2),
            getQualitativeScore(d.pAvg)
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 5,
            head: [['Puesto', 'Código', 'Apellido', 'Nombre', 'Promedio', 'Valoración']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] },
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1, fontSize: 9, textColor: [0, 0, 0] },
        });

        addSignatures(doc, (doc as any).lastAutoTable.finalY);
        doc.save(`Puestos_${filterClass}_${filterSection}_P${filterPeriod}.pdf`);
    };

    const generateLibroFinalPDF = () => {
        if (!filterClass || !filterSection) {
            alert("Por favor seleccione un grado y un grupo para generar el Libro Final.");
            return;
        }

        const doc = new jsPDF();
        
        studentsForContext.forEach((student, index) => {
            if (index > 0) doc.addPage();
            getSchoolHeader(doc); // Apply specific header image for every student

            const { lastName, firstName } = splitName(student.name);
            const campusName = student.campusName || 'Principal';

            // 1. Student Information Table (Replicating the screenshot layout)
            autoTable(doc, {
                startY: 45,
                head: [['id', 'Código', 'Apellido', 'Nombre']],
                body: [[
                    student.documentNumber.slice(-3) || '000', // Mocking short ID from screenshot
                    student.documentNumber,
                    lastName.toUpperCase(),
                    firstName.toUpperCase()
                ]],
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                headStyles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] }
            });

            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY,
                head: [['Curso:', 'Sede:', 'Jornada:']],
                body: [[`${filterClass} - ${filterSection}`, campusName, 'Diurna']],
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                headStyles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] }
            });

            // 2. Grades Table
            const studentGrades = grades.filter(g => g.studentId === student.id);
            const subjects = Array.from(new Set(studentGrades.map(g => g.subject)));
            
            // Build Columns based on numberOfPeriods
            const headCols = ['Materias'];
            for(let i=1; i<=numberOfPeriods; i++) headCols.push(`Nota ${i}`);
            headCols.push('Prom', 'Valoración F', 'Fecha');

            const tableBody: any[] = [];

            subjects.forEach(subject => {
                const subjectGrades = studentGrades.filter(g => g.subject === subject);
                const rowData: any[] = [subject.toUpperCase()];
                
                let sum = 0;
                let count = 0;

                // Period Grades
                for(let p = 1; p <= numberOfPeriods; p++) {
                    const pGrades = subjectGrades.filter(g => getPeriodFromDate(g.date, numberOfPeriods) === p);
                    if (pGrades.length > 0) {
                        const totalScore = pGrades.reduce((acc, g) => acc + (g.score * g.percentage/100), 0);
                        const totalPerc = pGrades.reduce((acc, g) => acc + g.percentage, 0);
                        const final = totalPerc > 0 ? (totalScore * 100) / totalPerc : 0;
                        rowData.push(final.toFixed(1));
                        sum += final;
                        count++;
                    } else {
                        rowData.push('');
                    }
                }

                // Average
                const average = count > 0 ? sum / count : 0;
                rowData.push(average.toFixed(1)); // Prom
                rowData.push(getQualitativeScore(average)); // Valoración F
                rowData.push(''); // Fecha (Empty in screenshot)

                tableBody.push(rowData);
            });

            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY,
                head: [headCols],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], fontSize: 8, halign: 'center', fontStyle: 'bold' },
                styles: { lineColor: [0, 0, 0], lineWidth: 0.1, fontSize: 8, textColor: [0, 0, 0], valign: 'middle', cellPadding: 1 },
                columnStyles: { 0: { cellWidth: 'auto' } } // Auto width for subject name
            });

            let finalY = (doc as any).lastAutoTable.finalY + 5;

            // 3. Footer Boxes
            const boxes = [
                { title: 'Observaciones:', height: 10 },
                { title: 'Comportamiento:', height: 10 },
                { title: 'Promovido al grado:', extra: 'Debe recuperar: Si______ No_____', height: 8 }
            ];

            boxes.forEach(box => {
                // Check page break
                if (finalY + box.height + 5 > doc.internal.pageSize.getHeight()) {
                    doc.addPage();
                    finalY = 40;
                }

                doc.setLineWidth(0.1);
                doc.rect(14, finalY, 182, box.height);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(box.title, 16, finalY + 4);
                if (box.extra) {
                    doc.text(box.extra, 100, finalY + 6);
                }
                finalY += box.height + 2;
            });

            // 4. Specific Signatures
            finalY += 20;
            if (finalY + 15 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                finalY = 40;
            }

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');

            // Hardcoded specific names as requested in OCR
            const rectorName = "JAIRO ROLANDO CABRERA CASABÓN";
            const secretarioName = "ALBERTO ABSALÓN CÓRDOBA FUERTES";

            doc.text(rectorName, 20, finalY);
            doc.text(secretarioName, 110, finalY);
            
            doc.text("Rector", 35, finalY + 4);
            doc.text("Secretario", 125, finalY + 4);

        });

        doc.save(`Libro_Final_${filterClass}_${filterSection}.pdf`);
    };

    const generateBoletinContent = (student: Student, doc: any) => {
        getSchoolHeader(doc);

        const studentInfoBody = [[
            student.id.substring(0,6) || '-',
            student.documentNumber,
            student.name.split(' ')[1] || '',
            student.name.split(' ')[0] || '',
            student.class + ' ' + student.section,
            student.campusName || 'Principal',
            'Diurna'
        ]];

        autoTable(doc, {
            startY: 45,
            head: [['Id', 'Código', 'Apellido', 'Nombre', 'Curso:', 'Sede:', 'Jornada:']],
            body: studentInfoBody,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0,0,0] }
        });

        const studentGrades = grades.filter(g => g.studentId === student.id);
        const subjects = Array.from(new Set(studentGrades.map(g => g.subject)));
        const tableBody: any[] = [];

        subjects.forEach(subject => {
            const subjectGrades = studentGrades.filter(g => g.subject === subject);
            const periodData: any = {};
            
            for(let p = 1; p <= numberOfPeriods; p++) {
                const pGrades = subjectGrades.filter(g => getPeriodFromDate(g.date, numberOfPeriods) === p);
                if (pGrades.length > 0) {
                    const totalScore = pGrades.reduce((acc, g) => acc + (g.score * g.percentage/100), 0);
                    const totalPerc = pGrades.reduce((acc, g) => acc + g.percentage, 0);
                    const final = totalPerc > 0 ? (totalScore * 100) / totalPerc : 0;
                    
                    const faults = attendanceRecords
                        .filter(r => r.studentId === student.id && r.period === p && r.status !== 'Presente')
                        .reduce((acc, r) => acc + (r.count || 1), 0);

                    periodData[p] = { grade: final, faults };
                } else {
                    periodData[p] = { grade: 0, faults: 0 };
                }
            }

            let accGradeSum = 0;
            let accGradeCount = 0;
            let accFaults = 0;
            Object.values(periodData).forEach((d: any) => {
                if (d.grade > 0) {
                    accGradeSum += d.grade;
                    accGradeCount++;
                }
                accFaults += d.faults;
            });
            const avgGrade = accGradeCount > 0 ? accGradeSum / accGradeCount : 0;
            const qualitative = getQualitativeScore(avgGrade);
            const teacher = teachers.find(t => t.subject === subject && t.campusId === student.campusId);
            const teacherName = teacher ? teacher.name : 'N/A';
            const lastGrade = subjectGrades[subjectGrades.length - 1];
            const descriptor = getConceptText(lastGrade?.conceptCode) || "El estudiante demuestra las competencias básicas esperadas para el grado.";

            const rowData = [
                subject.toUpperCase(),
                periodData[1]?.grade ? periodData[1].grade.toFixed(1) : '',
                periodData[1]?.faults || 0,
                periodData[2]?.grade ? periodData[2].grade.toFixed(1) : '',
                periodData[2]?.faults || 0,
                periodData[3]?.grade ? periodData[3].grade.toFixed(1) : '',
                periodData[3]?.faults || 0,
                qualitative,
                accFaults,
                avgGrade.toFixed(1)
            ];
            tableBody.push(rowData);
            tableBody.push([{ content: `Profesor ${teacherName}`, colSpan: 10, styles: { fontStyle: 'italic', fontSize: 8, textColor: 50, cellPadding: {top:0, bottom: 0, left: 2} } }]);
            tableBody.push([{ content: descriptor, colSpan: 10, styles: { fontSize: 8, cellPadding: {top:0, bottom: 2, left: 2} } }]);
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 2,
            head: [['Asignatura', 'P.1', 'f.1', 'P.2', 'f.2', 'P.3', 'f.3', 'Desempeño', 'A. Faltas', 'A. nota']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], fontSize: 8, halign: 'center' },
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1, fontSize: 9, textColor: [0, 0, 0], valign: 'middle' },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 8, halign: 'center' }, 2: { cellWidth: 8, halign: 'center' }, 3: { cellWidth: 8, halign: 'center' }, 4: { cellWidth: 8, halign: 'center' }, 5: { cellWidth: 8, halign: 'center' }, 6: { cellWidth: 8, halign: 'center' }, 7: { cellWidth: 20, halign: 'center' }, 8: { cellWidth: 15, halign: 'center' }, 9: { cellWidth: 15, halign: 'center' } }
        });

        let finalY = (doc as any).lastAutoTable.finalY + 5;
        if (finalY + 20 > doc.internal.pageSize.getHeight()) { doc.addPage(); finalY = 40; }

        autoTable(doc, {
            startY: finalY,
            body: [['Observaciones:', '']],
            theme: 'plain',
            styles: { cellPadding: 1, fontSize: 9 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 } }
        });
        
        doc.setLineWidth(0.1);
        doc.rect(14, finalY + 7, 182, 12); 
        doc.setFontSize(8);
        doc.text('Escala de Desempeño Bajo: 1 a 2.99; Básico: 3 a 3.99; Alto: 4 a 4.59; Superior: 4.6 a 5;', 105, finalY + 25, { align: 'center' });

        addSignatures(doc, finalY + 25);
    };

    const handleGenerate = () => {
        if (reportType === 'puestos') {
            generateRankingsPDF();
        } else if (reportType === 'consolidado') {
            generateConsolidadoPDF();
        } else if (reportType === 'valoracion') {
            generateValoracionPDF();
        } else if (reportType === 'libro_final') {
            generateLibroFinalPDF();
        } else {
            if (selectedStudentId === 'all') {
                if (!filterClass || !filterSection) {
                    alert("Por favor seleccione un grado y un grupo para generar boletines para todos.");
                    return;
                }
                if (studentsForContext.length === 0) {
                    alert("No hay estudiantes en este curso.");
                    return;
                }
                const doc = new jsPDF();
                studentsForContext.forEach((student, index) => {
                    if (index > 0) doc.addPage();
                    generateBoletinContent(student, doc);
                });
                doc.save(`Boletines_${filterClass}_${filterSection}.pdf`);
            } else {
                const student = studentsForContext.find(s => s.id === selectedStudentId);
                if (student) {
                    const doc = new jsPDF();
                    generateBoletinContent(student, doc);
                    doc.save(`Boletin_${student.name}.pdf`);
                } else {
                    alert("Por favor seleccione un estudiante.");
                }
            }
        }
    };

    return (
        <Card>
            {/* Header */}
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-6">Generador de Informes</h2>

            {/* Form */}
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
                    {/* Report Type */}
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Tipo de Informe</label>
                        <select 
                            value={reportType} 
                            onChange={e => setReportType(e.target.value as any)}
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="boletin">Boletín de Notas</option>
                            <option value="libro_final">Libro Final</option>
                            <option value="puestos">Puestos (Ranking)</option>
                            <option value="consolidado">Consolidado (Sábana)</option>
                            <option value="valoracion">Informe de Valoración</option>
                        </select>
                    </div>

                    {/* Period */}
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Periodo</label>
                        <select 
                            value={filterPeriod} 
                            onChange={e => setFilterPeriod(Number(e.target.value))} 
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
                    {/* Grade */}
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Grado</label>
                        <select 
                            value={filterClass} 
                            onChange={e => { setFilterClass(e.target.value); setSelectedStudentId(''); }} 
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Seleccione Grado...</option>
                            <optgroup label="Preescolar">
                                <option value="Pre jardín">Pre jardín</option>
                                <option value="Jardín">Jardín</option>
                                <option value="Transición">Transición</option>
                            </optgroup>
                            <optgroup label="Primaria">
                                <option value="1ro">1ro</option>
                                <option value="2do">2do</option>
                                <option value="3ro">3ro</option>
                                <option value="4to">4to</option>
                                <option value="5to">5to</option>
                            </optgroup>
                            <optgroup label="Secundaria">
                                <option value="6">6</option>
                                <option value="7">7</option>
                                <option value="8">8</option>
                                <option value="9">9</option>
                                <option value="10">10</option>
                                <option value="11">11</option>
                            </optgroup>
                        </select>
                    </div>

                    {/* Section */}
                    <div>
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">Grupo</label>
                        <select 
                            value={filterSection} 
                            onChange={e => { setFilterSection(e.target.value); setSelectedStudentId(''); }} 
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Seleccione Grupo...</option>
                            {['1', '2', '3', 'A', 'B'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Student Select (Only for Boletín) */}
                    {reportType === 'boletin' && (
                        <div className="animate-fade-in-up">
                            <label className="block text-sm font-bold mb-1 dark:text-gray-300">Estudiante</label>
                            <select 
                                value={selectedStudentId} 
                                onChange={e => setSelectedStudentId(e.target.value)} 
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!filterClass}
                            >
                                <option value="">{filterClass ? 'Seleccione Estudiante...' : 'Seleccione Grado Primero'}</option>
                                {filterClass && filterSection && <option value="all">Todos los estudiantes</option>}
                                {studentsForContext.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-6 border-t pt-4 dark:border-gray-600">
                    <button 
                        onClick={handleGenerate}
                        disabled={(reportType === 'boletin' && !selectedStudentId) || (reportType !== 'boletin' && (!filterClass || !filterSection))}
                        className="bg-red-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md"
                    >
                        <DocumentTextIcon className="w-5 h-5" />
                        Generar PDF
                    </button>
                </div>
            </div>

            {/* List View */}
            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-text-primary dark:text-white">Vista Previa de Estudiantes</h3>
                    <input 
                        type="text" 
                        placeholder="Filtrar lista..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)}
                        className="p-2 border rounded text-sm bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
                <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-800 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">Nombre</th>
                                <th className="px-6 py-3">Documento</th>
                                <th className="px-6 py-3">Curso</th>
                                <th className="px-6 py-3 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accessibleStudents.length > 0 ? (
                                accessibleStudents.map(student => (
                                    <tr key={student.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{student.name}</td>
                                        <td className="px-6 py-4">{student.documentNumber}</td>
                                        <td className="px-6 py-4">{student.class} - {student.section}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {student.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        No se encontraron estudiantes con los filtros seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    );
};

export default ReportsPage;