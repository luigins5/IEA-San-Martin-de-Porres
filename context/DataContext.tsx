
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { 
    Campus, AdminUser, Teacher, Student, Grade, Communication, Message, ClassSchedule, Exam, TeacherCourseAssignment, UserRole, AttendanceRecord, SchoolEvent
} from '../types';
import { useAuth } from './AuthContext';
import { db, auth } from '../firebase';
import { 
    collection, 
    doc, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    setDoc, 
    getDoc, 
    query, 
    where, 
    orderBy, 
    Timestamp,
    getDocFromServer,
    or
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface DataContextType {
    campuses: Campus[];
    admins: AdminUser[];
    teachers: Teacher[];
    students: Student[];
    grades: Grade[];
    communications: Communication[];
    messages: Message[];
    schedules: ClassSchedule[];
    exams: Exam[];
    assignments: TeacherCourseAssignment[];
    attendanceRecords: AttendanceRecord[];
    events: SchoolEvent[];
    cancellations: {classScheduleId: string, date: string}[];
    homeroomAssignments: Record<string, string>;
    globalSettings: any;
    campusSettings: any;

    setHomeroomAssignments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    isLoading: boolean;
    setCampuses: React.Dispatch<React.SetStateAction<Campus[]>>;
    setAdmins: React.Dispatch<React.SetStateAction<AdminUser[]>>;
    setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;

    // CRUD Functions
    addCampus: (data: Omit<Campus, 'id' | 'teachers' | 'students'>) => Promise<void>;
    updateCampus: (id: string, data: Partial<Omit<Campus, 'id' | 'teachers' | 'students'>>) => Promise<void>;
    deleteCampus: (id: string) => Promise<void>;

    addAdmin: (data: Omit<AdminUser, 'id' | 'role' | 'avatar'>) => Promise<void>;
    updateAdmin: (id: string, data: Partial<AdminUser>) => Promise<void>;
    deleteAdmin: (id: string) => Promise<void>;

    addTeacher: (data: Omit<Teacher, 'id' | 'role' | 'avatar'>) => Promise<void>;
    updateTeacher: (id: string, data: Partial<Teacher>) => Promise<void>;
    deleteTeacher: (id: string) => Promise<void>;

    addStudent: (data: Omit<Student, 'id' | 'role' | 'avatar' | 'rollNumber'>) => Promise<void>;
    updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;

    addGrade: (data: Omit<Grade, 'id'>) => Promise<void>;
    updateGrade: (id: string, data: Partial<Grade>) => Promise<void>;
    deleteGrade: (id: string) => Promise<void>;
    
    addCommunication: (data: Omit<Communication, 'id' | 'date'>) => Promise<void>;
    updateCommunication: (id: string, data: Partial<Communication>) => Promise<void>;
    deleteCommunication: (id: string) => Promise<void>;
    
    addMessage: (data: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
    updateMessage: (id: string, data: Partial<Message>) => Promise<void>;
    deleteMessage: (id: string) => Promise<void>;
    
    addExam: (data: Omit<Exam, 'id'>) => Promise<void>;
    updateExam: (id: string, data: Partial<Exam>) => Promise<void>;
    deleteExam: (id: string) => Promise<void>;

    addSchedule: (data: Omit<ClassSchedule, 'id'>) => Promise<void>;
    updateSchedule: (id: string, data: Partial<ClassSchedule>) => Promise<void>;
    deleteSchedule: (id: string) => Promise<void>;
    
    addAssignment: (data: Omit<TeacherCourseAssignment, 'id'>) => Promise<void>;
    updateAssignment: (id: string, data: Partial<TeacherCourseAssignment>) => Promise<void>;
    deleteAssignment: (id: string) => Promise<void>;

    addEvent: (data: Omit<SchoolEvent, 'id'>) => Promise<void>;
    updateEvent: (id: string, data: Partial<SchoolEvent>) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;

    saveAttendance: (data: Omit<AttendanceRecord, 'id'>) => Promise<void>;
    deleteAttendance: (id: string) => Promise<void>;

    updateUserAvatar: (userId: string, role: UserRole, avatar: string) => Promise<void>;
    assignTemporaryPassword: (userId: string, role: UserRole, tempPass: string) => Promise<void>;
    
    getUserSetting: (userId: string, key: string) => Promise<any>;
    setUserSetting: (userId: string, key: string, value: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children?: ReactNode }) => {
    const { isAuthenticated, user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    const [campuses, setCampuses] = useState<Campus[]>([]);
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [assignments, setAssignments] = useState<TeacherCourseAssignment[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [cancellations, setCancellations] = useState<{classScheduleId: string, date: string}[]>([]);
    const [homeroomAssignments, setHomeroomAssignments] = useState<Record<string, string>>({});
    
    const [globalSettings, setGlobalSettings] = useState<any>(null);
    const [campusSettings, setCampusSettings] = useState<any>(null);

    // Validate connection to Firestore
    useEffect(() => {
        async function testConnection() {
            try {
                await getDocFromServer(doc(db, 'test', 'connection'));
            } catch (error) {
                if(error instanceof Error && error.message.includes('the client is offline')) {
                    console.error("Please check your Firebase configuration. ");
                }
            }
        }
        testConnection();
    }, []);

    // Fetch initial data using onSnapshot for real-time updates
    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsubscribes: (() => void)[] = [];

        const collections = [
            { name: 'campuses', setter: setCampuses },
            { name: 'admins', setter: setAdmins },
            { name: 'teachers', setter: setTeachers },
            { name: 'students', setter: setStudents },
            { name: 'assignments', setter: setAssignments },
            { name: 'attendance', setter: setAttendanceRecords },
            { name: 'communications', setter: setCommunications },
            { name: 'schedules', setter: setSchedules },
            { name: 'exams', setter: setExams },
            { name: 'events', setter: setEvents },
            { name: 'grades', setter: setGrades }
        ];

        collections.forEach(({ name, setter }) => {
            const unsub = onSnapshot(collection(db, name), (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
                setter(data);
            }, (error) => {
                handleFirestoreError(error, OperationType.LIST, name);
            });
            unsubscribes.push(unsub);
        });

        // Handle messages separately based on role
        let messagesQuery;
        if (user?.role === 'Super Administrador' || user?.role === 'Administrador de Sede') {
            messagesQuery = collection(db, 'messages');
        } else {
            messagesQuery = query(
                collection(db, 'messages'),
                or(
                    where('senderId', '==', user?.id),
                    where('recipientId', '==', user?.id)
                )
            );
        }

        const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
            setMessages(data);
        }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'messages');
        });
        unsubscribes.push(unsubMessages);

        // Global settings
        const unsubGlobal = onSnapshot(doc(db, 'user_settings', 'global'), (doc) => {
            if (doc.exists()) {
                setGlobalSettings(doc.data().value);
            }
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'user_settings/global');
        });
        unsubscribes.push(unsubGlobal);

        // Campus settings
        if (user?.campusId) {
            const unsubCampus = onSnapshot(doc(db, 'user_settings', `campus_${user.campusId}`), (doc) => {
                if (doc.exists()) {
                    setCampusSettings(doc.data().value);
                }
            }, (error) => {
                handleFirestoreError(error, OperationType.GET, `user_settings/campus_${user.campusId}`);
            });
            unsubscribes.push(unsubCampus);
        }

        setIsLoading(false);

        return () => unsubscribes.forEach(unsub => unsub());
    }, [isAuthenticated, user]);
    
    // Update campus counts dynamically based on local data
    useEffect(() => {
        const studentCounts = students.reduce((acc, student) => {
            if (student.campusId) acc[student.campusId] = (acc[student.campusId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const teacherCounts = teachers.reduce((acc, teacher) => {
            if (teacher.campusId) acc[teacher.campusId] = (acc[teacher.campusId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        setCampuses(prev => prev.map(campus => ({ 
            ...campus, 
            students: studentCounts[campus.id] || 0, 
            teachers: teacherCounts[campus.id] || 0
        })));
    }, [students, teachers]);


    // Generic CRUD Mappings using Firestore
    const sanitizeData = (data: any) => {
        const sanitized = { ...data };
        Object.keys(sanitized).forEach(key => {
            if (sanitized[key] === undefined) {
                delete sanitized[key];
            }
        });
        return sanitized;
    };

    const addCampus = async (data: any) => {
        try {
            const docRef = await addDoc(collection(db, 'campuses'), sanitizeData(data));
            return docRef.id;
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'campuses');
        }
    };
    const updateCampus = async (id: string, data: any) => {
        try {
            await updateDoc(doc(db, 'campuses', id), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `campuses/${id}`);
        }
    };
    const deleteCampus = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'campuses', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `campuses/${id}`);
        }
    };
    
    const addAdmin = async (data: any) => {
        try {
            await addDoc(collection(db, 'admins'), sanitizeData({ ...data, role: UserRole.CAMPUS_ADMIN }));
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'admins');
        }
    };
    const updateAdmin = async (id: string, data: any) => {
        try {
            await updateDoc(doc(db, 'admins', id), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `admins/${id}`);
        }
    };
    const deleteAdmin = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'admins', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `admins/${id}`);
        }
    };

    const addTeacher = async (data: any) => {
        try {
            await addDoc(collection(db, 'teachers'), sanitizeData({ ...data, role: UserRole.TEACHER }));
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'teachers');
        }
    };
    const updateTeacher = async (id: string, data: any) => {
        try {
            await updateDoc(doc(db, 'teachers', id), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `teachers/${id}`);
        }
    };
    const deleteTeacher = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'teachers', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `teachers/${id}`);
        }
    };

    const addStudent = async (data: any) => {
        try {
            await addDoc(collection(db, 'students'), sanitizeData({ ...data, role: UserRole.STUDENT }));
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'students');
        }
    };
    const updateStudent = async (id: string, data: any) => {
        try {
            await updateDoc(doc(db, 'students', id), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
        }
    };
    const deleteStudent = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'students', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
        }
    };

    const addGrade = async (data: any) => {
        try {
            await addDoc(collection(db, 'grades'), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'grades');
        }
    };
    const updateGrade = async (id: string, data: any) => {
        try {
            await updateDoc(doc(db, 'grades', id), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `grades/${id}`);
        }
    };
    const deleteGrade = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'grades', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `grades/${id}`);
        }
    };

    const addCommunication = async (data: any) => {
        try {
            await addDoc(collection(db, 'communications'), sanitizeData({ ...data, date: new Date().toISOString(), authorId: auth.currentUser?.uid }));
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'communications');
        }
    };
    const updateCommunication = async (id: string, data: any) => {
        try {
            await updateDoc(doc(db, 'communications', id), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `communications/${id}`);
        }
    };
    const deleteCommunication = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'communications', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `communications/${id}`);
        }
    };

    const addMessage = async (data: any) => {
        try {
            await addDoc(collection(db, 'messages'), sanitizeData({ ...data, timestamp: new Date().toISOString(), read: false }));
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'messages');
        }
    };
    const updateMessage = async (id: string, data: any) => {
        try {
            await updateDoc(doc(db, 'messages', id), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `messages/${id}`);
        }
    };
    const deleteMessage = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'messages', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `messages/${id}`);
        }
    };

    const addEvent = async (data: any) => {
        try {
            await addDoc(collection(db, 'events'), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'events');
        }
    };
    const updateEvent = async (id: string, data: any) => {
        try {
            await updateDoc(doc(db, 'events', id), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `events/${id}`);
        }
    };
    const deleteEvent = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'events', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
        }
    };

    const addExam = async (data: any) => {
        try {
            await addDoc(collection(db, 'exams'), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'exams');
        }
    };
    const updateExam = async (id: string, data: any) => {
        try {
            await updateDoc(doc(db, 'exams', id), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `exams/${id}`);
        }
    };
    const deleteExam = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'exams', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `exams/${id}`);
        }
    };
    
    const addSchedule = async (data: any) => {
        try {
            await addDoc(collection(db, 'schedules'), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'schedules');
        }
    };
    const updateSchedule = async (id: string, data: any) => {
        try {
            await updateDoc(doc(db, 'schedules', id), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `schedules/${id}`);
        }
    };
    const deleteSchedule = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'schedules', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `schedules/${id}`);
        }
    };
    
    const addAssignment = async (data: any) => {
        try {
            await addDoc(collection(db, 'assignments'), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'assignments');
        }
    };
    const updateAssignment = async (id: string, data: any) => {
        try {
            await updateDoc(doc(db, 'assignments', id), sanitizeData(data));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `assignments/${id}`);
        }
    };
    const deleteAssignment = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'assignments', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `assignments/${id}`);
        }
    };

    const saveAttendance = async (data: any) => {
        try {
            if (data.id) {
                await updateDoc(doc(db, 'attendance', data.id), sanitizeData(data));
            } else {
                await addDoc(collection(db, 'attendance'), sanitizeData(data));
            }
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'attendance');
        }
    };

    const deleteAttendance = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'attendance', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `attendance/${id}`);
        }
    };

    const updateUserAvatar = async (userId: string, role: UserRole, avatar: string) => {
        let col = '';
        let docId = userId;
        const email = auth.currentUser?.email;
        
        switch(role) {
            case UserRole.CAMPUS_ADMIN: 
                col = 'admins'; 
                const admin = admins.find(a => a.email === email);
                if (admin) docId = admin.id;
                break;
            case UserRole.TEACHER: 
                col = 'teachers'; 
                const teacher = teachers.find(t => t.email === email);
                if (teacher) docId = teacher.id;
                break;
            case UserRole.STUDENT:
                col = 'students'; 
                const student = students.find(s => s.email === email);
                if (student) docId = student.id;
                break;
            case UserRole.PARENT:
            case UserRole.SUPER_ADMIN:
            default:
                col = '';
                break;
        }
        try {
            if (col) {
                // Check if the document exists in the specific collection before updating
                const docRef = doc(db, col, docId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    await updateDoc(docRef, sanitizeData({ avatar }));
                }
            }
            // Always update the user profile in 'users' collection
            await updateDoc(doc(db, 'users', userId), sanitizeData({ avatar }));
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, col ? `${col}/${docId}` : `users/${userId}`);
        }
    };

    const assignTemporaryPassword = async (userId: string, role: UserRole, tempPass: string) => {
        // In Firebase, we don't store passwords in Firestore. 
        // We can store a flag or a temporary password field if needed for legacy compatibility,
        // but it's better to use sendPasswordResetEmail.
        let col = '';
        switch(role) {
            case UserRole.CAMPUS_ADMIN: col = 'admins'; break;
            case UserRole.TEACHER: col = 'teachers'; break;
            case UserRole.STUDENT: case UserRole.PARENT: col = 'students'; break;
        }
        if (col) {
            try {
                await updateDoc(doc(db, col, userId), sanitizeData({ tempPassword: tempPass }));
            } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `${col}/${userId}`);
            }
        }
    };

    const getUserSetting = async (userId: string, key: string) => {
        try {
            const docRef = doc(db, 'user_settings', userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return data.key === key ? data.value : null;
            }
            return null;
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, `user_settings/${userId}`);
            return null;
        }
    };

    const setUserSetting = async (userId: string, key: string, value: any) => {
        try {
            await setDoc(doc(db, 'user_settings', userId), sanitizeData({ user_id: userId, key, value }), { merge: true });
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `user_settings/${userId}`);
        }
    };

    const contextValue = {
        isLoading, campuses, admins, teachers, students, grades, communications, messages, schedules, exams, events, assignments, cancellations, homeroomAssignments, attendanceRecords, globalSettings, campusSettings,
        setCampuses, setAdmins, setTeachers, setStudents,
        setHomeroomAssignments,
        addCampus, updateCampus, deleteCampus, addAdmin, updateAdmin, deleteAdmin, addTeacher, updateTeacher, deleteTeacher,
        addStudent, updateStudent, deleteStudent, addGrade, updateGrade, deleteGrade, addCommunication, updateCommunication, deleteCommunication,
        addMessage, updateMessage, deleteMessage,
        addExam, updateExam, deleteExam, addSchedule, updateSchedule, deleteSchedule, addAssignment, updateAssignment, deleteAssignment,
        addEvent, updateEvent, deleteEvent,
        updateUserAvatar, saveAttendance, deleteAttendance,
        assignTemporaryPassword,
        getUserSetting, setUserSetting
    };

    return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
