import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Assignment, AssignmentSubmission, Rubric, RubricCriterion, CriterionGrade } from '@/types';
import { createNotification } from './notifications';

// Notify board members about new assignment (Ödevlendirme veya Hatırlatma bildirimi)
export async function notifyNewAssignment(
    assignmentId: string,
    assignmentTitle: string,
    boardId: string,
    boardTitle: string,
    teacherName: string,
    teacherId: string,
    memberIds: string[],
    dueDate?: Date,
    assignmentType: 'homework' | 'reminder' = 'homework' // Varsayılan: ödevlendirme
): Promise<void> {
    for (const memberId of memberIds) {
        if (memberId === teacherId) continue; // Don't notify the teacher who created it

        // Ödevlendirme veya Hatırlatma tipine göre farklı bildirim
        if (assignmentType === 'homework') {
            // Ödevlendirme - teslim gerekli
            await createNotification({
                userId: memberId,
                type: 'homework_assigned',
                title: 'Ödevlendirme',
                message: `${teacherName} yeni bir ödev verdi: "${assignmentTitle}"`,
                fromUserId: teacherId,
                fromUserName: teacherName,
                boardId,
                boardTitle,
                assignmentId,
                assignmentTitle,
                dueDate,
            });
        } else {
            // Hatırlatma - sadece bilgilendirme
            await createNotification({
                userId: memberId,
                type: 'homework_reminder',
                title: 'Hatırlatma',
                message: `${teacherName} bir hatırlatma paylaştı: "${assignmentTitle}"`,
                fromUserId: teacherId,
                fromUserName: teacherName,
                boardId,
                boardTitle,
                assignmentId,
                assignmentTitle,
                dueDate,
            });
        }
    }
}

// Check for assignments due soon and send reminders (Ödev Hatırlatma bildirimi)
export async function checkAndSendDueReminders(
    userId: string,
    boardId: string,
    boardTitle: string
): Promise<void> {
    try {
        // Get all active assignments for this board
        const q = query(
            collection(db, 'assignments'),
            where('boardId', '==', boardId),
            where('status', '==', 'active')
        );

        const snapshot = await getDocs(q);
        const now = new Date();
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const dueDate = data.dueDate?.toDate?.() || new Date(data.dueDate);

            // Check if due within 24 hours and not already passed (Acil hatırlatma)
            if (dueDate > now && dueDate <= oneDayFromNow) {
                // Check if user already submitted
                const submissionQuery = query(
                    collection(db, 'submissions'),
                    where('assignmentId', '==', docSnap.id),
                    where('studentId', '==', userId)
                );
                const submissionSnap = await getDocs(submissionQuery);

                if (!submissionSnap.empty) continue; // Already submitted, no reminder needed

                // Check if reminder already sent for this type today
                const reminderQuery = query(
                    collection(db, 'notifications'),
                    where('userId', '==', userId),
                    where('type', 'in', ['assignment_due', 'homework_reminder']),
                    where('assignmentId', '==', docSnap.id)
                );
                const reminderSnap = await getDocs(reminderQuery);

                if (!reminderSnap.empty) continue; // Already reminded

                // Calculate hours left
                const hoursLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));

                // Send urgent reminder
                await createNotification({
                    userId,
                    type: 'homework_reminder', // Ödev Hatırlatma
                    title: 'Ödev Hatırlatma',
                    message: hoursLeft <= 12
                        ? `⚠️ "${data.title}" ödevinin teslim süresine ${hoursLeft} saat kaldı!`
                        : `"${data.title}" ödevinin teslim tarihi yarın!`,
                    fromUserId: data.createdBy,
                    fromUserName: data.createdByName || 'Öğretmen',
                    boardId,
                    boardTitle,
                    assignmentId: docSnap.id,
                    assignmentTitle: data.title,
                    dueDate,
                });
            }
            // Check if due within 3 days (Normal hatırlatma - sadece ilk teslim edilmemişse)
            else if (dueDate > oneDayFromNow && dueDate <= threeDaysFromNow) {
                // Check if user already submitted
                const submissionQuery = query(
                    collection(db, 'submissions'),
                    where('assignmentId', '==', docSnap.id),
                    where('studentId', '==', userId)
                );
                const submissionSnap = await getDocs(submissionQuery);

                if (!submissionSnap.empty) continue;

                // Check if already reminded
                const reminderQuery = query(
                    collection(db, 'notifications'),
                    where('userId', '==', userId),
                    where('type', 'in', ['assignment_due', 'homework_reminder']),
                    where('assignmentId', '==', docSnap.id)
                );
                const reminderSnap = await getDocs(reminderQuery);

                if (!reminderSnap.empty) continue;

                const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                await createNotification({
                    userId,
                    type: 'homework_reminder',
                    title: 'Ödev Hatırlatma',
                    message: `"${data.title}" ödevinin teslim tarihine ${daysLeft} gün kaldı.`,
                    fromUserId: data.createdBy,
                    fromUserName: data.createdByName || 'Öğretmen',
                    boardId,
                    boardTitle,
                    assignmentId: docSnap.id,
                    assignmentTitle: data.title,
                    dueDate,
                });
            }
        }
    } catch (error) {
        // Permission hatası sessizce loglanır
        console.warn('Due reminders check skipped (permission):', (error as Error).message);
    }
}

// Create a new assignment (teachers only)
export async function createAssignment(data: {
    boardId: string;
    title: string;
    description: string;
    createdBy: string;
    createdByName: string;
    dueDate: Date;
    attachmentUrl?: string;
    attachmentName?: string;
    attachments?: { url: string; name: string; type?: string }[];
    maxPoints?: number;
    assignmentType: 'homework' | 'reminder';
    allowLateSubmission?: boolean;
    lateSubmissionPenalty?: number;
    category?: string;
    tags?: string[];
    rubricId?: string;
    rubric?: Rubric;
}): Promise<string> {
    // Firebase undefined değerleri kabul etmez, temizle
    const cleanData: Record<string, any> = {
        boardId: data.boardId,
        title: data.title,
        description: data.description,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        dueDate: Timestamp.fromDate(data.dueDate),
        assignmentType: data.assignmentType,
        createdAt: serverTimestamp(),
        status: 'active',
        maxPoints: data.maxPoints ?? 100, // Varsayılan 100 puan
        allowLateSubmission: data.allowLateSubmission ?? true, // Varsayılan izin ver
    };

    // Sadece tanımlı değerleri ekle
    if (data.attachmentUrl) cleanData.attachmentUrl = data.attachmentUrl;
    if (data.attachmentName) cleanData.attachmentName = data.attachmentName;
    if (data.attachments && data.attachments.length > 0) cleanData.attachments = data.attachments;
    if (data.lateSubmissionPenalty !== undefined) cleanData.lateSubmissionPenalty = data.lateSubmissionPenalty;
    if (data.category) cleanData.category = data.category;
    if (data.tags && data.tags.length > 0) cleanData.tags = data.tags;
    if (data.rubricId) cleanData.rubricId = data.rubricId;
    if (data.rubric) cleanData.rubric = data.rubric;

    const docRef = await addDoc(collection(db, 'assignments'), cleanData);
    return docRef.id;
}

// Update an assignment
export async function updateAssignment(
    assignmentId: string,
    updates: Partial<Assignment>
): Promise<void> {
    const ref = doc(db, 'assignments', assignmentId);

    // Convert dueDate to Timestamp if present and add updatedAt
    const data: any = { ...updates, updatedAt: serverTimestamp() };
    if (data.dueDate instanceof Date) {
        data.dueDate = Timestamp.fromDate(data.dueDate);
    }
    // Remove only undefined values (null is valid in Firestore)
    Object.keys(data).forEach(key => {
        if (data[key] === undefined) delete data[key];
    });

    await updateDoc(ref, data);
}


// Delete an assignment
export async function deleteAssignment(assignmentId: string): Promise<void> {
    await deleteDoc(doc(db, 'assignments', assignmentId));
}

// Close/Reopen an assignment
export async function toggleAssignmentStatus(
    assignmentId: string,
    status: 'active' | 'closed'
): Promise<void> {
    await updateDoc(doc(db, 'assignments', assignmentId), { status });
}

// Reorder assignments (update order field)
export async function reorderAssignments(
    assignments: { id: string; order: number }[]
): Promise<void> {
    const batch = writeBatch(db);
    for (const a of assignments) {
        batch.update(doc(db, 'assignments', a.id), { order: a.order });
    }
    await batch.commit();
}

// Subscribe to board assignments
export function subscribeToBoardAssignments(
    boardId: string,
    callback: (assignments: Assignment[]) => void
): () => void {
    const q = query(
        collection(db, 'assignments'),
        where('boardId', '==', boardId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const assignments = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dueDate: data.dueDate?.toDate?.() || new Date(data.dueDate),
                createdAt: data.createdAt?.toDate?.() || new Date(),
            } as Assignment;
        });
        callback(assignments);
    }, (error) => {
        console.warn('Assignments subscription error:', error.message);
        callback([]);
    });
}

// Get single assignment
export async function getAssignment(assignmentId: string): Promise<Assignment | null> {
    const docSnap = await getDoc(doc(db, 'assignments', assignmentId));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        dueDate: data.dueDate?.toDate?.() || new Date(data.dueDate),
        createdAt: data.createdAt?.toDate?.() || new Date(),
    } as Assignment;
}

// --- SUBMISSIONS ---

// Submit an assignment (students)
export async function submitAssignment(data: {
    assignmentId: string;
    boardId: string;
    studentId: string;
    studentName: string;
    content?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachments?: { url: string; name: string; type?: string }[];
    isLate?: boolean;
}): Promise<string> {
    // Firebase undefined değerleri kabul etmez, temizle
    const submissionData: Record<string, any> = {
        assignmentId: data.assignmentId,
        boardId: data.boardId,
        studentId: data.studentId,
        studentName: data.studentName,
        submittedAt: serverTimestamp(),
    };

    // Sadece tanımlı değerleri ekle
    if (data.content && data.content.trim()) submissionData.content = data.content.trim();
    if (data.attachmentUrl) submissionData.attachmentUrl = data.attachmentUrl;
    if (data.attachmentName) submissionData.attachmentName = data.attachmentName;
    if (data.attachments && data.attachments.length > 0) submissionData.attachments = data.attachments;
    if (data.isLate !== undefined) submissionData.isLate = data.isLate;

    const docRef = await addDoc(collection(db, 'submissions'), submissionData);
    return docRef.id;
}

// Notify teacher when student submits assignment
export async function notifySubmission(
    assignmentId: string,
    assignmentTitle: string,
    boardId: string,
    boardTitle: string,
    studentId: string,
    studentName: string,
    teacherId: string
): Promise<void> {
    await createNotification({
        userId: teacherId,
        type: 'member_joined', // Reusing existing type for submission notification
        title: 'Yeni Teslim',
        message: `${studentName} "${assignmentTitle}" ödevini teslim etti.`,
        fromUserId: studentId,
        fromUserName: studentName,
        boardId,
        boardTitle,
        assignmentId,
        assignmentTitle,
    });
}

// Notify teacher when student updates their submission
export async function notifySubmissionUpdate(
    assignmentId: string,
    assignmentTitle: string,
    boardId: string,
    boardTitle: string,
    studentId: string,
    studentName: string,
    teacherId: string
): Promise<void> {
    await createNotification({
        userId: teacherId,
        type: 'member_joined', // Reusing existing type
        title: 'Teslim Güncellendi',
        message: `${studentName} "${assignmentTitle}" ödevinin teslimini güncelledi.`,
        fromUserId: studentId,
        fromUserName: studentName,
        boardId,
        boardTitle,
        assignmentId,
        assignmentTitle,
    });
}

// Update submission (student can update before deadline)
export async function updateSubmission(
    submissionId: string,
    updates: Partial<AssignmentSubmission>
): Promise<void> {
    await updateDoc(doc(db, 'submissions', submissionId), updates);
}

// Grade a submission (teachers only)
export async function gradeSubmission(
    submissionId: string,
    grade: number,
    feedback: string,
    gradedBy: string,
    // Additional params for notification
    studentId?: string,
    assignmentTitle?: string,
    boardId?: string,
    boardTitle?: string,
    teacherName?: string
): Promise<void> {
    await updateDoc(doc(db, 'submissions', submissionId), {
        grade,
        feedback,
        gradedBy,
        gradedAt: serverTimestamp(),
    });

    // Send notification to student if we have the required info
    if (studentId && assignmentTitle && boardId && boardTitle) {
        await notifyFeedback(
            studentId,
            assignmentTitle,
            boardId,
            boardTitle,
            gradedBy,
            teacherName || 'Öğretmen',
            grade,
            feedback
        );
    }
}

// Notify student when teacher gives feedback
export async function notifyFeedback(
    studentId: string,
    assignmentTitle: string,
    boardId: string,
    boardTitle: string,
    teacherId: string,
    teacherName: string,
    grade?: number,
    feedback?: string
): Promise<void> {
    let message = `${teacherName} "${assignmentTitle}" ödevine geribildirim verdi.`;
    if (grade !== undefined) {
        message = `${teacherName} "${assignmentTitle}" ödevine ${grade} puan verdi.`;
        if (feedback) {
            message += ` Yorum: "${feedback.substring(0, 50)}${feedback.length > 50 ? '...' : ''}"`;
        }
    }

    await createNotification({
        userId: studentId,
        type: 'assignment_graded',
        title: 'Ödev Değerlendirildi',
        message,
        fromUserId: teacherId,
        fromUserName: teacherName,
        boardId,
        boardTitle,
    });
}

// Subscribe to submissions for an assignment
export function subscribeToAssignmentSubmissions(
    assignmentId: string,
    callback: (submissions: AssignmentSubmission[]) => void
): () => void {
    const q = query(
        collection(db, 'submissions'),
        where('assignmentId', '==', assignmentId),
        orderBy('submittedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const submissions = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                submittedAt: data.submittedAt?.toDate?.() || new Date(),
                updatedAt: data.updatedAt?.toDate?.() || undefined,
                gradedAt: data.gradedAt?.toDate?.() || undefined,
            } as AssignmentSubmission;
        });
        callback(submissions);
    }, (error) => {
        console.warn('Submissions subscription error:', error.message);
        callback([]);
    });
}

// Get student's submission for an assignment
export async function getStudentSubmission(
    assignmentId: string,
    studentId: string
): Promise<AssignmentSubmission | null> {
    const q = query(
        collection(db, 'submissions'),
        where('assignmentId', '==', assignmentId),
        where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        submittedAt: data.submittedAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || undefined,
        gradedAt: data.gradedAt?.toDate?.() || undefined,
    } as AssignmentSubmission;
}

// Subscribe to student's submission for an assignment
export function subscribeToStudentSubmission(
    assignmentId: string,
    studentId: string,
    callback: (submission: AssignmentSubmission | null) => void
): () => void {
    const q = query(
        collection(db, 'submissions'),
        where('assignmentId', '==', assignmentId),
        where('studentId', '==', studentId)
    );

    return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            callback(null);
            return;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        callback({
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || undefined,
            gradedAt: data.gradedAt?.toDate?.() || undefined,
        } as AssignmentSubmission);
    }, (error) => {
        console.warn('Student submission subscription error:', error.message);
        callback(null);
    });
}

// =====================================================
// RUBRIC (DEĞERLENDİRME KRİTERLERİ) YÖNETİMİ
// =====================================================

// Create a rubric
export async function createRubric(data: {
    name: string;
    description?: string;
    criteria: RubricCriterion[];
    createdBy: string;
    boardId?: string;
    isTemplate?: boolean;
}): Promise<string> {
    const totalPoints = data.criteria.reduce((sum, c) => sum + c.maxPoints, 0);

    const rubricData: Record<string, any> = {
        name: data.name,
        criteria: data.criteria,
        totalPoints,
        createdBy: data.createdBy,
        createdAt: serverTimestamp(),
        isTemplate: data.isTemplate ?? false,
    };

    if (data.description) rubricData.description = data.description;
    if (data.boardId) rubricData.boardId = data.boardId;

    const docRef = await addDoc(collection(db, 'rubrics'), rubricData);
    return docRef.id;
}

// Get rubrics for a board or templates
export async function getRubrics(boardId?: string): Promise<Rubric[]> {
    const rubrics: Rubric[] = [];

    // Get board-specific rubrics
    if (boardId) {
        const boardQ = query(
            collection(db, 'rubrics'),
            where('boardId', '==', boardId)
        );
        const boardSnap = await getDocs(boardQ);
        boardSnap.docs.forEach(doc => {
            const data = doc.data();
            rubrics.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(),
            } as Rubric);
        });
    }

    // Get template rubrics
    const templateQ = query(
        collection(db, 'rubrics'),
        where('isTemplate', '==', true)
    );
    const templateSnap = await getDocs(templateQ);
    templateSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!rubrics.find(r => r.id === doc.id)) {
            rubrics.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(),
            } as Rubric);
        }
    });

    return rubrics;
}

// Update rubric
export async function updateRubric(rubricId: string, updates: Partial<Rubric>): Promise<void> {
    const data: any = { ...updates };
    if (data.criteria) {
        data.totalPoints = data.criteria.reduce((sum: number, c: RubricCriterion) => sum + c.maxPoints, 0);
    }
    await updateDoc(doc(db, 'rubrics', rubricId), data);
}

// Delete rubric
export async function deleteRubric(rubricId: string): Promise<void> {
    await deleteDoc(doc(db, 'rubrics', rubricId));
}

// =====================================================
// ÖĞRENCİ TESLİM GÜNCELLEME
// =====================================================

// Update student's submission (before deadline or if allowed)
export async function updateStudentSubmission(
    submissionId: string,
    updates: {
        content?: string;
        attachments?: { url: string; name: string; type?: string }[];
    }
): Promise<void> {
    const data: Record<string, any> = {
        updatedAt: serverTimestamp(),
    };

    if (updates.content !== undefined) data.content = updates.content;
    // Boş array de kabul edilir - dosyalar kaldırıldığında boş array kaydet
    if (updates.attachments !== undefined) data.attachments = updates.attachments;

    await updateDoc(doc(db, 'submissions', submissionId), data);
}

// =====================================================
// TOPLU İŞLEMLER
// =====================================================

// Bulk close assignments
export async function bulkCloseAssignments(assignmentIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    assignmentIds.forEach(id => {
        batch.update(doc(db, 'assignments', id), { status: 'closed', updatedAt: serverTimestamp() });
    });
    await batch.commit();
}

// Bulk delete assignments
export async function bulkDeleteAssignments(assignmentIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    assignmentIds.forEach(id => {
        batch.delete(doc(db, 'assignments', id));
    });
    await batch.commit();
}

// Bulk grade submissions with same grade
export async function bulkGradeSubmissions(
    submissions: { id: string; grade: number; feedback?: string }[],
    gradedBy: string,
    gradedByName: string
): Promise<void> {
    const batch = writeBatch(db);
    submissions.forEach(sub => {
        const data: Record<string, any> = {
            grade: sub.grade,
            gradedBy,
            gradedByName,
            gradedAt: serverTimestamp(),
        };
        if (sub.feedback) data.feedback = sub.feedback;
        batch.update(doc(db, 'submissions', sub.id), data);
    });
    await batch.commit();
}

// =====================================================
// İNTİHAL (PLAGIARISM) KONTROLÜ
// =====================================================

// Simple text similarity check using Jaccard similarity
function calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // Normalize and tokenize
    const normalize = (t: string) => t.toLowerCase().replace(/[^\w\sığüşöçİĞÜŞÖÇ]/g, '');
    const tokenize = (t: string) => normalize(t).split(/\s+/).filter(w => w.length > 2);

    const tokens1 = new Set(tokenize(text1));
    const tokens2 = new Set(tokenize(text2));

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    // Jaccard similarity
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return Math.round((intersection.size / union.size) * 100);
}

// Check plagiarism for a submission against all others
export async function checkPlagiarism(
    submissionId: string,
    assignmentId: string
): Promise<{ score: number; similarSubmissions: { submissionId: string; studentName: string; similarity: number }[] }> {
    // Get the submission
    const subDoc = await getDoc(doc(db, 'submissions', submissionId));
    if (!subDoc.exists()) throw new Error('Submission not found');

    const submission = subDoc.data();
    const content = submission.content || '';

    if (!content.trim()) {
        return { score: 0, similarSubmissions: [] };
    }

    // Get all other submissions for this assignment
    const q = query(
        collection(db, 'submissions'),
        where('assignmentId', '==', assignmentId)
    );
    const snapshot = await getDocs(q);

    const similarSubmissions: { submissionId: string; studentName: string; similarity: number }[] = [];
    let maxSimilarity = 0;

    snapshot.docs.forEach(docSnap => {
        if (docSnap.id === submissionId) return; // Skip self

        const otherData = docSnap.data();
        const otherContent = otherData.content || '';

        if (!otherContent.trim()) return;

        const similarity = calculateTextSimilarity(content, otherContent);

        if (similarity >= 30) { // Only report if >= 30% similar
            similarSubmissions.push({
                submissionId: docSnap.id,
                studentName: otherData.studentName,
                similarity,
            });
            maxSimilarity = Math.max(maxSimilarity, similarity);
        }
    });

    // Sort by similarity
    similarSubmissions.sort((a, b) => b.similarity - a.similarity);

    // Update the submission with plagiarism info
    await updateDoc(doc(db, 'submissions', submissionId), {
        plagiarismScore: maxSimilarity,
        plagiarismCheckedAt: serverTimestamp(),
        similarSubmissions: similarSubmissions.slice(0, 5), // Keep top 5
    });

    return { score: maxSimilarity, similarSubmissions };
}

// Bulk check plagiarism for all submissions of an assignment
export async function bulkCheckPlagiarism(assignmentId: string): Promise<void> {
    const q = query(
        collection(db, 'submissions'),
        where('assignmentId', '==', assignmentId)
    );
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
        await checkPlagiarism(docSnap.id, assignmentId);
    }
}

// =====================================================
// ÖĞRENCİ İLERLEME TAKİBİ
// =====================================================

export interface StudentProgress {
    studentId: string;
    studentName: string;
    studentPhotoURL?: string;
    totalAssignments: number;
    submittedCount: number;
    gradedCount: number;
    lateCount: number;
    averageGrade: number;
    submissions: {
        assignmentId: string;
        assignmentTitle: string;
        status: 'pending' | 'submitted' | 'graded' | 'late' | 'missing';
        grade?: number;
        maxPoints?: number;
        submittedAt?: Date;
    }[];
}

// Get progress for a single student in a board
export async function getStudentProgress(
    studentId: string,
    boardId: string
): Promise<StudentProgress | null> {
    // Get all assignments for the board
    const assignmentsQ = query(
        collection(db, 'assignments'),
        where('boardId', '==', boardId),
        where('assignmentType', '==', 'homework')
    );
    const assignmentsSnap = await getDocs(assignmentsQ);

    if (assignmentsSnap.empty) return null;

    // Get all submissions by this student for this board
    const submissionsQ = query(
        collection(db, 'submissions'),
        where('boardId', '==', boardId),
        where('studentId', '==', studentId)
    );
    const submissionsSnap = await getDocs(submissionsQ);

    const submissionsMap = new Map<string, any>();
    submissionsSnap.docs.forEach(doc => {
        const data = doc.data();
        submissionsMap.set(data.assignmentId, {
            ...data,
            id: doc.id,
            submittedAt: data.submittedAt?.toDate?.() || new Date(),
        });
    });

    const now = new Date();
    let submittedCount = 0;
    let gradedCount = 0;
    let lateCount = 0;
    let totalGrade = 0;
    let gradeCount = 0;

    const submissions: StudentProgress['submissions'] = [];

    assignmentsSnap.docs.forEach(doc => {
        const assignment = doc.data();
        const dueDate = assignment.dueDate?.toDate?.() || new Date(assignment.dueDate);
        const submission = submissionsMap.get(doc.id);

        let status: 'pending' | 'submitted' | 'graded' | 'late' | 'missing' = 'pending';

        if (submission) {
            submittedCount++;
            if (submission.isLate) lateCount++;

            if (submission.grade !== undefined) {
                status = 'graded';
                gradedCount++;
                totalGrade += submission.grade;
                gradeCount++;
            } else {
                status = submission.isLate ? 'late' : 'submitted';
            }
        } else if (dueDate < now) {
            status = 'missing';
        }

        submissions.push({
            assignmentId: doc.id,
            assignmentTitle: assignment.title,
            status,
            grade: submission?.grade,
            maxPoints: assignment.maxPoints || 100,
            submittedAt: submission?.submittedAt,
        });
    });

    // Get student info from first submission or query
    let studentName = 'Unknown';
    let studentPhotoURL: string | undefined;

    if (submissionsSnap.docs.length > 0) {
        const firstSub = submissionsSnap.docs[0].data();
        studentName = firstSub.studentName;
        studentPhotoURL = firstSub.studentPhotoURL;
    } else {
        // Fetch user info from users collection
        try {
            const userDoc = await getDoc(doc(db, 'users', studentId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                studentName = userData.displayName || 'Unknown';
                studentPhotoURL = userData.photoURL;
            }
        } catch (e) {
            console.error('Error fetching user info for progress:', e);
        }
    }

    return {
        studentId,
        studentName,
        studentPhotoURL,
        totalAssignments: assignmentsSnap.size,
        submittedCount,
        gradedCount,
        lateCount,
        averageGrade: gradeCount > 0 ? Math.round(totalGrade / gradeCount) : 0,
        submissions,
    };
}

// Get progress for all students in a board
export async function getAllStudentsProgress(
    boardId: string,
    studentIds: string[]
): Promise<StudentProgress[]> {
    const progress: StudentProgress[] = [];

    for (const studentId of studentIds) {
        const studentProgress = await getStudentProgress(studentId, boardId);
        if (studentProgress) {
            progress.push(studentProgress);
        }
    }

    // Sort by average grade descending
    progress.sort((a, b) => b.averageGrade - a.averageGrade);

    return progress;
}

// =====================================================
// FİLTRELEME VE ARAMA
// =====================================================

export interface AssignmentFilters {
    status?: 'active' | 'closed' | 'all';
    type?: 'homework' | 'reminder' | 'all';
    dateRange?: 'upcoming' | 'past' | 'thisWeek' | 'thisMonth' | 'all';
    category?: string;
    search?: string;
}

// Get filtered assignments (client-side filtering after fetch)
export function filterAssignments(
    assignments: Assignment[],
    filters: AssignmentFilters
): Assignment[] {
    let filtered = [...assignments];
    const now = new Date();

    // Status filter
    if (filters.status && filters.status !== 'all') {
        filtered = filtered.filter(a => a.status === filters.status);
    }

    // Type filter
    if (filters.type && filters.type !== 'all') {
        filtered = filtered.filter(a => a.assignmentType === filters.type);
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
        switch (filters.dateRange) {
            case 'upcoming':
                filtered = filtered.filter(a => a.dueDate > now);
                break;
            case 'past':
                filtered = filtered.filter(a => a.dueDate <= now);
                break;
            case 'thisWeek':
                const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(a => a.dueDate > now && a.dueDate <= weekFromNow);
                break;
            case 'thisMonth':
                const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(a => a.dueDate > now && a.dueDate <= monthFromNow);
                break;
        }
    }

    // Category filter
    if (filters.category) {
        filtered = filtered.filter(a => a.category === filters.category);
    }

    // Search filter
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(a =>
            a.title.toLowerCase().includes(searchLower) ||
            a.description.toLowerCase().includes(searchLower) ||
            a.tags?.some(t => t.toLowerCase().includes(searchLower))
        );
    }

    return filtered;
}

// Get unique categories from assignments
export function getAssignmentCategories(assignments: Assignment[]): string[] {
    const categories = new Set<string>();
    assignments.forEach(a => {
        if (a.category) categories.add(a.category);
    });
    return Array.from(categories).sort();
}

// =====================================================
// EXPORT FONKSİYONLARI
// =====================================================

// Export submissions to CSV format
export function exportSubmissionsToCSV(
    submissions: AssignmentSubmission[],
    assignment: Assignment
): string {
    const headers = ['Öğrenci Adı', 'Teslim Tarihi', 'Geç mi?', 'Puan', 'Maksimum Puan', 'Yorum'];
    const rows = submissions.map(sub => [
        sub.studentName,
        sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('tr-TR') : '',
        sub.isLate ? 'Evet' : 'Hayır',
        sub.grade?.toString().replace('.', ',') || '',
        assignment.maxPoints?.toString() || '100',
        sub.feedback || '',
    ]);

    // Add BOM for Excel UTF-8 compatibility and use semicolon for delimiter (standard in TR)
    const bom = '\uFEFF';
    const csvContent = bom + [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    return csvContent;
}

// Export progress to CSV
export function exportProgressToCSV(progress: StudentProgress[]): string {
    const headers = ['Öğrenci Adı', 'Toplam Ödev', 'Teslim Edilen', 'Değerlendirilen', 'Geç Teslim', 'Ortalama Puan'];
    const rows = progress.map(p => [
        p.studentName,
        p.totalAssignments.toString(),
        p.submittedCount.toString(),
        p.gradedCount.toString(),
        p.lateCount.toString(),
        p.averageGrade.toString().replace('.', ','),
    ]);

    // Add BOM for Excel UTF-8 compatibility and use semicolon for delimiter (standard in TR)
    const bom = '\uFEFF';
    const csvContent = bom + [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    return csvContent;
}
