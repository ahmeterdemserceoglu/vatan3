'use client';

import { useState, useEffect } from 'react';
import { Assignment, AssignmentSubmission, User, AssignmentType } from '@/types';
import {
    subscribeToBoardAssignments,
    createAssignment,
    deleteAssignment,
    updateAssignment,
    toggleAssignmentStatus,
    subscribeToAssignmentSubmissions,
    submitAssignment,
    subscribeToStudentSubmission,
    notifyNewAssignment,
    notifySubmission,
    gradeSubmission
} from '@/lib/assignments';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';
import {
    X,
    Plus,
    Calendar,
    CalendarDays,
    Clock,
    CheckCircle,
    AlertCircle,
    FileText,
    Upload,
    ChevronRight,
    ChevronLeft,
    Users,
    Trash2,
    Loader2,
    Send,
    BookOpen,
    BellRing,
    Edit2,
    Lock,
    Unlock,
    Eye,
    Download,
    Paperclip,
    List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadToSupabase } from '@/lib/supabase';

interface AssignmentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
    boardTitle: string;
    members: User[];
}

export function AssignmentsModal({ isOpen, onClose, boardId, boardTitle, members }: AssignmentsModalProps) {
    const { user } = useStore();
    const { language } = useTranslation();
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [view, setView] = useState<'list' | 'calendar' | 'create' | 'detail' | 'submit' | 'submissions' | 'edit' | 'submission-detail'>('list');

    // Calendar state
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Create/Edit form
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('23:59');
    const [assignmentType, setAssignmentType] = useState<AssignmentType>('homework');
    const [allowLateSubmission, setAllowLateSubmission] = useState(false);
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]); // Ödev için dosya ekleri
    const [isUploading, setIsUploading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Submit form - Multiple files support
    const [submitContent, setSubmitContent] = useState('');
    const [submitFiles, setSubmitFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mySubmission, setMySubmission] = useState<AssignmentSubmission | null>(null);

    // Submissions view (teacher)
    const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
    const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);

    // Feedback/Grading (teacher)
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackGrade, setFeedbackGrade] = useState<number | ''>('');
    const [isGrading, setIsGrading] = useState(false);

    // Edit mode - existing attachments tracking
    const [existingAttachments, setExistingAttachments] = useState<{ url: string; name: string; type?: string }[]>([]);
    const [attachmentsToRemove, setAttachmentsToRemove] = useState<string[]>([]); // URLs to remove

    // Preview modal for submissions
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other'>('other');

    // Subscribe to assignments
    useEffect(() => {
        if (!isOpen || !boardId) return;
        const unsub = subscribeToBoardAssignments(boardId, setAssignments);
        return () => unsub();
    }, [isOpen, boardId]);

    // Subscribe to student's submission for selected assignment
    useEffect(() => {
        if (!selectedAssignment || !user || isTeacher) return;
        const unsub = subscribeToStudentSubmission(
            selectedAssignment.id,
            user.uid,
            setMySubmission
        );
        return () => unsub();
    }, [selectedAssignment, user, isTeacher]);

    // Subscribe to all submissions (teacher view)
    useEffect(() => {
        if (!selectedAssignment || !isTeacher) return;
        const unsub = subscribeToAssignmentSubmissions(
            selectedAssignment.id,
            setSubmissions
        );
        return () => unsub();
    }, [selectedAssignment, isTeacher]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDueDate('');
        setDueTime('23:59');
        setAssignmentType('homework');
        setAllowLateSubmission(false);
        setAttachmentFiles([]); // Ödev ekleri sıfırla
        setExistingAttachments([]); // Mevcut ekler sıfırla
        setAttachmentsToRemove([]); // Silinecek ekler sıfırla
        setSubmitContent('');
        setSubmitFiles([]);
        setFeedbackText('');
        setFeedbackGrade('');
    };

    const handleCreate = async () => {
        if (!user || !title.trim() || !dueDate) return;

        setIsCreating(true);
        try {
            // Upload attachment files first
            const attachments: { url: string; name: string; type?: string }[] = [];
            if (attachmentFiles.length > 0) {
                setIsUploading(true);
                for (const file of attachmentFiles) {
                    const url = await uploadToSupabase(file);
                    attachments.push({ url, name: file.name, type: file.type });
                }
                setIsUploading(false);
            }

            const dueDateObj = new Date(`${dueDate}T${dueTime}`);
            const assignmentId = await createAssignment({
                boardId,
                title: title.trim(),
                description: description.trim(),
                createdBy: user.uid,
                createdByName: user.displayName,
                dueDate: dueDateObj,
                assignmentType,
                allowLateSubmission,
                attachments: attachments.length > 0 ? attachments : undefined,
                attachmentUrl: attachments[0]?.url,
                attachmentName: attachments[0]?.name,
            });

            // Notify all board members about new assignment
            const memberIds = members.map(m => m.uid);
            await notifyNewAssignment(
                assignmentId,
                title.trim(),
                boardId,
                boardTitle,
                user.displayName,
                user.uid,
                memberIds,
                dueDateObj,
                assignmentType // Bildirim tipini belirle
            );

            resetForm();
            setView('list');
        } catch (error) {
            console.error('Failed to create assignment:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSubmit = async () => {
        if (!user || !selectedAssignment) return;
        if (!submitContent.trim() && submitFiles.length === 0) return;

        setIsSubmitting(true);
        try {
            // Upload multiple files
            const attachments: { url: string; name: string; type?: string }[] = [];
            for (const file of submitFiles) {
                const url = await uploadToSupabase(file);
                attachments.push({ url, name: file.name, type: file.type });
            }

            // Check if this is a late submission
            const isLate = new Date() > selectedAssignment.dueDate;

            await submitAssignment({
                assignmentId: selectedAssignment.id,
                boardId,
                studentId: user.uid,
                studentName: user.displayName,
                content: submitContent.trim() || undefined,
                attachmentUrl: attachments[0]?.url,
                attachmentName: attachments[0]?.name,
                attachments: attachments.length > 0 ? attachments : undefined,
                isLate,
            });

            // Notify teacher about new submission
            // Notify teachers and admins about new submission
            const staffMembers = members.filter(m => m.role === 'teacher' || m.role === 'admin');
            for (const staff of staffMembers) {
                await notifySubmission(
                    selectedAssignment.id,
                    selectedAssignment.title,
                    boardId,
                    boardTitle,
                    user.uid,
                    user.displayName,
                    staff.uid
                );
            }

            setSubmitContent('');
            setSubmitFiles([]);
            setView('detail');
        } catch (error) {
            console.error('Failed to submit:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Edit Assignment Handler
    const handleEditAssignment = async () => {
        if (!user || !selectedAssignment || !title.trim() || !dueDate) return;

        setIsEditing(true);
        try {
            // Upload new attachment files
            const newAttachments: { url: string; name: string; type?: string }[] = [];
            if (attachmentFiles.length > 0) {
                setIsUploading(true);
                for (const file of attachmentFiles) {
                    const url = await uploadToSupabase(file);
                    newAttachments.push({ url, name: file.name, type: file.type });
                }
                setIsUploading(false);
            }

            // Combine existing (minus removed) with new attachments
            const keptAttachments = existingAttachments.filter(att => !attachmentsToRemove.includes(att.url));
            const finalAttachments = [...keptAttachments, ...newAttachments];

            const dueDateObj = new Date(`${dueDate}T${dueTime}`);
            await updateAssignment(selectedAssignment.id, {
                title: title.trim(),
                description: description.trim(),
                dueDate: dueDateObj,
                assignmentType,
                allowLateSubmission,
                attachments: finalAttachments.length > 0 ? finalAttachments : undefined,
                attachmentUrl: finalAttachments[0]?.url,
                attachmentName: finalAttachments[0]?.name,
            });

            // Update selected assignment locally
            setSelectedAssignment(prev => prev ? {
                ...prev,
                title: title.trim(),
                description: description.trim(),
                dueDate: dueDateObj,
                assignmentType,
                allowLateSubmission,
                attachments: finalAttachments.length > 0 ? finalAttachments : undefined,
                attachmentUrl: finalAttachments[0]?.url,
                attachmentName: finalAttachments[0]?.name,
            } : null);

            resetForm();
            setView('detail');
        } catch (error) {
            console.error('Failed to update assignment:', error);
        } finally {
            setIsEditing(false);
        }
    };

    // Toggle Assignment Status (Open/Close)
    const handleToggleStatus = async () => {
        if (!selectedAssignment) return;
        try {
            const newStatus = selectedAssignment.status === 'active' ? 'closed' : 'active';
            await toggleAssignmentStatus(selectedAssignment.id, newStatus);
            setSelectedAssignment(prev => prev ? { ...prev, status: newStatus } : null);
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    // Open Edit View
    const openEditView = () => {
        if (!selectedAssignment) return;
        setTitle(selectedAssignment.title);
        setDescription(selectedAssignment.description);
        const d = new Date(selectedAssignment.dueDate);
        setDueDate(d.toISOString().split('T')[0]);
        setDueTime(d.toTimeString().slice(0, 5));
        setAssignmentType(selectedAssignment.assignmentType || 'homework');
        setAllowLateSubmission(selectedAssignment.allowLateSubmission || false);
        // Mevcut ekleri yükle
        if (selectedAssignment.attachments && selectedAssignment.attachments.length > 0) {
            setExistingAttachments(selectedAssignment.attachments);
        } else if (selectedAssignment.attachmentUrl) {
            setExistingAttachments([{
                url: selectedAssignment.attachmentUrl,
                name: selectedAssignment.attachmentName || 'Attachment'
            }]);
        } else {
            setExistingAttachments([]);
        }
        setAttachmentsToRemove([]);
        setAttachmentFiles([]);
        setView('edit');
    };

    const handleDelete = async (assignmentId: string) => {
        const confirmText = language === 'tr'
            ? 'Bu ödevi silmek istediğinize emin misiniz?'
            : 'Are you sure you want to delete this assignment?';
        if (!confirm(confirmText)) return;

        try {
            await deleteAssignment(assignmentId);
            setSelectedAssignment(null);
            setView('list');
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    // Handle grading a submission
    const handleGradeSubmission = async () => {
        if (!selectedSubmission || !user || !selectedAssignment) return;
        if (!feedbackText.trim() && feedbackGrade === '') return;

        setIsGrading(true);
        try {
            await gradeSubmission(
                selectedSubmission.id,
                typeof feedbackGrade === 'number' ? feedbackGrade : 0,
                feedbackText.trim(),
                user.uid,
                // Notification params
                selectedSubmission.studentId,
                selectedAssignment.title,
                boardId,
                boardTitle,
                user.displayName
            );

            // Update local state
            setSelectedSubmission(prev => prev ? {
                ...prev,
                grade: typeof feedbackGrade === 'number' ? feedbackGrade : undefined,
                feedback: feedbackText.trim(),
                gradedAt: new Date(),
                gradedBy: user.uid
            } : null);

            setFeedbackText('');
            setFeedbackGrade('');
        } catch (error) {
            console.error('Failed to grade submission:', error);
        } finally {
            setIsGrading(false);
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const isOverdue = (dueDate: Date) => new Date() > dueDate;
    const getDaysLeft = (dueDate: Date) => {
        const diff = dueDate.getTime() - Date.now();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-gradient-to-r from-indigo-50 to-purple-50 shrink-0">
                    <div className="flex items-center gap-3">
                        {view !== 'list' && (
                            <button
                                onClick={() => {
                                    if (view === 'submissions' || view === 'submit' || view === 'edit') {
                                        setView('detail');
                                        resetForm();
                                    } else if (view === 'submission-detail') {
                                        setSelectedSubmission(null);
                                        setView('submissions');
                                    } else {
                                        setView('list');
                                        setSelectedAssignment(null);
                                    }
                                }}
                                className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <FileText size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-stone-800">
                                {view === 'create'
                                    ? (language === 'tr' ? 'Yeni Ödev' : 'New Assignment')
                                    : view === 'submit'
                                        ? (language === 'tr' ? 'Ödev Teslimi' : 'Submit Assignment')
                                        : view === 'submissions'
                                            ? (language === 'tr' ? 'Teslimler' : 'Submissions')
                                            : view === 'edit'
                                                ? (language === 'tr' ? 'Ödevi Düzenle' : 'Edit Assignment')
                                                : view === 'submission-detail'
                                                    ? (language === 'tr' ? 'Teslim Detayı' : 'Submission Detail')
                                                    : view === 'detail' && selectedAssignment
                                                        ? selectedAssignment.title
                                                        : (language === 'tr' ? 'Ödevler' : 'Assignments')}
                            </h2>
                            {(view === 'list' || view === 'calendar') && (
                                <p className="text-xs text-stone-500">
                                    {language === 'tr'
                                        ? `${assignments.length} ödev`
                                        : `${assignments.length} assignment${assignments.length !== 1 ? 's' : ''}`}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Toggle - Only show on list/calendar views */}
                        {(view === 'list' || view === 'calendar') && (
                            <div className="flex bg-white/70 rounded-lg p-0.5 border border-stone-200">
                                <button
                                    onClick={() => setView('list')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all",
                                        view === 'list'
                                            ? "bg-indigo-500 text-white shadow-sm"
                                            : "text-stone-500 hover:text-stone-700"
                                    )}
                                >
                                    <List size={14} />
                                    <span className="hidden sm:inline">{language === 'tr' ? 'Liste' : 'List'}</span>
                                </button>
                                <button
                                    onClick={() => setView('calendar')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all",
                                        view === 'calendar'
                                            ? "bg-indigo-500 text-white shadow-sm"
                                            : "text-stone-500 hover:text-stone-700"
                                    )}
                                >
                                    <CalendarDays size={14} />
                                    <span className="hidden sm:inline">{language === 'tr' ? 'Takvim' : 'Calendar'}</span>
                                </button>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-white/50 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">

                    {/* LIST VIEW */}
                    {view === 'list' && (
                        <div className="p-4 space-y-3">
                            {/* Create Button (Teacher only) */}
                            {isTeacher && (
                                <button
                                    onClick={() => setView('create')}
                                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                                >
                                    <Plus size={20} />
                                    <span className="font-medium">
                                        {language === 'tr' ? 'Yeni Ödev Oluştur' : 'Create New Assignment'}
                                    </span>
                                </button>
                            )}


                            {(() => {
                                // Ödevleri sırala: 
                                // 1. Aktif (tarihi geçmemiş) - en yakın tarih üstte
                                // 2. Geçmiş (tarihi dolmuş) - en son biten üstte (altta gruplanır)
                                const now = new Date();
                                const sortedAssignments = [...assignments].sort((a, b) => {
                                    const aOverdue = a.dueDate < now;
                                    const bOverdue = b.dueDate < now;

                                    // Aktif olanlar geçmişlerden önce
                                    if (!aOverdue && bOverdue) return -1;
                                    if (aOverdue && !bOverdue) return 1;

                                    // İkisi de aktif: yakın tarih önce
                                    if (!aOverdue && !bOverdue) {
                                        return a.dueDate.getTime() - b.dueDate.getTime();
                                    }

                                    // İkisi de geçmiş: en son biten önce (büyükten küçüğe)
                                    return b.dueDate.getTime() - a.dueDate.getTime();
                                });

                                if (sortedAssignments.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-stone-400">
                                            <FileText size={48} className="mx-auto mb-3 opacity-50" />
                                            <p>{language === 'tr' ? 'Henüz ödev yok.' : 'No assignments yet.'}</p>
                                        </div>
                                    );
                                }

                                return sortedAssignments.map((assignment) => {
                                    const overdue = isOverdue(assignment.dueDate);
                                    const daysLeft = getDaysLeft(assignment.dueDate);
                                    const isHomework = assignment.assignmentType === 'homework' || !assignment.assignmentType;
                                    const isReminder = assignment.assignmentType === 'reminder';

                                    return (
                                        <div
                                            key={assignment.id}
                                            onClick={() => {
                                                setSelectedAssignment(assignment);
                                                setView('detail');
                                            }}
                                            className={cn(
                                                "p-4 border rounded-xl cursor-pointer hover:shadow-md transition-all group",
                                                overdue
                                                    ? "border-red-200 bg-red-50/50"
                                                    : assignment.status === 'closed'
                                                        ? "border-stone-200 bg-stone-50"
                                                        : isReminder
                                                            ? "border-orange-100 bg-orange-50/30 hover:border-orange-200"
                                                            : "border-emerald-100 bg-emerald-50/30 hover:border-emerald-200"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                {/* Tip İkonu */}
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                                    isReminder
                                                        ? "bg-orange-100 text-orange-600"
                                                        : "bg-emerald-100 text-emerald-600"
                                                )}>
                                                    {isReminder ? <BellRing size={20} /> : <BookOpen size={20} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-stone-800 truncate">
                                                            {assignment.title}
                                                        </h3>
                                                        {/* Tip Etiketi */}
                                                        <span className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                                                            isReminder
                                                                ? "bg-orange-100 text-orange-600"
                                                                : "bg-emerald-100 text-emerald-600"
                                                        )}>
                                                            {isReminder
                                                                ? (language === 'tr' ? 'Hatırlatma' : 'Reminder')
                                                                : (language === 'tr' ? 'Ödev' : 'Homework')
                                                            }
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-stone-500 line-clamp-2 mt-1">
                                                        {assignment.description}
                                                    </p>
                                                </div>
                                                <ChevronRight size={20} className={cn(
                                                    "transition-colors shrink-0",
                                                    isReminder
                                                        ? "text-orange-300 group-hover:text-orange-500"
                                                        : "text-emerald-300 group-hover:text-emerald-500"
                                                )} />
                                            </div>
                                            <div className="flex items-center gap-3 mt-3 text-xs">
                                                <span className={cn(
                                                    "flex items-center gap-1 px-2 py-1 rounded-full",
                                                    overdue
                                                        ? "bg-red-100 text-red-600"
                                                        : daysLeft <= 2
                                                            ? "bg-amber-100 text-amber-600"
                                                            : isReminder
                                                                ? "bg-orange-100 text-orange-600"
                                                                : "bg-emerald-100 text-emerald-600"
                                                )}>
                                                    <Clock size={12} />
                                                    {overdue
                                                        ? (language === 'tr' ? 'Süresi doldu' : 'Overdue')
                                                        : daysLeft === 0
                                                            ? (language === 'tr' ? 'Bugün' : 'Today')
                                                            : daysLeft === 1
                                                                ? (language === 'tr' ? 'Yarın' : 'Tomorrow')
                                                                : `${daysLeft} ${language === 'tr' ? 'gün' : 'days'}`}
                                                </span>
                                                <span className="text-stone-400">
                                                    {formatDate(assignment.dueDate)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}

                    {/* CALENDAR VIEW */}
                    {view === 'calendar' && (() => {
                        const monthNames = language === 'tr'
                            ? ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
                            : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

                        const dayNames = language === 'tr'
                            ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
                            : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

                        const year = calendarMonth.getFullYear();
                        const month = calendarMonth.getMonth();

                        // First day of month (0 = Sunday, we want Monday = 0)
                        const firstDayOfMonth = new Date(year, month, 1);
                        let startDay = firstDayOfMonth.getDay() - 1;
                        if (startDay < 0) startDay = 6;

                        // Days in month
                        const daysInMonth = new Date(year, month + 1, 0).getDate();

                        // Get assignments for this month
                        const getAssignmentsForDate = (date: Date) => {
                            return assignments.filter(a => {
                                const d = a.dueDate;
                                return d.getDate() === date.getDate() &&
                                    d.getMonth() === date.getMonth() &&
                                    d.getFullYear() === date.getFullYear();
                            });
                        };

                        // Build calendar grid
                        const calendarDays: (number | null)[] = [];
                        for (let i = 0; i < startDay; i++) {
                            calendarDays.push(null);
                        }
                        for (let d = 1; d <= daysInMonth; d++) {
                            calendarDays.push(d);
                        }

                        const today = new Date();
                        const isToday = (day: number) =>
                            day === today.getDate() &&
                            month === today.getMonth() &&
                            year === today.getFullYear();

                        const selectedDateAssignments = selectedDate
                            ? getAssignmentsForDate(selectedDate)
                            : [];

                        return (
                            <div className="p-4">
                                {/* Month Navigation */}
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
                                        className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <h3 className="text-lg font-bold text-stone-800">
                                        {monthNames[month]} {year}
                                    </h3>
                                    <button
                                        onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
                                        className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>

                                {/* Day Names */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {dayNames.map(day => (
                                        <div key={day} className="text-center text-xs font-medium text-stone-500 py-1">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1">
                                    {calendarDays.map((day, idx) => {
                                        if (day === null) {
                                            return <div key={`empty-${idx}`} className="aspect-square" />;
                                        }

                                        const date = new Date(year, month, day);
                                        const dayAssignments = getAssignmentsForDate(date);
                                        const hasAssignments = dayAssignments.length > 0;
                                        const hasHomework = dayAssignments.some(a => a.assignmentType === 'homework' || !a.assignmentType);
                                        const hasReminder = dayAssignments.some(a => a.assignmentType === 'reminder');
                                        const isSelected = selectedDate?.getDate() === day &&
                                            selectedDate?.getMonth() === month &&
                                            selectedDate?.getFullYear() === year;
                                        const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setSelectedDate(date)}
                                                className={cn(
                                                    "aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all relative",
                                                    isToday(day) && "ring-2 ring-indigo-500",
                                                    isSelected && "bg-indigo-500 text-white",
                                                    !isSelected && isPast && "text-stone-300",
                                                    !isSelected && !isPast && "hover:bg-stone-100",
                                                    !isSelected && hasAssignments && "font-bold"
                                                )}
                                            >
                                                {day}
                                                {hasAssignments && (
                                                    <div className="flex gap-0.5 mt-0.5">
                                                        {hasHomework && (
                                                            <span className={cn(
                                                                "w-1.5 h-1.5 rounded-full",
                                                                isSelected ? "bg-white" : "bg-emerald-500"
                                                            )} />
                                                        )}
                                                        {hasReminder && (
                                                            <span className={cn(
                                                                "w-1.5 h-1.5 rounded-full",
                                                                isSelected ? "bg-white" : "bg-orange-500"
                                                            )} />
                                                        )}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Selected Date Events */}
                                {selectedDate && (
                                    <div className="mt-4 pt-4 border-t border-stone-100">
                                        <h4 className="text-sm font-semibold text-stone-700 mb-3">
                                            {selectedDate.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'long'
                                            })}
                                        </h4>
                                        {selectedDateAssignments.length === 0 ? (
                                            <p className="text-sm text-stone-400 text-center py-4">
                                                {language === 'tr' ? 'Bu gün için ödev yok' : 'No assignments for this day'}
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {selectedDateAssignments.map(assignment => {
                                                    const isReminder = assignment.assignmentType === 'reminder';
                                                    const overdue = isOverdue(assignment.dueDate);

                                                    return (
                                                        <div
                                                            key={assignment.id}
                                                            onClick={() => {
                                                                setSelectedAssignment(assignment);
                                                                setView('detail');
                                                            }}
                                                            className={cn(
                                                                "p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                                                                isReminder
                                                                    ? "border-orange-200 bg-orange-50/50"
                                                                    : overdue
                                                                        ? "border-red-200 bg-red-50/50"
                                                                        : "border-emerald-200 bg-emerald-50/50"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                                    isReminder ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"
                                                                )}>
                                                                    {isReminder ? <BellRing size={16} /> : <BookOpen size={16} />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-stone-800 truncate text-sm">{assignment.title}</p>
                                                                    <p className="text-xs text-stone-500">
                                                                        {assignment.dueDate.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                                <ChevronRight size={16} className="text-stone-300" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Legend */}
                                <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-center gap-4 text-xs text-stone-500">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <span>{language === 'tr' ? 'Ödev' : 'Homework'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                        <span>{language === 'tr' ? 'Hatırlatma' : 'Reminder'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* CREATE VIEW */}
                    {view === 'create' && (
                        <div className="p-6 space-y-4">
                            {/* Tip Seçimi - Ödevlendirme veya Hatırlatma */}
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-2">
                                    {language === 'tr' ? 'Tür' : 'Type'} *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAssignmentType('homework')}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                            assignmentType === 'homework'
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                : "border-stone-200 hover:border-stone-300 text-stone-600"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                            assignmentType === 'homework'
                                                ? "bg-emerald-500 text-white"
                                                : "bg-stone-100 text-stone-500"
                                        )}>
                                            <BookOpen size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold">
                                                {language === 'tr' ? 'Ödevlendirme' : 'Homework'}
                                            </p>
                                            <p className="text-xs opacity-70">
                                                {language === 'tr' ? 'Teslim gerekli' : 'Submission required'}
                                            </p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAssignmentType('reminder')}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                            assignmentType === 'reminder'
                                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                                : "border-stone-200 hover:border-stone-300 text-stone-600"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                            assignmentType === 'reminder'
                                                ? "bg-orange-500 text-white"
                                                : "bg-stone-100 text-stone-500"
                                        )}>
                                            <BellRing size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold">
                                                {language === 'tr' ? 'Hatırlatma' : 'Reminder'}
                                            </p>
                                            <p className="text-xs opacity-70">
                                                {language === 'tr' ? 'Sadece bilgilendirme' : 'Info only'}
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                                    {language === 'tr' ? 'Başlık' : 'Title'} *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={assignmentType === 'homework'
                                        ? (language === 'tr' ? 'Ödev başlığı...' : 'Assignment title...')
                                        : (language === 'tr' ? 'Hatırlatma başlığı...' : 'Reminder title...')
                                    }
                                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                                    {language === 'tr' ? 'Açıklama' : 'Description'}
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={assignmentType === 'homework'
                                        ? (language === 'tr' ? 'Ödev detayları...' : 'Assignment details...')
                                        : (language === 'tr' ? 'Hatırlatma detayları...' : 'Reminder details...')
                                    }
                                    rows={4}
                                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                                        {assignmentType === 'homework'
                                            ? (language === 'tr' ? 'Teslim Tarihi' : 'Due Date')
                                            : (language === 'tr' ? 'Tarih' : 'Date')
                                        } *
                                    </label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                                        {language === 'tr' ? 'Saat' : 'Time'}
                                    </label>
                                    <input
                                        type="time"
                                        value={dueTime}
                                        onChange={(e) => setDueTime(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Dosya Ekleri */}
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                                    {language === 'tr' ? 'Dosya Ekleri' : 'Attachments'}
                                </label>
                                <div className="space-y-2">
                                    {/* Dosya Seçme Butonu */}
                                    <label className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                                        <Upload size={18} className="text-stone-400" />
                                        <span className="text-sm text-stone-500 font-medium">
                                            {language === 'tr' ? 'Dosya Ekle (PDF, Resim, Word...)' : 'Add Files (PDF, Image, Word...)'}
                                        </span>
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip,.rar"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files) {
                                                    setAttachmentFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                                }
                                            }}
                                        />
                                    </label>

                                    {/* Eklenen Dosyalar Listesi */}
                                    {attachmentFiles.length > 0 && (
                                        <div className="space-y-2 p-3 bg-stone-50 rounded-xl border border-stone-100">
                                            {attachmentFiles.map((file, idx) => {
                                                const ext = file.name.split('.').pop()?.toLowerCase() || '';
                                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                                                const isPdf = ext === 'pdf';
                                                const isDoc = ['doc', 'docx'].includes(ext);
                                                const isExcel = ['xls', 'xlsx'].includes(ext);
                                                const isPpt = ['ppt', 'pptx'].includes(ext);

                                                return (
                                                    <div key={idx} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-stone-100">
                                                        {/* Dosya İkonu */}
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                                                            isImage ? "bg-purple-100 text-purple-600" :
                                                                isPdf ? "bg-rose-100 text-rose-600" :
                                                                    isDoc ? "bg-blue-100 text-blue-600" :
                                                                        isExcel ? "bg-emerald-100 text-emerald-600" :
                                                                            isPpt ? "bg-orange-100 text-orange-600" :
                                                                                "bg-stone-100 text-stone-600"
                                                        )}>
                                                            {ext.toUpperCase().slice(0, 3)}
                                                        </div>
                                                        {/* Dosya Adı */}
                                                        <span className="text-sm text-stone-700 truncate flex-1">{file.name}</span>
                                                        {/* Dosya Boyutu */}
                                                        <span className="text-xs text-stone-400 shrink-0">
                                                            {(file.size / 1024 / 1024).toFixed(1)} MB
                                                        </span>
                                                        {/* Kaldır Butonu */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setAttachmentFiles(prev => prev.filter((_, i) => i !== idx))}
                                                            className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Geç Teslime İzin Ver Toggle - Sadece Ödevlendirme için */}
                            {assignmentType === 'homework' && (
                                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                                    <div>
                                        <p className="font-medium text-stone-700">
                                            {language === 'tr' ? 'Geç Teslime İzin Ver' : 'Allow Late Submission'}
                                        </p>
                                        <p className="text-xs text-stone-500">
                                            {language === 'tr'
                                                ? 'Teslim süresi dolduktan sonra ödev göndermeye izin ver'
                                                : 'Allow submissions after the deadline'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAllowLateSubmission(!allowLateSubmission)}
                                        className={cn(
                                            "w-12 h-6 rounded-full transition-colors relative",
                                            allowLateSubmission ? "bg-emerald-500" : "bg-stone-300"
                                        )}
                                    >
                                        <span className={cn(
                                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow",
                                            allowLateSubmission ? "translate-x-7" : "translate-x-1"
                                        )} />
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleCreate}
                                disabled={isCreating || isUploading || !title.trim() || !dueDate}
                                className={cn(
                                    "w-full py-3 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors",
                                    assignmentType === 'homework'
                                        ? "bg-emerald-600 hover:bg-emerald-700"
                                        : "bg-orange-600 hover:bg-orange-700"
                                )}
                            >
                                {isCreating || isUploading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        {isUploading
                                            ? (language === 'tr' ? 'Dosyalar yükleniyor...' : 'Uploading files...')
                                            : (language === 'tr' ? 'Oluşturuluyor...' : 'Creating...')
                                        }
                                    </>
                                ) : (
                                    <>
                                        {assignmentType === 'homework' ? <BookOpen size={18} /> : <BellRing size={18} />}
                                        {assignmentType === 'homework'
                                            ? (language === 'tr' ? 'Ödevlendirme Yap' : 'Create Homework')
                                            : (language === 'tr' ? 'Hatırlatma Oluştur' : 'Create Reminder')
                                        }
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* DETAIL VIEW */}
                    {view === 'detail' && selectedAssignment && (() => {
                        const isHomeworkType = selectedAssignment.assignmentType === 'homework' || !selectedAssignment.assignmentType;
                        const isReminderType = selectedAssignment.assignmentType === 'reminder';

                        return (
                            <div className="p-6">
                                {/* Tip Etiketi */}
                                <div className="mb-4">
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                                        isReminderType
                                            ? "bg-orange-100 text-orange-700"
                                            : "bg-emerald-100 text-emerald-700"
                                    )}>
                                        {isReminderType ? <BellRing size={14} /> : <BookOpen size={14} />}
                                        {isReminderType
                                            ? (language === 'tr' ? 'Hatırlatma' : 'Reminder')
                                            : (language === 'tr' ? 'Ödevlendirme' : 'Homework')
                                        }
                                    </span>
                                </div>

                                {/* Assignment Info */}
                                <div className="mb-6">
                                    <p className="text-stone-600 whitespace-pre-wrap">
                                        {selectedAssignment.description || (language === 'tr' ? 'Açıklama yok.' : 'No description.')}
                                    </p>

                                    <div className="flex flex-wrap gap-3 mt-4">
                                        <span className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                                            isOverdue(selectedAssignment.dueDate)
                                                ? "bg-red-100 text-red-600"
                                                : isReminderType
                                                    ? "bg-orange-100 text-orange-600"
                                                    : "bg-emerald-100 text-emerald-600"
                                        )}>
                                            <Calendar size={14} />
                                            {formatDate(selectedAssignment.dueDate)}
                                        </span>
                                        {/* Geç Teslim İzni Durumu - Sadece Ödevler için */}
                                        {isHomeworkType && (
                                            <span className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                                                selectedAssignment.allowLateSubmission
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-stone-100 text-stone-500"
                                            )}>
                                                <Clock size={14} />
                                                {selectedAssignment.allowLateSubmission
                                                    ? (language === 'tr' ? 'Geç teslim açık' : 'Late submission allowed')
                                                    : (language === 'tr' ? 'Geç teslim kapalı' : 'No late submission')
                                                }
                                            </span>
                                        )}
                                        <span className="text-sm text-stone-400">
                                            {language === 'tr' ? 'Oluşturan:' : 'By:'} {selectedAssignment.createdByName}
                                        </span>
                                    </div>

                                    {/* Dosya Ekleri */}
                                    {(selectedAssignment.attachments && selectedAssignment.attachments.length > 0) && (
                                        <div className="mt-4 pt-4 border-t border-stone-100">
                                            <h4 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
                                                <Paperclip size={14} />
                                                {language === 'tr' ? 'Dosya Ekleri' : 'Attachments'}
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedAssignment.attachments.map((attachment, idx) => {
                                                    const ext = attachment.name.split('.').pop()?.toLowerCase() || '';
                                                    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                                                    const isPdf = ext === 'pdf';
                                                    const isDoc = ['doc', 'docx'].includes(ext);
                                                    const isExcel = ['xls', 'xlsx'].includes(ext);
                                                    const isPpt = ['ppt', 'pptx'].includes(ext);

                                                    return (
                                                        <a
                                                            key={idx}
                                                            href={attachment.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-3 p-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-100 transition-colors group"
                                                        >
                                                            {/* Dosya İkonu */}
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                                                                isImage ? "bg-purple-100 text-purple-600" :
                                                                    isPdf ? "bg-rose-100 text-rose-600" :
                                                                        isDoc ? "bg-blue-100 text-blue-600" :
                                                                            isExcel ? "bg-emerald-100 text-emerald-600" :
                                                                                isPpt ? "bg-orange-100 text-orange-600" :
                                                                                    "bg-stone-200 text-stone-600"
                                                            )}>
                                                                {ext.toUpperCase().slice(0, 3)}
                                                            </div>
                                                            {/* Dosya Adı */}
                                                            <span className="text-sm text-stone-700 truncate flex-1 group-hover:text-indigo-600">
                                                                {attachment.name}
                                                            </span>
                                                            {/* İndir İkonu */}
                                                            <Download size={16} className="text-stone-400 group-hover:text-indigo-600 shrink-0" />
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tek ek için fallback - eski format */}
                                    {!selectedAssignment.attachments && selectedAssignment.attachmentUrl && (
                                        <div className="mt-4 pt-4 border-t border-stone-100">
                                            <h4 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
                                                <Paperclip size={14} />
                                                {language === 'tr' ? 'Dosya Eki' : 'Attachment'}
                                            </h4>
                                            <a
                                                href={selectedAssignment.attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 p-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-100 transition-colors group"
                                            >
                                                <FileText size={20} className="text-stone-500" />
                                                <span className="text-sm text-stone-700 truncate flex-1 group-hover:text-indigo-600">
                                                    {selectedAssignment.attachmentName || (language === 'tr' ? 'Dosya Eki' : 'Attachment')}
                                                </span>
                                                <Download size={16} className="text-stone-400 group-hover:text-indigo-600 shrink-0" />
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Student Actions - Sadece Ödevlendirme için teslim butonu göster */}
                                {!isTeacher && (
                                    <div className="border-t border-stone-200 pt-6">
                                        {isReminderType ? (
                                            // Hatırlatma - teslim gerektirmez
                                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-center">
                                                <BellRing size={24} className="mx-auto text-orange-500 mb-2" />
                                                <p className="text-orange-700 font-medium">
                                                    {language === 'tr' ? 'Bilgilendirme Amaçlı' : 'For Information Only'}
                                                </p>
                                                <p className="text-sm text-orange-600 mt-1">
                                                    {language === 'tr' ? 'Bu bir hatırlatmadır, teslim gerektirmez.' : 'This is a reminder, no submission required.'}
                                                </p>
                                            </div>
                                        ) : mySubmission ? (
                                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                                <div className="flex items-center gap-2 text-emerald-600 font-medium mb-2">
                                                    <CheckCircle size={18} />
                                                    {language === 'tr' ? 'Teslim Edildi' : 'Submitted'}
                                                </div>
                                                <p className="text-sm text-stone-600">
                                                    {formatDate(mySubmission.submittedAt)}
                                                </p>
                                            </div>
                                        ) : isOverdue(selectedAssignment.dueDate) && !selectedAssignment.allowLateSubmission ? (
                                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                                                <AlertCircle size={24} className="mx-auto text-red-500 mb-2" />
                                                <p className="text-red-600 font-medium">
                                                    {language === 'tr' ? 'Teslim süresi doldu' : 'Deadline passed'}
                                                </p>
                                            </div>
                                        ) : isOverdue(selectedAssignment.dueDate) && selectedAssignment.allowLateSubmission ? (
                                            <div className="space-y-3">
                                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                                                    <p className="text-amber-600 text-sm font-medium">
                                                        ⚠️ {language === 'tr' ? 'Teslim süresi doldu - Geç teslim olarak işaretlenecektir' : 'Deadline passed - Will be marked as late submission'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setView('submit')}
                                                    className="w-full py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <Clock size={18} />
                                                    {language === 'tr' ? 'Geç Teslim Yap' : 'Submit Late'}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setView('submit')}
                                                className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Send size={18} />
                                                {language === 'tr' ? 'Ödevi Teslim Et' : 'Submit Assignment'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Teacher Actions */}
                                {isTeacher && (
                                    <div className="border-t border-stone-200 pt-6 space-y-3">
                                        {/* View Submissions */}
                                        <button
                                            onClick={() => setView('submissions')}
                                            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Users size={18} />
                                            {language === 'tr' ? 'Teslimleri Görüntüle' : 'View Submissions'}
                                            {submissions.length > 0 && (
                                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                                    {submissions.length}
                                                </span>
                                            )}
                                        </button>

                                        {/* Edit & Toggle Status Row */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={openEditView}
                                                className="py-3 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Edit2 size={16} />
                                                {language === 'tr' ? 'Düzenle' : 'Edit'}
                                            </button>
                                            <button
                                                onClick={handleToggleStatus}
                                                className={cn(
                                                    "py-3 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors",
                                                    selectedAssignment.status === 'active'
                                                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                )}
                                            >
                                                {selectedAssignment.status === 'active' ? (
                                                    <>
                                                        <Lock size={16} />
                                                        {language === 'tr' ? 'Kapat' : 'Close'}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Unlock size={16} />
                                                        {language === 'tr' ? 'Aç' : 'Open'}
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDelete(selectedAssignment.id)}
                                            className="w-full py-3 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                            {language === 'tr' ? 'Ödevi Sil' : 'Delete Assignment'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* SUBMIT VIEW */}
                    {view === 'submit' && selectedAssignment && (
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                                    {language === 'tr' ? 'Yanıtınız' : 'Your Response'}
                                </label>
                                <textarea
                                    value={submitContent}
                                    onChange={(e) => setSubmitContent(e.target.value)}
                                    placeholder={language === 'tr' ? 'Ödev yanıtınızı yazın...' : 'Write your response...'}
                                    rows={6}
                                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                                    {language === 'tr' ? 'Dosya Ekle (Birden fazla seçebilirsiniz)' : 'Attach Files (Multiple allowed)'}
                                </label>
                                <label className="flex flex-col items-center justify-center gap-2 py-4 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
                                    <Upload size={24} className="text-stone-400" />
                                    <span className="text-stone-500 text-sm">
                                        {submitFiles.length > 0
                                            ? `${submitFiles.length} ${language === 'tr' ? 'dosya seçildi' : 'files selected'}`
                                            : (language === 'tr' ? 'Dosya seç...' : 'Choose files...')}
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={(e) => {
                                            const files = e.target.files;
                                            if (files) {
                                                const validFiles = Array.from(files).filter(file => {
                                                    if (file.size > 50 * 1024 * 1024) {
                                                        alert(language === 'tr'
                                                            ? `"${file.name}" 50MB'dan büyük olduğu için eklenemedi.`
                                                            : `"${file.name}" could not be added because it exceeds 50MB.`);
                                                        return false;
                                                    }
                                                    return true;
                                                });
                                                setSubmitFiles(prev => [...prev, ...validFiles]);
                                            }
                                        }}
                                        className="hidden"
                                    />
                                </label>
                                {/* Selected Files List */}
                                {submitFiles.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {submitFiles.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-stone-50 rounded-lg border border-stone-100">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Paperclip size={14} className="text-stone-400 shrink-0" />
                                                    <span className="text-sm text-stone-600 truncate">{file.name}</span>
                                                    <span className="text-xs text-stone-400 shrink-0">
                                                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubmitFiles(prev => prev.filter((_, i) => i !== index))}
                                                    className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || (!submitContent.trim() && submitFiles.length === 0)}
                                className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                            >
                                {isSubmitting ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <Send size={18} />
                                        {language === 'tr' ? 'Teslim Et' : 'Submit'}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* SUBMISSIONS VIEW (Teacher) */}
                    {view === 'submissions' && selectedAssignment && (
                        <div className="p-4 space-y-3">
                            {submissions.length === 0 ? (
                                <div className="text-center py-12 text-stone-400">
                                    <Users size={48} className="mx-auto mb-3 opacity-50" />
                                    <p>{language === 'tr' ? 'Henüz teslim yok.' : 'No submissions yet.'}</p>
                                </div>
                            ) : (
                                submissions.map((submission) => {
                                    // Geç teslim kontrolü
                                    const isLateSubmission = selectedAssignment &&
                                        submission.submittedAt > selectedAssignment.dueDate;

                                    return (
                                        <div key={submission.id} className={cn(
                                            "p-4 border rounded-xl",
                                            isLateSubmission
                                                ? "border-amber-200 bg-amber-50/50"
                                                : "border-stone-200"
                                        )}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-stone-800">
                                                        {submission.studentName}
                                                    </span>
                                                    {isLateSubmission && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                                                            <Clock size={10} />
                                                            {language === 'tr' ? 'GEÇ' : 'LATE'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={cn(
                                                    "text-xs",
                                                    isLateSubmission ? "text-amber-600" : "text-stone-400"
                                                )}>
                                                    {formatDate(submission.submittedAt)}
                                                </span>
                                            </div>
                                            {submission.content ? (
                                                <p className="text-sm text-stone-600 mb-2 line-clamp-3">
                                                    {submission.content}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-stone-400 italic mb-2">
                                                    {language === 'tr' ? '(Metin yazılmamış)' : '(No text content)'}
                                                </p>
                                            )}
                                            {/* Birden fazla dosya desteği */}
                                            {submission.attachments && submission.attachments.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {submission.attachments.map((att: { url: string; name: string }, idx: number) => (
                                                        <a
                                                            key={idx}
                                                            href={att.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-indigo-600 hover:underline flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg"
                                                        >
                                                            <Paperclip size={12} />
                                                            {att.name}
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : submission.attachmentUrl && (
                                                <a
                                                    href={submission.attachmentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mb-2"
                                                >
                                                    <FileText size={14} />
                                                    {submission.attachmentName || 'Attachment'}
                                                </a>
                                            )}
                                            {/* View Details Button */}
                                            <button
                                                onClick={() => {
                                                    setSelectedSubmission(submission);
                                                    setView('submission-detail');
                                                }}
                                                className="mt-2 w-full py-2 bg-stone-100 text-stone-600 text-sm font-medium rounded-lg hover:bg-stone-200 flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <Eye size={14} />
                                                {language === 'tr' ? 'Detayları Gör' : 'View Details'}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* EDIT VIEW */}
                    {view === 'edit' && selectedAssignment && (
                        <div className="p-6 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                                    {language === 'tr' ? 'Başlık' : 'Title'} *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                                    {language === 'tr' ? 'Açıklama' : 'Description'}
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                />
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                                        {language === 'tr' ? 'Teslim Tarihi' : 'Due Date'} *
                                    </label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                                        {language === 'tr' ? 'Saat' : 'Time'}
                                    </label>
                                    <input
                                        type="time"
                                        value={dueTime}
                                        onChange={(e) => setDueTime(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Allow Late Submission Toggle */}
                            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                                <div>
                                    <p className="font-medium text-stone-700">
                                        {language === 'tr' ? 'Geç Teslime İzin Ver' : 'Allow Late Submission'}
                                    </p>
                                    <p className="text-xs text-stone-500">
                                        {language === 'tr'
                                            ? 'Teslim süresi dolduktan sonra ödev göndermeye izin ver'
                                            : 'Allow submissions after the deadline'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAllowLateSubmission(!allowLateSubmission)}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-colors relative",
                                        allowLateSubmission ? "bg-emerald-500" : "bg-stone-300"
                                    )}
                                >
                                    <span className={cn(
                                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow",
                                        allowLateSubmission ? "translate-x-7" : "translate-x-1"
                                    )} />
                                </button>
                            </div>

                            {/* Dosya Ekleri Yönetimi */}
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-2">
                                    {language === 'tr' ? 'Dosya Ekleri' : 'Attachments'}
                                </label>

                                {/* Mevcut Ekler */}
                                {existingAttachments.filter(att => !attachmentsToRemove.includes(att.url)).length > 0 && (
                                    <div className="mb-3 space-y-2">
                                        <p className="text-xs text-stone-500 font-medium">
                                            {language === 'tr' ? 'Mevcut Ekler:' : 'Current Attachments:'}
                                        </p>
                                        {existingAttachments
                                            .filter(att => !attachmentsToRemove.includes(att.url))
                                            .map((att, idx) => {
                                                const ext = att.name.split('.').pop()?.toLowerCase() || '';
                                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                                                const isPdf = ext === 'pdf';

                                                return (
                                                    <div key={idx} className="flex items-center gap-3 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                                                            isImage ? "bg-purple-100 text-purple-600" :
                                                                isPdf ? "bg-rose-100 text-rose-600" :
                                                                    "bg-stone-100 text-stone-600"
                                                        )}>
                                                            {ext.toUpperCase().slice(0, 3)}
                                                        </div>
                                                        <span className="text-sm text-stone-700 truncate flex-1">{att.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAttachmentsToRemove(prev => [...prev, att.url])}
                                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title={language === 'tr' ? 'Kaldır' : 'Remove'}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}

                                {/* Yeni Ekler */}
                                {attachmentFiles.length > 0 && (
                                    <div className="mb-3 space-y-2">
                                        <p className="text-xs text-stone-500 font-medium">
                                            {language === 'tr' ? 'Yeni Eklenecekler:' : 'New Attachments:'}
                                        </p>
                                        {attachmentFiles.map((file, idx) => {
                                            const ext = file.name.split('.').pop()?.toLowerCase() || '';
                                            return (
                                                <div key={idx} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold bg-blue-100 text-blue-600">
                                                        {ext.toUpperCase().slice(0, 3)}
                                                    </div>
                                                    <span className="text-sm text-stone-700 truncate flex-1">{file.name}</span>
                                                    <span className="text-xs text-stone-400 shrink-0">
                                                        {(file.size / 1024 / 1024).toFixed(1)} MB
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAttachmentFiles(prev => prev.filter((_, i) => i !== idx))}
                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Dosya Ekleme Butonu */}
                                <label className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                                    <Upload size={18} className="text-stone-400" />
                                    <span className="text-sm text-stone-500 font-medium">
                                        {language === 'tr' ? 'Dosya Ekle (PDF, Resim, Word...)' : 'Add Files (PDF, Image, Word...)'}
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip,.rar"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                const validFiles = Array.from(e.target.files).filter(file => {
                                                    if (file.size > 50 * 1024 * 1024) {
                                                        alert(language === 'tr'
                                                            ? `"${file.name}" 50MB'dan büyük olduğu için eklenemedi.`
                                                            : `"${file.name}" could not be added because it exceeds 50MB.`);
                                                        return false;
                                                    }
                                                    return true;
                                                });
                                                setAttachmentFiles(prev => [...prev, ...validFiles]);
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleEditAssignment}
                                disabled={isEditing || isUploading || !title.trim() || !dueDate}
                                className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                            >
                                {isEditing || isUploading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        {isUploading
                                            ? (language === 'tr' ? 'Dosyalar yükleniyor...' : 'Uploading files...')
                                            : (language === 'tr' ? 'Kaydediliyor...' : 'Saving...')
                                        }
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        {language === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes'}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* SUBMISSION DETAIL VIEW */}
                    {view === 'submission-detail' && selectedSubmission && selectedAssignment && (
                        <div className="p-6 space-y-4">
                            {/* Student Info */}
                            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                                <div>
                                    <p className="font-bold text-stone-800">{selectedSubmission.studentName}</p>
                                    <p className="text-xs text-stone-500">
                                        {formatDate(selectedSubmission.submittedAt)}
                                    </p>
                                </div>
                                {selectedSubmission.isLate && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                        <Clock size={12} />
                                        {language === 'tr' ? 'GEÇ TESLİM' : 'LATE SUBMISSION'}
                                    </span>
                                )}
                            </div>

                            {/* Submission Content */}
                            {selectedSubmission.content && (
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-2">
                                        {language === 'tr' ? 'Yanıt' : 'Response'}
                                    </label>
                                    <div className="p-4 bg-white border border-stone-200 rounded-xl text-stone-700 whitespace-pre-wrap">
                                        {selectedSubmission.content}
                                    </div>
                                </div>
                            )}

                            {/* Attachments with Preview */}
                            {(selectedSubmission.attachments?.length || selectedSubmission.attachmentUrl) && (
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-2">
                                        {language === 'tr' ? 'Ekler' : 'Attachments'}
                                    </label>
                                    <div className="space-y-3">
                                        {/* Helper function for preview button */}
                                        {(() => {
                                            const allAttachments = selectedSubmission.attachments?.length
                                                ? selectedSubmission.attachments
                                                : selectedSubmission.attachmentUrl
                                                    ? [{ url: selectedSubmission.attachmentUrl, name: selectedSubmission.attachmentName || 'Attachment' }]
                                                    : [];

                                            return allAttachments.map((att, index) => {
                                                const ext = att.name.split('.').pop()?.toLowerCase() || '';
                                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                                                const isPdf = ext === 'pdf';
                                                const isPreviewable = isImage || isPdf;

                                                return (
                                                    <div key={index} className="border border-stone-200 rounded-xl overflow-hidden">
                                                        {/* Preview Area for Images */}
                                                        {isImage && (
                                                            <div className="bg-stone-100 p-2">
                                                                <img
                                                                    src={att.url}
                                                                    alt={att.name}
                                                                    className="max-h-64 w-auto mx-auto rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    onClick={() => {
                                                                        setPreviewUrl(att.url);
                                                                        setPreviewType('image');
                                                                    }}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Preview Area for PDFs */}
                                                        {isPdf && (
                                                            <div className="bg-stone-100 p-2">
                                                                <div className="relative aspect-[4/3] max-h-64 w-full">
                                                                    <iframe
                                                                        src={`${att.url}#view=FitH`}
                                                                        className="w-full h-full rounded-lg border border-stone-200"
                                                                        title={att.name}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* File Info Bar */}
                                                        <div className="flex items-center justify-between p-3 bg-stone-50">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                                                                    isImage ? "bg-purple-100 text-purple-600" :
                                                                        isPdf ? "bg-rose-100 text-rose-600" :
                                                                            "bg-stone-200 text-stone-600"
                                                                )}>
                                                                    {ext.toUpperCase().slice(0, 3)}
                                                                </div>
                                                                <span className="text-sm text-stone-700 truncate">{att.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {isPreviewable && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setPreviewUrl(att.url);
                                                                            setPreviewType(isImage ? 'image' : 'pdf');
                                                                        }}
                                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                        title={language === 'tr' ? 'Büyük Görüntüle' : 'View Large'}
                                                                    >
                                                                        <Eye size={16} />
                                                                    </button>
                                                                )}
                                                                <a
                                                                    href={att.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-2 text-stone-500 hover:text-indigo-600 hover:bg-stone-100 rounded-lg transition-colors"
                                                                    title={language === 'tr' ? 'İndir' : 'Download'}
                                                                >
                                                                    <Download size={16} />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Back Button */}
                            <button
                                onClick={() => {
                                    setSelectedSubmission(null);
                                    setView('submissions');
                                }}
                                className="w-full py-3 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 flex items-center justify-center gap-2 transition-colors"
                            >
                                <ChevronLeft size={18} />
                                {language === 'tr' ? 'Teslimlere Dön' : 'Back to Submissions'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Full-screen Preview Modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
                    onClick={() => {
                        setPreviewUrl(null);
                        setPreviewType('other');
                    }}
                >
                    {/* Close Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreviewUrl(null);
                            setPreviewType('other');
                        }}
                        className="absolute top-4 right-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-10"
                    >
                        <X size={24} />
                    </button>

                    {/* Preview Content */}
                    <div
                        className="max-w-[90vw] max-h-[90vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {previewType === 'image' && (
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        )}
                        {previewType === 'pdf' && (
                            <iframe
                                src={`${previewUrl}#view=FitH`}
                                className="w-[85vw] h-[85vh] rounded-xl bg-white"
                                title="PDF Preview"
                            />
                        )}
                    </div>

                    {/* Download Button */}
                    <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                    >
                        <Download size={18} />
                        {language === 'tr' ? 'İndir' : 'Download'}
                    </a>
                </div>
            )}
        </div >
    );
}
