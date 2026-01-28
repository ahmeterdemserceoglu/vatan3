'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Header } from '@/components/Header';
import { Assignment, AssignmentSubmission, User, Board, Rubric, RubricCriterion } from '@/types';
import {
    subscribeToBoardAssignments, createAssignment, deleteAssignment, updateAssignment,
    subscribeToAssignmentSubmissions, submitAssignment, subscribeToStudentSubmission,
    notifyNewAssignment, notifySubmission, notifySubmissionUpdate, gradeSubmission, updateStudentSubmission,
    filterAssignments, AssignmentFilters, getAssignmentCategories,
    bulkCloseAssignments, bulkDeleteAssignments, checkPlagiarism, bulkCheckPlagiarism,
    getAllStudentsProgress, StudentProgress, exportSubmissionsToCSV, exportProgressToCSV,
    getRubrics, createRubric, reorderAssignments
} from '@/lib/assignments';
import { advancedPlagiarismCheck, bulkAdvancedPlagiarismCheck, getRiskLevelStyle, PlagiarismResult } from '@/lib/plagiarism';
import { getBoard } from '@/lib/boards';
import { getUsersByIds } from '@/lib/auth';
import { uploadToSupabase, deleteFromSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
    ArrowLeft, Plus, Calendar, Clock, CheckCircle, AlertCircle, FileText,
    ChevronRight, ChevronLeft, Users, Trash2, Loader2, Send, BookOpen,
    BellRing, Award, Paperclip, Download, MessageSquare, Star, Search,
    Filter, X, Edit2, Copy, BarChart3, Shield, Eye, FileDown, Check,
    ChevronDown, ToggleLeft, ToggleRight, Image, File, Film, GripVertical,
    FolderOpen, Folder, ChevronsUpDown,
    FileStack
} from 'lucide-react';

type ViewType = 'list' | 'detail' | 'create' | 'edit' | 'submissions' | 'progress' | 'calendar';

export default function AssignmentsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const highlightParam = searchParams?.get('highlight');
    const boardId = params.id as string;
    const { user, isLoading } = useStore();
    const { language } = useTranslation();
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

    const [board, setBoard] = useState<Board | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [loadingBoard, setLoadingBoard] = useState(true);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [view, setView] = useState<ViewType>('list');
    const [highlightedAssignmentId, setHighlightedAssignmentId] = useState<string | null>(null);

    // Form states (Create & Edit)
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('23:59');
    const [assignmentType, setAssignmentType] = useState<'homework' | 'reminder'>('homework');
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<{ url: string; name: string; type?: string }[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [maxPoints, setMaxPoints] = useState(100);
    const [allowLateSubmission, setAllowLateSubmission] = useState(true);
    const [lateSubmissionPenalty, setLateSubmissionPenalty] = useState(0);
    const [category, setCategory] = useState('');

    // Submit states
    const [submitContent, setSubmitContent] = useState('');
    const [submitFiles, setSubmitFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mySubmission, setMySubmission] = useState<AssignmentSubmission | null>(null);
    const [isEditingSubmission, setIsEditingSubmission] = useState(false);
    const [existingSubmissionAttachments, setExistingSubmissionAttachments] = useState<{ url: string; name: string; type?: string }[]>([]);
    // Yeni: Yüklenmiş dosyaları takip et
    const [uploadedSubmitAttachments, setUploadedSubmitAttachments] = useState<{ url: string; name: string; type?: string }[]>([]);
    const [isUploadingSubmitFile, setIsUploadingSubmitFile] = useState(false);

    // Teacher states
    const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
    const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackGrade, setFeedbackGrade] = useState<string>('');
    const [isGrading, setIsGrading] = useState(false);
    const [submissionStats, setSubmissionStats] = useState<Record<string, { total: number; graded: number; late: number }>>({});

    // Filtering & Search
    const [filters, setFilters] = useState<AssignmentFilters>({ status: 'all', type: 'all', dateRange: 'all' });
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Bulk operations
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkMode, setBulkMode] = useState(false);

    // Progress tracking
    const [studentsProgress, setStudentsProgress] = useState<StudentProgress[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(false);

    // Plagiarism - Gelişmiş
    const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
    const [plagiarismProgress, setPlagiarismProgress] = useState<{ current: number; total: number } | null>(null);
    const [showPlagiarismModal, setShowPlagiarismModal] = useState(false);
    const [selectedPlagiarismResult, setSelectedPlagiarismResult] = useState<{
        submission: AssignmentSubmission;
        result?: PlagiarismResult;
    } | null>(null);

    // File preview
    const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type?: string } | null>(null);

    // Calendar
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);

    // Drag and drop
    const [draggedItem, setDraggedItem] = useState<Assignment | null>(null);
    const [dragOverItem, setDragOverItem] = useState<string | null>(null);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

    // Category accordion
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['general']));
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    // Sayfa kapatıldığında veya yenilendiğinde yüklenmiş ama teslim edilmemiş dosyaları temizle
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Sync olarak silme yapamayız ama en azından state'i temizleriz
            // Supabase'de gereksiz dosyalar kalabilir, periyodik temizlik gerekebilir
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Component unmount olduğunda yüklenmiş dosyaları sil
            // Bu async olduğu için tam guarantee edilemez
        };
    }, []);


    useEffect(() => {
        if (!boardId) return;
        getBoard(boardId).then(setBoard).finally(() => setLoadingBoard(false));
    }, [boardId]);

    useEffect(() => {
        if (!board) return;
        getUsersByIds([...(board.members || []), board.ownerId]).then(setMembers);
    }, [board]);

    useEffect(() => {
        if (!boardId) return;
        return subscribeToBoardAssignments(boardId, setAssignments);
    }, [boardId]);

    // Handle highlight parameter from URL (notification click)
    useEffect(() => {
        if (highlightParam && assignments.length > 0) {
            const assignmentToHighlight = assignments.find(a => a.id === highlightParam);
            if (assignmentToHighlight) {
                setSelectedAssignment(assignmentToHighlight);
                setHighlightedAssignmentId(highlightParam);
                setView('detail');

                // Clear highlight after animation (3 seconds)
                const timer = setTimeout(() => {
                    setHighlightedAssignmentId(null);
                    // Clear URL parameter
                    window.history.replaceState({}, '', window.location.pathname);
                }, 3000);

                return () => clearTimeout(timer);
            }
        }
    }, [highlightParam, assignments]);


    // Subscribe to all assignments' submissions for stats (teacher only)
    useEffect(() => {
        if (!isTeacher || assignments.length === 0) return;
        const unsubscribers: (() => void)[] = [];

        assignments.forEach(assignment => {
            const unsub = subscribeToAssignmentSubmissions(assignment.id, (subs) => {
                setSubmissionStats(prev => ({
                    ...prev,
                    [assignment.id]: {
                        total: subs.length,
                        graded: subs.filter(s => s.grade !== undefined).length,
                        late: subs.filter(s => s.isLate).length
                    }
                }));
            });
            unsubscribers.push(unsub);
        });

        return () => unsubscribers.forEach(u => u());
    }, [isTeacher, assignments]);

    useEffect(() => {
        if (!selectedAssignment || !user || isTeacher) return;
        return subscribeToStudentSubmission(selectedAssignment.id, user.uid, setMySubmission);
    }, [selectedAssignment, user, isTeacher]);

    // Load existing submission data into form when editing
    useEffect(() => {
        if (mySubmission) {
            setSubmitContent(mySubmission.content || '');
            setExistingSubmissionAttachments(mySubmission.attachments || []);
        } else {
            setSubmitContent('');
            setExistingSubmissionAttachments([]);
        }
    }, [mySubmission]);

    useEffect(() => {
        if (!selectedAssignment || !isTeacher) return;
        return subscribeToAssignmentSubmissions(selectedAssignment.id, setSubmissions);
    }, [selectedAssignment, isTeacher]);

    // Filtered & sorted assignments
    const filteredAssignments = useMemo(() => {
        let result = filterAssignments(assignments, { ...filters, search: searchQuery });
        const now = new Date();
        return result.sort((a, b) => {
            const aOver = a.dueDate < now, bOver = b.dueDate < now;
            if (!aOver && bOver) return -1;
            if (aOver && !bOver) return 1;
            return a.dueDate.getTime() - b.dueDate.getTime();
        });
    }, [assignments, filters, searchQuery]);

    // Sorted assignments (respects manual order if set)
    const sortedAssignments = useMemo(() => {
        const hasOrder = filteredAssignments.some(a => a.order !== undefined);
        if (hasOrder) {
            return [...filteredAssignments].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
        }
        return filteredAssignments;
    }, [filteredAssignments]);

    const categories = useMemo(() => getAssignmentCategories(assignments), [assignments]);

    // Group assignments by category
    const groupedByCategory = useMemo(() => {
        const groups: Record<string, Assignment[]> = { 'general': [] };
        categories.forEach(cat => {
            if (cat !== 'Tümü' && cat !== 'All') groups[cat] = [];
        });

        sortedAssignments.forEach(a => {
            const cat = a.category?.trim() || 'general';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(a);
        });

        return groups;
    }, [sortedAssignments, categories]);

    // Category toggle functions
    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const expandAllCategories = () => {
        setExpandedCategories(new Set(Object.keys(groupedByCategory)));
    };

    const collapseAllCategories = () => {
        setExpandedCategories(new Set());
    };


    const formatDate = (d: Date) => new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(d);

    const formatFullDate = (d: Date) => new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(d);

    const getTimeRemaining = (d: Date) => {
        const diff = d.getTime() - Date.now();
        if (diff < 0) return language === 'tr' ? 'Süresi doldu' : 'Overdue';

        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);

        if (days > 0) return language === 'tr' ? `${days} gün ${hours} saat` : `${days} days ${hours} hours`;
        if (hours > 0) return language === 'tr' ? `${hours} saat ${minutes} dak` : `${hours} hours ${minutes} mins`;
        return language === 'tr' ? `${minutes} dakika` : `${minutes} minutes`;
    };

    const isOverdue = (d: Date) => new Date() > d;
    const getDaysLeft = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86400000);

    const resetForm = () => {
        setTitle(''); setDescription(''); setDueDate(''); setDueTime('23:59');
        setAssignmentType('homework'); setAttachmentFiles([]); setExistingAttachments([]);
        setSubmitContent(''); setSubmitFiles([]); setUploadedSubmitAttachments([]);
        setFeedbackText(''); setFeedbackGrade('');
        setMaxPoints(100); setAllowLateSubmission(true); setLateSubmissionPenalty(0);
        setCategory('');
    };

    // Open edit mode with assignment data
    const openEditMode = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setTitle(assignment.title);
        setDescription(assignment.description);
        const d = new Date(assignment.dueDate);
        setDueDate(d.toISOString().split('T')[0]);
        setDueTime(d.toTimeString().slice(0, 5));
        setAssignmentType(assignment.assignmentType);
        setMaxPoints(assignment.maxPoints || 100);
        setAllowLateSubmission(assignment.allowLateSubmission ?? true);
        setLateSubmissionPenalty(assignment.lateSubmissionPenalty || 0);
        setCategory(assignment.category || '');
        setExistingAttachments(assignment.attachments || []);
        setAttachmentFiles([]); // Clear any previously selected files
        setView('edit');
    };

    // Load student progress
    const loadProgress = async () => {
        if (!boardId) return;
        setLoadingProgress(true);
        try {
            const studentIds = members.filter(m => m.role !== 'teacher').map(m => m.uid);
            const progress = await getAllStudentsProgress(boardId, studentIds);
            setStudentsProgress(progress);
        } catch (e) { console.error(e); }
        finally { setLoadingProgress(false); }
    };

    // Gelişmiş Plagiarism check - Toplu
    const handlePlagiarismCheck = async () => {
        if (!selectedAssignment) return;
        setCheckingPlagiarism(true);
        setPlagiarismProgress({ current: 0, total: submissions.length });
        try {
            await bulkAdvancedPlagiarismCheck(
                selectedAssignment.id,
                (current, total) => setPlagiarismProgress({ current, total })
            );
            // Submissions will auto-refresh via subscription
        } catch (e) { console.error(e); }
        finally {
            setCheckingPlagiarism(false);
            setPlagiarismProgress(null);
        }
    };

    // Tek bir teslim için intihal kontrolü
    const handleSinglePlagiarismCheck = async (submission: AssignmentSubmission) => {
        if (!selectedAssignment) return;
        setSelectedPlagiarismResult({ submission });
        setShowPlagiarismModal(true);
        try {
            const result = await advancedPlagiarismCheck(submission.id, selectedAssignment.id);
            setSelectedPlagiarismResult({ submission, result });
        } catch (e) {
            console.error(e);
        }
    };


    // Export functions
    const handleExportSubmissions = () => {
        if (!selectedAssignment) return;
        const csv = exportSubmissionsToCSV(submissions, selectedAssignment);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${selectedAssignment.title}_teslimler.csv`;
        link.click();
    };

    const handleExportProgress = () => {
        const csv = exportProgressToCSV(studentsProgress);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ogrenci_ilerleme.csv`;
        link.click();
    };

    // Bulk operations
    const handleBulkClose = async () => {
        if (selectedIds.length === 0) return;
        await bulkCloseAssignments(selectedIds);
        setSelectedIds([]); setBulkMode(false);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(language === 'tr' ? `${selectedIds.length} ödevi silmek istediğinizden emin misiniz?` : `Delete ${selectedIds.length} assignments?`)) return;
        await bulkDeleteAssignments(selectedIds);
        setSelectedIds([]); setBulkMode(false);
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, assignment: Assignment) => {
        setDraggedItem(assignment);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', assignment.id);
    };

    const handleDragOver = (e: React.DragEvent, assignmentId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedItem && draggedItem.id !== assignmentId) {
            setDragOverItem(assignmentId);
        }
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverItem(null);
        setDragOverCategory(null);
    };

    const handleDrop = async (e: React.DragEvent, targetAssignment: Assignment) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.id === targetAssignment.id) {
            handleDragEnd();
            return;
        }

        // Get sorted list for reordering within same category
        const targetCat = targetAssignment.category || 'general';
        const draggedCat = draggedItem.category || 'general';

        if (targetCat !== draggedCat) {
            // Moving to different category - update category
            try {
                await updateAssignment(draggedItem.id, { category: targetCat === 'general' ? '' : targetCat });
            } catch (e) {
                console.error('Move failed:', e);
            }
        } else {
            // Reorder within same category
            const categoryAssignments = groupedByCategory[targetCat] || [];
            const draggedIndex = categoryAssignments.findIndex(a => a.id === draggedItem.id);
            const targetIndex = categoryAssignments.findIndex(a => a.id === targetAssignment.id);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                const newList = [...categoryAssignments];
                const [removed] = newList.splice(draggedIndex, 1);
                newList.splice(targetIndex, 0, removed);

                const updates = newList.map((a, i) => ({ id: a.id, order: i }));
                try {
                    await reorderAssignments(updates);
                } catch (e) {
                    console.error('Reorder failed:', e);
                }
            }
        }

        handleDragEnd();
    };

    // Drop on category header to move assignment to that category
    const handleDropOnCategory = async (e: React.DragEvent, targetCategory: string) => {
        e.preventDefault();
        if (!draggedItem) {
            handleDragEnd();
            return;
        }

        const draggedCat = draggedItem.category || 'general';
        if (draggedCat === targetCategory) {
            handleDragEnd();
            return;
        }

        try {
            await updateAssignment(draggedItem.id, {
                category: targetCategory === 'general' ? '' : targetCategory
            });
        } catch (e) {
            console.error('Move to category failed:', e);
        }

        handleDragEnd();
    };

    // File preview helper
    const getFileIcon = (type?: string) => {
        if (!type) return <File size={16} />;
        if (type.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
        if (type.startsWith('video/')) return <Film size={16} className="text-purple-500" />;
        if (type.includes('pdf')) return <FileText size={16} className="text-red-500" />;
        return <File size={16} className="text-stone-500" />;
    };

    const canPreview = (type?: string) => {
        if (!type) return false;
        return type.startsWith('image/') || type.includes('pdf');
    };

    // Calendar helpers
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const getAssignmentsForDate = (date: Date) => {
        return assignments.filter(a => {
            const dueDate = new Date(a.dueDate);
            return dueDate.getDate() === date.getDate() &&
                dueDate.getMonth() === date.getMonth() &&
                dueDate.getFullYear() === date.getFullYear();
        });
    };

    const calendarDays = useMemo(() => {
        const days: (Date | null)[] = [];
        const firstDay = getFirstDayOfMonth(calendarMonth);
        const daysInMonth = getDaysInMonth(calendarMonth);

        // Adjust for Monday start (0 = Sunday in JS)
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;

        for (let i = 0; i < startOffset; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i));
        }
        return days;
    }, [calendarMonth]);

    const handleCreate = async () => {
        if (!user || !title.trim() || !dueDate || !board) return;
        setIsCreating(true);
        try {
            const attachments: { url: string; name: string; type?: string }[] = [];
            for (const f of attachmentFiles) {
                attachments.push({ url: await uploadToSupabase(f), name: f.name, type: f.type });
            }
            const dueDateObj = new Date(`${dueDate}T${dueTime}`);
            const id = await createAssignment({
                boardId, title: title.trim(), description: description.trim(),
                createdBy: user.uid, createdByName: user.displayName,
                dueDate: dueDateObj, assignmentType,
                attachments: attachments.length > 0 ? attachments : undefined,
                maxPoints, allowLateSubmission, lateSubmissionPenalty,
                category: category.trim() || undefined,
            });
            await notifyNewAssignment(id, title.trim(), boardId, board.title, user.displayName, user.uid, members.map(m => m.uid), dueDateObj, assignmentType);
            resetForm(); setView('list');
        } catch (e) { console.error(e); }
        finally { setIsCreating(false); }
    };

    const handleEdit = async () => {
        if (!user || !selectedAssignment || !title.trim() || !dueDate) return;
        setIsCreating(true);
        try {
            // Start with existing attachments
            const newAttachments: { url: string; name: string; type?: string }[] = [...existingAttachments];

            // Upload new files if any
            if (attachmentFiles.length > 0) {
                for (const f of attachmentFiles) {
                    try {
                        const url = await uploadToSupabase(f);
                        newAttachments.push({ url, name: f.name, type: f.type });
                    } catch (uploadError) {
                        console.error('File upload failed:', f.name, uploadError);
                        alert(`${language === 'tr' ? 'Dosya yüklenemedi:' : 'Failed to upload:'} ${f.name}`);
                        throw uploadError;
                    }
                }
            }

            // Delete removed files from storage
            const originalAttachments = selectedAssignment.attachments || [];
            for (const oldAtt of originalAttachments) {
                const stillExists = newAttachments.some(a => a.url === oldAtt.url);
                if (!stillExists) {
                    try {
                        await deleteFromSupabase(oldAtt.url);
                    } catch (e) {
                        console.warn('Could not delete old file:', e);
                    }
                }
            }

            const dueDateObj = new Date(`${dueDate}T${dueTime}`);

            // Build update object - only include attachments fields if we have data
            const updateData: any = {
                title: title.trim(),
                description: description.trim(),
                dueDate: dueDateObj,
                assignmentType,
                maxPoints,
                allowLateSubmission,
                lateSubmissionPenalty,
                category: category.trim() || undefined,
            };

            // Always set attachments (can be empty array)
            updateData.attachments = newAttachments;
            if (newAttachments.length > 0) {
                updateData.attachmentUrl = newAttachments[0].url;
                updateData.attachmentName = newAttachments[0].name;
            } else {
                // Firestore doesn't like undefined, use deleteField or null
                updateData.attachmentUrl = null;
                updateData.attachmentName = null;
            }

            await updateAssignment(selectedAssignment.id, updateData);
            resetForm();
            setSelectedAssignment(null);
            setView('list');
        } catch (e) {
            console.error('Assignment update failed:', e);
            alert(language === 'tr' ? 'Ödev güncellenirken bir hata oluştu.' : 'Failed to update assignment.');
        }
        finally { setIsCreating(false); }
    };

    const handleUpdateSubmission = async () => {
        // Content veya dosya olmalı - dosya yoksa sadece content olabilir
        if (!user || !mySubmission) return;

        // Hiçbir içerik yoksa uyarı ver
        const hasContent = submitContent.trim().length > 0;
        const hasExistingFiles = existingSubmissionAttachments.length > 0;
        const hasNewFiles = uploadedSubmitAttachments.length > 0; // Use uploadedSubmitAttachments instead of submitFiles

        if (!hasContent && !hasExistingFiles && !hasNewFiles) {
            alert(language === 'tr' ? 'En az bir metin veya dosya eklemelisiniz!' : 'You must add at least text or a file!');
            return;
        }

        setIsSubmitting(true);
        try {
            // Combine existing files with newly uploaded files
            // uploadedSubmitAttachments already have URLs (uploaded in handleSubmitFileSelect)
            const newAttachments: { url: string; name: string; type?: string }[] = [
                ...existingSubmissionAttachments,
                ...uploadedSubmitAttachments
            ];

            // Kaldırılan dosyaları Supabase'den sil
            const originalAttachments = mySubmission.attachments || [];
            for (const oldAtt of originalAttachments) {
                const stillExists = newAttachments.some(a => a.url === oldAtt.url);
                if (!stillExists) {
                    try {
                        await deleteFromSupabase(oldAtt.url);
                    } catch (e) {
                        console.warn('Dosya silinemedi:', e);
                    }
                }
            }

            await updateStudentSubmission(mySubmission.id, {
                content: submitContent.trim() || '',
                attachments: newAttachments, // Boş array olabilir
            });

            // Notify teacher about the update
            if (user && selectedAssignment && board) {
                const staffMembers = members.filter(m => m.role === 'teacher' || m.role === 'admin');
                for (const staff of staffMembers) {
                    await notifySubmissionUpdate(
                        selectedAssignment.id,
                        selectedAssignment.title,
                        boardId,
                        board.title,
                        user.uid,
                        user.displayName,
                        staff.uid
                    );
                }
            }

            // Reset all states
            setSubmitContent('');
            setSubmitFiles([]);
            setExistingSubmissionAttachments([]);
            setUploadedSubmitAttachments([]); // Clear uploaded files too
        } catch (e) { console.error(e); }
        finally { setIsSubmitting(false); }
    };

    // Dosya seçildiğinde hemen yükle
    const handleSubmitFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const validFiles = Array.from(files).filter(file => {
            if (file.size > 50 * 1024 * 1024) {
                alert(language === 'tr'
                    ? `"${file.name}" 50MB'dan büyük olduğu için eklenemedi.`
                    : `"${file.name}" could not be added because it exceeds 50MB.`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        setIsUploadingSubmitFile(true);
        try {
            const newAttachments: { url: string; name: string; type?: string }[] = [];
            for (const f of validFiles) {
                const url = await uploadToSupabase(f);
                newAttachments.push({ url, name: f.name, type: f.type });
            }
            setUploadedSubmitAttachments(prev => [...prev, ...newAttachments]);
        } catch (e) {
            console.error('Dosya yükleme hatası:', e);
            alert(language === 'tr' ? 'Dosya yüklenirken hata oluştu!' : 'Error uploading file!');
        } finally {
            setIsUploadingSubmitFile(false);
        }
    };

    // Yüklenmiş dosyayı kaldır ve Supabase'den sil
    const removeUploadedSubmitAttachment = async (index: number) => {
        const attachment = uploadedSubmitAttachments[index];
        if (attachment?.url) {
            try {
                await deleteFromSupabase(attachment.url);
            } catch (e) {
                console.warn('Dosya Supabase\'den silinemedi:', e);
            }
        }
        setUploadedSubmitAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Sayfa değiştiğinde veya component unmount olduğunda
    // teslim edilmemiş dosyaları temizle
    const cleanupUnsubmittedFiles = async () => {
        for (const att of uploadedSubmitAttachments) {
            try {
                await deleteFromSupabase(att.url);
            } catch (e) {
                console.warn('Temizleme sırasında dosya silinemedi:', e);
            }
        }
        setUploadedSubmitAttachments([]);
    };

    const handleSubmit = async () => {
        // Artık uploadedSubmitAttachments kullanıyoruz
        if (!user || !selectedAssignment || (!submitContent.trim() && !uploadedSubmitAttachments.length)) return;
        setIsSubmitting(true);
        try {
            await submitAssignment({
                assignmentId: selectedAssignment.id, boardId, studentId: user.uid,
                studentName: user.displayName, content: submitContent.trim() || undefined,
                attachments: uploadedSubmitAttachments.length > 0 ? uploadedSubmitAttachments : undefined,
                isLate: new Date() > selectedAssignment.dueDate
            });
            const staffMembers = members.filter(m => m.role === 'teacher' || m.role === 'admin');
            if (board) {
                for (const staff of staffMembers) {
                    await notifySubmission(selectedAssignment.id, selectedAssignment.title, boardId, board.title, user.uid, user.displayName, staff.uid);
                }
            }
            resetForm();
            setUploadedSubmitAttachments([]); // Yüklenen dosyaları temizle
        } catch (e) { console.error(e); }
        finally { setIsSubmitting(false); }
    };

    const handleGrade = async () => {
        if (!selectedSubmission || !user || !selectedAssignment || !board) return;
        setIsGrading(true);
        try {
            await gradeSubmission(selectedSubmission.id, feedbackGrade ? Number(feedbackGrade) : 0, feedbackText.trim(), user.uid, selectedSubmission.studentId, selectedAssignment.title, boardId, board.title, user.displayName);
            setFeedbackText(''); setFeedbackGrade(''); setSelectedSubmission(null);
        } catch (e) { console.error(e); }
        finally { setIsGrading(false); }
    };

    if (isLoading || loadingBoard) {
        return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-400" /></div>;
    }

    if (!board) {
        return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-500">{language === 'tr' ? 'Pano bulunamadı' : 'Board not found'}</p></div>;
    }

    return (
        <div className="min-h-screen bg-stone-50">
            <Header />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push(`/board/${boardId}`)} className="p-2 hover:bg-white rounded-lg transition-colors border border-stone-200 shadow-sm">
                            <ArrowLeft size={18} className="text-stone-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-stone-800">{language === 'tr' ? 'Ödevler' : 'Assignments'}</h1>
                            <p className="text-xs text-stone-500">{board.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {view === 'list' && (
                            <button onClick={() => setShowCalendar(!showCalendar)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border", showCalendar ? "bg-blue-50 border-blue-300 text-blue-700" : "text-stone-600 hover:bg-white border-stone-200")}>
                                <Calendar size={16} />
                                <span className="hidden sm:inline">{language === 'tr' ? 'Takvim' : 'Calendar'}</span>
                            </button>
                        )}
                        {isTeacher && view === 'list' && (
                            <>
                                <button onClick={() => { loadProgress(); setView('progress'); }} className="flex items-center gap-1.5 px-3 py-2 text-stone-600 hover:bg-white rounded-lg text-sm font-medium border border-stone-200">
                                    <BarChart3 size={16} />
                                    <span className="hidden sm:inline">{language === 'tr' ? 'İlerleme' : 'Progress'}</span>
                                </button>
                                <button onClick={() => setBulkMode(!bulkMode)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border", bulkMode ? "bg-amber-50 border-amber-300 text-amber-700" : "text-stone-600 hover:bg-white border-stone-200")}>
                                    <Check size={16} />
                                    <span className="hidden sm:inline">{language === 'tr' ? 'Toplu' : 'Bulk'}</span>
                                </button>
                                <button onClick={() => { resetForm(); setView('create'); }} className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors shadow-sm">
                                    <Plus size={16} />
                                    {language === 'tr' ? 'Yeni' : 'New'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Search and Filters - Only in list view */}
                {view === 'list' && (
                    <div className="mb-4 space-y-3">
                        {/* Search Bar */}
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={language === 'tr' ? 'Ödev ara...' : 'Search assignments...'}
                                    className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-300 focus:outline-none bg-white"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <X size={14} className="text-stone-400 hover:text-stone-600" />
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setShowFilters(!showFilters)} className={cn("flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm", showFilters ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 hover:bg-white")}>
                                <Filter size={16} />
                                <span className="hidden sm:inline">{language === 'tr' ? 'Filtre' : 'Filter'}</span>
                            </button>
                        </div>

                        {/* Filter Panel */}
                        {showFilters && (
                            <div className="bg-white rounded-lg border border-stone-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1">{language === 'tr' ? 'Durum' : 'Status'}</label>
                                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as any })} className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm">
                                        <option value="all">{language === 'tr' ? 'Tümü' : 'All'}</option>
                                        <option value="active">{language === 'tr' ? 'Aktif' : 'Active'}</option>
                                        <option value="closed">{language === 'tr' ? 'Kapalı' : 'Closed'}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1">{language === 'tr' ? 'Tip' : 'Type'}</label>
                                    <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value as any })} className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm">
                                        <option value="all">{language === 'tr' ? 'Tümü' : 'All'}</option>
                                        <option value="homework">{language === 'tr' ? 'Ödev' : 'Homework'}</option>
                                        <option value="reminder">{language === 'tr' ? 'Hatırlatma' : 'Reminder'}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1">{language === 'tr' ? 'Tarih' : 'Date'}</label>
                                    <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })} className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm">
                                        <option value="all">{language === 'tr' ? 'Tümü' : 'All'}</option>
                                        <option value="upcoming">{language === 'tr' ? 'Yaklaşan' : 'Upcoming'}</option>
                                        <option value="thisWeek">{language === 'tr' ? 'Bu Hafta' : 'This Week'}</option>
                                        <option value="thisMonth">{language === 'tr' ? 'Bu Ay' : 'This Month'}</option>
                                        <option value="past">{language === 'tr' ? 'Geçmiş' : 'Past'}</option>
                                    </select>
                                </div>
                                {categories.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1">{language === 'tr' ? 'Kategori' : 'Category'}</label>
                                        <select value={filters.category || ''} onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })} className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm">
                                            <option value="">{language === 'tr' ? 'Tümü' : 'All'}</option>
                                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Bulk Actions Bar */}
                        {bulkMode && selectedIds.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                                <span className="text-sm text-amber-700">{selectedIds.length} {language === 'tr' ? 'ödev seçildi' : 'selected'}</span>
                                <div className="flex gap-2">
                                    <button onClick={handleBulkClose} className="px-3 py-1.5 bg-stone-600 text-white rounded text-xs font-medium hover:bg-stone-700">
                                        {language === 'tr' ? 'Kapat' : 'Close'}
                                    </button>
                                    <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600">
                                        {language === 'tr' ? 'Sil' : 'Delete'}
                                    </button>
                                    <button onClick={() => { setSelectedIds([]); setBulkMode(false); }} className="px-3 py-1.5 text-stone-600 hover:bg-amber-100 rounded text-xs">
                                        {language === 'tr' ? 'İptal' : 'Cancel'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Calendar View */}
                {view === 'list' && showCalendar && (
                    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} className="p-1.5 hover:bg-stone-100 rounded-lg">
                                <ChevronLeft size={18} className="text-stone-600" />
                            </button>
                            <h3 className="font-medium text-stone-800">
                                {calendarMonth.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' })}
                            </h3>
                            <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} className="p-1.5 hover:bg-stone-100 rounded-lg">
                                <ChevronRight size={18} className="text-stone-600" />
                            </button>
                        </div>

                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {(language === 'tr' ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map(day => (
                                <div key={day} className="text-center text-xs font-medium text-stone-500 py-1">{day}</div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, idx) => {
                                if (!day) return <div key={idx} />;

                                const dayAssignments = getAssignmentsForDate(day);
                                const isToday = day.toDateString() === new Date().toDateString();
                                const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                                return (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "min-h-[60px] p-1 rounded-lg border text-xs transition-all",
                                            isToday ? "border-blue-400 bg-blue-50" : "border-stone-100 hover:border-stone-200",
                                            isPast && !isToday && "opacity-50"
                                        )}
                                    >
                                        <span className={cn("block text-right mb-1 font-medium", isToday ? "text-blue-600" : "text-stone-600")}>{day.getDate()}</span>
                                        <div className="space-y-0.5">
                                            {dayAssignments.slice(0, 2).map(a => (
                                                <div
                                                    key={a.id}
                                                    onClick={() => { setSelectedAssignment(a); setView('detail'); setShowCalendar(false); }}
                                                    className={cn(
                                                        "px-1 py-0.5 rounded text-[10px] truncate cursor-pointer hover:opacity-80",
                                                        a.assignmentType === 'reminder' ? "bg-amber-100 text-amber-700" :
                                                            a.status === 'closed' ? "bg-stone-100 text-stone-500" :
                                                                isOverdue(a.dueDate) ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"
                                                    )}
                                                >
                                                    {a.title}
                                                </div>
                                            ))}
                                            {dayAssignments.length > 2 && (
                                                <span className="text-[10px] text-stone-400 block text-center">+{dayAssignments.length - 2}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-100 text-[10px]">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-emerald-100" />
                                <span className="text-stone-500">{language === 'tr' ? 'Aktif' : 'Active'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-red-100" />
                                <span className="text-stone-500">{language === 'tr' ? 'Süresi Doldu' : 'Overdue'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-amber-100" />
                                <span className="text-stone-500">{language === 'tr' ? 'Hatırlatma' : 'Reminder'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-stone-100" />
                                <span className="text-stone-500">{language === 'tr' ? 'Kapalı' : 'Closed'}</span>
                            </div>
                        </div>
                    </div>
                )}
                {/* List View - Accordion by Category */}
                {view === 'list' && (
                    <div className="space-y-2">
                        {/* Collapse All Button */}
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={expandedCategories.size > 0 ? collapseAllCategories : expandAllCategories}
                                className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1"
                            >
                                <ChevronsUpDown size={14} />
                                {expandedCategories.size > 0
                                    ? (language === 'tr' ? 'Tümünü daralt' : 'Collapse all')
                                    : (language === 'tr' ? 'Tümünü genişlet' : 'Expand all')
                                }
                            </button>
                        </div>

                        {sortedAssignments.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
                                <FileText className="mx-auto mb-3 text-stone-300" size={40} />
                                <p className="text-stone-500 text-sm">{language === 'tr' ? 'Henüz ödev yok' : 'No assignments yet'}</p>
                            </div>
                        ) : (
                            Object.entries(groupedByCategory).map(([categoryName, categoryAssignments]) => {
                                if (categoryAssignments.length === 0 && categoryName !== 'general') return null;
                                const isExpanded = expandedCategories.has(categoryName);
                                const displayName = categoryName === 'general'
                                    ? (language === 'tr' ? 'Genel' : 'General')
                                    : categoryName;

                                return (
                                    <div
                                        key={categoryName}
                                        className={cn(
                                            "bg-white rounded-xl border border-stone-200 overflow-hidden transition-all",
                                            dragOverCategory === categoryName && "ring-2 ring-blue-400"
                                        )}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            if (isTeacher && draggedItem) setDragOverCategory(categoryName);
                                        }}
                                        onDragLeave={() => setDragOverCategory(null)}
                                        onDrop={(e) => isTeacher && handleDropOnCategory(e, categoryName)}
                                    >
                                        {/* Category Header */}
                                        <button
                                            onClick={() => toggleCategory(categoryName)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                                    categoryName === 'general' ? "bg-stone-100" : "bg-blue-50"
                                                )}>
                                                    {isExpanded
                                                        ? <FolderOpen size={18} className={categoryName === 'general' ? "text-stone-600" : "text-blue-600"} />
                                                        : <Folder size={18} className={categoryName === 'general' ? "text-stone-600" : "text-blue-600"} />
                                                    }
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-stone-800">{displayName}</h3>
                                                    <p className="text-xs text-stone-500">
                                                        {categoryAssignments.length} {language === 'tr' ? 'ödev' : 'assignments'}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronDown
                                                size={18}
                                                className={cn(
                                                    "text-stone-400 transition-transform",
                                                    isExpanded && "rotate-180"
                                                )}
                                            />
                                        </button>

                                        {/* Category Content */}
                                        {isExpanded && categoryAssignments.length > 0 && (
                                            <div className="border-t border-stone-100">
                                                {categoryAssignments.map((a: Assignment) => {
                                                    const overdue = isOverdue(a.dueDate);
                                                    const days = getDaysLeft(a.dueDate);
                                                    const isHw = a.assignmentType !== 'reminder';
                                                    const isClosed = a.status === 'closed';

                                                    return (
                                                        <div
                                                            key={a.id}
                                                            onClick={() => { if (!bulkMode && !draggedItem) { setSelectedAssignment(a); setView('detail'); } }}
                                                            draggable={isTeacher && !bulkMode}
                                                            onDragStart={(e) => isTeacher && handleDragStart(e, a)}
                                                            onDragOver={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (isTeacher && draggedItem && draggedItem.id !== a.id) {
                                                                    setDragOverItem(a.id);
                                                                }
                                                            }}
                                                            onDragEnd={handleDragEnd}
                                                            onDrop={(e) => {
                                                                e.stopPropagation();
                                                                isTeacher && handleDrop(e, a);
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-3 px-4 py-3 hover:bg-stone-50 cursor-pointer transition-all border-b border-stone-50 last:border-b-0 group",
                                                                draggedItem?.id === a.id && "opacity-50 bg-blue-50",
                                                                dragOverItem === a.id && "bg-blue-50 border-l-2 border-l-blue-400",
                                                                highlightedAssignmentId === a.id && "ring-2 ring-indigo-400 ring-opacity-75 bg-indigo-50 animate-pulse"
                                                            )}
                                                        >
                                                            {/* Drag Handle */}
                                                            {isTeacher && !bulkMode && (
                                                                <div
                                                                    className="shrink-0 cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500"
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                >
                                                                    <GripVertical size={14} />
                                                                </div>
                                                            )}

                                                            {/* Bulk Checkbox */}
                                                            {bulkMode && (
                                                                <div onClick={(e) => e.stopPropagation()}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedIds.includes(a.id)}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedIds([...selectedIds, a.id]);
                                                                            } else {
                                                                                setSelectedIds(selectedIds.filter(id => id !== a.id));
                                                                            }
                                                                        }}
                                                                        className="w-4 h-4 rounded border-stone-300"
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Icon */}
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                                isHw ? "bg-stone-100" : "bg-amber-50",
                                                                isClosed && "opacity-60"
                                                            )}>
                                                                {isHw
                                                                    ? <FileText size={16} className="text-stone-600" />
                                                                    : <BellRing size={16} className="text-amber-600" />
                                                                }
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className={cn(
                                                                        "font-medium text-stone-800 truncate",
                                                                        isClosed && "text-stone-500"
                                                                    )}>
                                                                        {a.title}
                                                                    </h4>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                                                                    <span className={cn(
                                                                        isClosed ? "text-stone-400" :
                                                                            overdue ? "text-red-500" :
                                                                                days <= 1 ? "text-amber-500" : "text-stone-500"
                                                                    )}>
                                                                        {formatDate(a.dueDate)}
                                                                    </span>
                                                                    {isClosed && (
                                                                        <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded text-[10px]">
                                                                            {language === 'tr' ? 'Kapalı' : 'Closed'}
                                                                        </span>
                                                                    )}
                                                                    {overdue && !isClosed && (
                                                                        <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px]">
                                                                            {language === 'tr' ? 'Geçti' : 'Overdue'}
                                                                        </span>
                                                                    )}
                                                                    {/* Submission stats for teachers */}
                                                                    {isTeacher && isHw && submissionStats[a.id] && (
                                                                        <span className="text-[10px] text-stone-400">
                                                                            {submissionStats[a.id].total}/{members.filter(m => m.role !== 'teacher').length} {language === 'tr' ? 'teslim' : 'submitted'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {isTeacher && !bulkMode && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); openEditMode(a); }}
                                                                        className="p-1.5 hover:bg-stone-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <Edit2 size={14} className="text-stone-500" />
                                                                    </button>
                                                                )}
                                                                <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Empty category (only for general) */}
                                        {isExpanded && categoryAssignments.length === 0 && categoryName === 'general' && (
                                            <div className="p-6 text-center text-stone-400 text-sm border-t border-stone-100">
                                                {language === 'tr' ? 'Bu kategoride ödev yok' : 'No assignments in this category'}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Create View */}
                {(view === 'create' || view === 'edit') && (
                    <div className="bg-white rounded-xl border border-stone-200 p-5">
                        <div className="flex items-center gap-3 mb-5">
                            <button onClick={() => { resetForm(); setSelectedAssignment(null); setView('list'); }} className="p-1.5 hover:bg-stone-100 rounded-lg"><ArrowLeft size={18} /></button>
                            <h2 className="font-semibold text-stone-800">
                                {view === 'edit' ? (language === 'tr' ? 'Ödevi Düzenle' : 'Edit Assignment') : (language === 'tr' ? 'Yeni Ödev' : 'New Assignment')}
                            </h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'tr' ? 'Başlık' : 'Title'}</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-300 focus:outline-none" placeholder={language === 'tr' ? 'Ödev başlığı...' : 'Title...'} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'tr' ? 'Açıklama' : 'Description'}</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-300 focus:outline-none resize-none" placeholder={language === 'tr' ? 'Detaylı açıklama...' : 'Details...'} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'tr' ? 'Tarih' : 'Date'}</label>
                                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-300 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'tr' ? 'Saat' : 'Time'}</label>
                                    <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-300 focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-600 mb-2">{language === 'tr' ? 'Tip' : 'Type'}</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setAssignmentType('homework')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all", assignmentType === 'homework' ? "border-stone-800 bg-stone-800 text-white" : "border-stone-200 text-stone-600 hover:border-stone-300")}>
                                        <BookOpen size={14} /> {language === 'tr' ? 'Ödev' : 'Homework'}
                                    </button>
                                    <button onClick={() => setAssignmentType('reminder')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all", assignmentType === 'reminder' ? "border-amber-500 bg-amber-500 text-white" : "border-stone-200 text-stone-600 hover:border-stone-300")}>
                                        <BellRing size={14} /> {language === 'tr' ? 'Hatırlatma' : 'Reminder'}
                                    </button>
                                </div>
                            </div>

                            {/* Category - Available for both types */}
                            {/* Category - Dropdown style */}
                            <div className="relative">
                                <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'tr' ? 'Kategori' : 'Category'}</label>
                                <div
                                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-300 cursor-pointer flex items-center justify-between hover:border-stone-300"
                                >
                                    <span className={category ? "text-stone-800" : "text-stone-400"}>
                                        {category || (language === 'tr' ? 'Kategori seçin...' : 'Select category...')}
                                    </span>
                                    <ChevronDown size={16} className={cn("text-stone-400 transition-transform", showCategoryDropdown && "rotate-180")} />
                                </div>

                                {/* Dropdown */}
                                {showCategoryDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
                                        {/* Search/Create input */}
                                        <div className="p-2 border-b border-stone-100">
                                            <input
                                                type="text"
                                                value={category}
                                                onChange={e => setCategory(e.target.value)}
                                                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-300 focus:outline-none"
                                                placeholder={language === 'tr' ? 'Kategori ara veya yeni oluştur...' : 'Search or create new...'}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>

                                        {/* Existing categories */}
                                        <div className="max-h-40 overflow-y-auto">
                                            {categories.filter(c => c !== 'Tümü' && c !== 'All' && c.toLowerCase().includes(category.toLowerCase())).length > 0 ? (
                                                categories.filter(c => c !== 'Tümü' && c !== 'All' && c.toLowerCase().includes(category.toLowerCase())).map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => { setCategory(c); setShowCategoryDropdown(false); }}
                                                        className={cn(
                                                            "w-full px-3 py-2 text-left text-sm hover:bg-stone-50 flex items-center gap-2",
                                                            category === c && "bg-blue-50 text-blue-600"
                                                        )}
                                                    >
                                                        <Folder size={14} className="text-stone-400" />
                                                        {c}
                                                    </button>
                                                ))
                                            ) : category.trim() === '' ? (
                                                <div className="px-3 py-4 text-center text-sm text-stone-400">
                                                    {language === 'tr' ? 'Henüz kategori yok' : 'No categories yet'}
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Create new category button */}
                                        {category.trim() && !categories.some(c => c.toLowerCase() === category.toLowerCase()) && (
                                            <div className="p-2 border-t border-stone-100">
                                                <button
                                                    onClick={() => setShowCategoryDropdown(false)}
                                                    className="w-full px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center justify-center gap-2"
                                                >
                                                    <Plus size={14} />
                                                    {language === 'tr' ? `"${category}" kategorisini oluştur` : `Create "${category}" category`}
                                                </button>
                                            </div>
                                        )}

                                        {/* Clear button */}
                                        {category && (
                                            <div className="p-2 border-t border-stone-100">
                                                <button
                                                    onClick={() => { setCategory(''); setShowCategoryDropdown(false); }}
                                                    className="w-full px-3 py-1.5 text-stone-500 text-xs hover:text-stone-700"
                                                >
                                                    {language === 'tr' ? 'Kategoriyi temizle' : 'Clear category'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Click outside to close */}
                                {showCategoryDropdown && (
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowCategoryDropdown(false)}
                                    />
                                )}
                            </div>

                            {/* Homework specific options */}
                            {assignmentType === 'homework' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'tr' ? 'Maksimum Puan' : 'Max Points'}</label>
                                        <input type="number" value={maxPoints} onChange={e => setMaxPoints(Number(e.target.value))} min={1} max={1000} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-300 focus:outline-none" />
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                                        <div>
                                            <p className="text-sm font-medium text-stone-700">{language === 'tr' ? 'Geç Teslime İzin Ver' : 'Allow Late Submission'}</p>
                                            <p className="text-xs text-stone-500">{language === 'tr' ? 'Öğrenciler süre dolduktan sonra da teslim edebilir' : 'Students can submit after due date'}</p>
                                        </div>
                                        <button
                                            onClick={() => setAllowLateSubmission(!allowLateSubmission)}
                                            className={cn("w-12 h-6 rounded-full transition-colors relative", allowLateSubmission ? "bg-emerald-500" : "bg-stone-300")}
                                        >
                                            <div className={cn("absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow", allowLateSubmission ? "left-6" : "left-0.5")} />
                                        </button>
                                    </div>

                                    {allowLateSubmission && (
                                        <div>
                                            <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'tr' ? 'Geç Teslim Puan Kesintisi (%)' : 'Late Penalty (%)'}</label>
                                            <input type="number" value={lateSubmissionPenalty} onChange={e => setLateSubmissionPenalty(Number(e.target.value))} min={0} max={100} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-300 focus:outline-none" placeholder="0" />
                                            <p className="text-xs text-stone-400 mt-1">{language === 'tr' ? 'Geç teslimlerde bu yüzde kadar puan kesilir' : 'This percentage will be deducted from late submissions'}</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Existing attachments (Edit mode) */}
                            {view === 'edit' && existingAttachments.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-2">{language === 'tr' ? 'Mevcut Dosyalar' : 'Current Files'}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {existingAttachments.map((att, i) => (
                                            <div key={i} className="flex items-center gap-2 px-2 py-1 bg-stone-50 border border-stone-200 rounded text-xs">
                                                {getFileIcon(att.type)}
                                                <span className="text-stone-600">{att.name}</span>
                                                <button onClick={() => setExistingAttachments(existingAttachments.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'tr' ? 'Dosya Ekle' : 'Add Files'}</label>
                                <input
                                    type="file"
                                    multiple
                                    onChange={e => {
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
                                    className="w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-stone-100 file:text-stone-600 file:text-xs file:font-medium"
                                />
                                {/* Show newly selected files */}
                                {attachmentFiles.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {attachmentFiles.map((file, i) => (
                                            <div key={i} className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
                                                {getFileIcon(file.type)}
                                                <span className="text-blue-700">{file.name}</span>
                                                <span className="text-blue-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                                <button
                                                    onClick={() => setAttachmentFiles(attachmentFiles.filter((_, idx) => idx !== i))}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => { resetForm(); setSelectedAssignment(null); setView('list'); }} className="flex-1 py-2 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">{language === 'tr' ? 'İptal' : 'Cancel'}</button>
                            <button onClick={view === 'edit' ? handleEdit : handleCreate} disabled={isCreating || !title.trim() || !dueDate} className="flex-1 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isCreating ? <Loader2 className="animate-spin" size={14} /> : view === 'edit' ? <Check size={14} /> : <Plus size={14} />}
                                {view === 'edit' ? (language === 'tr' ? 'Kaydet' : 'Save') : (language === 'tr' ? 'Oluştur' : 'Create')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Detail View */}
                {view === 'detail' && selectedAssignment && (
                    <div className="space-y-6 pb-20">
                        {/* Header with Title and Pink Icon */}
                        <div className="flex items-center gap-4 mb-2">
                            <button onClick={() => { cleanupUnsubmittedFiles(); setSelectedAssignment(null); setView('list'); }} className="p-2 hover:bg-white rounded-lg transition-colors text-stone-600">
                                <ArrowLeft size={20} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-pink-50 rounded-lg">
                                    <FileStack size={24} className="text-pink-500" />
                                </div>
                                <h1 className="text-2xl font-bold text-stone-800 tracking-tight">{selectedAssignment.title}</h1>
                            </div>

                            {isTeacher && (
                                <div className="ml-auto flex gap-2">
                                    <button onClick={() => openEditMode(selectedAssignment)} className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => setView('submissions')} className="flex items-center gap-2 px-3 py-2 bg-stone-100 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors">
                                        <Users size={16} /> {submissions.length}
                                    </button>
                                    <button onClick={() => { if (confirm(language === 'tr' ? 'Bu ödevi silmek istediğinizden emin misiniz?' : 'Delete this assignment?')) { deleteAssignment(selectedAssignment.id); setSelectedAssignment(null); setView('list'); } }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Assignment Details Box */}
                        <div className={cn(
                            "bg-[#f8f9fa] rounded-xl border border-stone-200 overflow-hidden transition-all duration-500",
                            highlightedAssignmentId === selectedAssignment.id && "ring-4 ring-indigo-400 ring-opacity-50 animate-pulse border-indigo-300 bg-indigo-50/30"
                        )}>
                            <div className="p-5 space-y-4">
                                <div className="space-y-1">
                                    <div className="flex gap-2 text-sm text-stone-600">
                                        <span className="font-bold text-stone-800">{language === 'tr' ? 'Açıldı:' : 'Opened:'}</span>
                                        <span>{formatFullDate(selectedAssignment.createdAt)}</span>
                                    </div>
                                    <div className="flex gap-2 text-sm text-stone-600">
                                        <span className="font-bold text-stone-800">{language === 'tr' ? 'Son tarih:' : 'Due date:'}</span>
                                        <span>{formatFullDate(selectedAssignment.dueDate)}</span>
                                    </div>
                                </div>

                                <div className="border-t border-stone-200 pt-4">
                                    <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                                        {selectedAssignment.description}
                                    </p>
                                </div>

                                {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                                    <div className="space-y-2 mt-4 pt-2 border-t border-stone-200/60">
                                        {selectedAssignment.attachments.map((att, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="text-stone-400">
                                                    {getFileIcon(att.type)}
                                                </div>
                                                <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#c02428] hover:underline font-medium">
                                                    {att.name}
                                                </a>
                                                <span className="text-xs text-stone-400 ml-auto">
                                                    {formatFullDate(selectedAssignment.createdAt)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons for Students */}
                        {!isTeacher && selectedAssignment.assignmentType !== 'reminder' && !mySubmission && (
                            <div className="flex justify-center sm:justify-start">
                                <button
                                    onClick={() => {
                                        // Scroll to submission form or handle visibility
                                        const form = document.getElementById('submission-form');
                                        if (form) form.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="px-6 py-2 bg-[#c02428] text-white font-bold rounded hover:bg-[#a61f22] transition-colors shadow-sm"
                                >
                                    {language === 'tr' ? 'Gönderim ekle' : 'Add submission'}
                                </button>
                            </div>
                        )}

                        {/* Submission Status Section */}
                        {!isTeacher && selectedAssignment.assignmentType !== 'reminder' && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold text-stone-800">{language === 'tr' ? 'Gönderim durumu' : 'Submission status'}</h3>

                                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                                    <div className="divide-y divide-stone-100">
                                        {/* Row: Status */}
                                        <div className="grid grid-cols-[180px,1fr] group">
                                            <div className="bg-[#f8f9fa] p-4 text-sm text-stone-500 font-medium">
                                                {language === 'tr' ? 'Gönderim durumu' : 'Submission status'}
                                            </div>
                                            <div className="p-4 text-sm text-stone-700">
                                                {mySubmission ? (
                                                    <span className="flex items-center gap-2">
                                                        {language === 'tr' ? 'Ödev gönderildi' : 'Submitted for grading'}
                                                        {mySubmission.isLate && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">{language === 'tr' ? 'Geç' : 'Late'}</span>}
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-400">{language === 'tr' ? 'Henüz herhangi ödev göndermediniz' : 'No attempt has been made'}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row: Grade Status */}
                                        <div className="grid grid-cols-[180px,1fr] group">
                                            <div className="bg-[#f8f9fa] p-4 text-sm text-stone-500 font-medium">
                                                {language === 'tr' ? 'Puan durumu' : 'Grading status'}
                                            </div>
                                            <div className="p-4 text-sm text-stone-700 font-bold">
                                                {mySubmission?.grade !== undefined ? (
                                                    <span className="text-emerald-600">{language === 'tr' ? `Puanlandı: ${mySubmission.grade} / ${selectedAssignment.maxPoints || 100}` : `Graded: ${mySubmission.grade} / ${selectedAssignment.maxPoints || 100}`}</span>
                                                ) : (
                                                    <span className="text-stone-800">{language === 'tr' ? 'Puanlanmamış' : 'Not graded'}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row: Time Remaining */}
                                        <div className="grid grid-cols-[180px,1fr] group">
                                            <div className="bg-[#f8f9fa] p-4 text-sm text-stone-500 font-medium">
                                                {language === 'tr' ? 'Kalan süre' : 'Time remaining'}
                                            </div>
                                            <div className="p-4 text-sm text-stone-700">
                                                {getTimeRemaining(selectedAssignment.dueDate)}
                                            </div>
                                        </div>

                                        {/* Row: Last Modified */}
                                        <div className="grid grid-cols-[180px,1fr] group">
                                            <div className="bg-[#f8f9fa] p-4 text-sm text-stone-500 font-medium">
                                                {language === 'tr' ? 'Son düzenleme' : 'Last modified'}
                                            </div>
                                            <div className="p-4 text-sm text-stone-700">
                                                {mySubmission?.updatedAt ? formatFullDate(mySubmission.updatedAt) : mySubmission?.submittedAt ? formatFullDate(mySubmission.submittedAt) : '-'}
                                            </div>
                                        </div>

                                        {/* Row: Comments */}
                                        <div className="grid grid-cols-[180px,1fr] group">
                                            <div className="bg-[#f8f9fa] p-4 text-sm text-stone-500 font-medium">
                                                {language === 'tr' ? 'Gönderim yorumları' : 'Submission comments'}
                                            </div>
                                            <div className="p-4">
                                                <button className="flex items-center gap-2 text-sm font-medium text-[#c02428] hover:underline group/comments">
                                                    <ChevronRight size={18} className="text-black group-hover/comments:rotate-90 transition-transform" />
                                                    {language === 'tr' ? 'Yorumlar (0)' : 'Comments (0)'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Show submitted content and files */}
                                {mySubmission && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <CheckCircle size={20} className="text-blue-600" />
                                            <h4 className="font-bold text-blue-900">{language === 'tr' ? 'Gönderdiğiniz Teslim' : 'Your Submission'}</h4>
                                            <span className="ml-auto text-xs text-blue-600">{formatDate(mySubmission.submittedAt)}</span>
                                        </div>

                                        {/* Submitted Text Content */}
                                        {mySubmission.content && (
                                            <div className="bg-white/60 rounded-lg p-4 mb-4 text-sm text-stone-700 whitespace-pre-wrap border border-blue-100">
                                                {mySubmission.content}
                                            </div>
                                        )}

                                        {/* Submitted Files */}
                                        {mySubmission.attachments && mySubmission.attachments.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">{language === 'tr' ? 'Gönderilen Dosyalar' : 'Submitted Files'}</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {mySubmission.attachments.map((att, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-colors">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="text-blue-500 shrink-0">{getFileIcon(att.type)}</div>
                                                                <span className="text-sm text-stone-700 truncate font-medium">{att.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {canPreview(att.type) && (
                                                                    <button
                                                                        onClick={() => setPreviewFile(att)}
                                                                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                                                        title={language === 'tr' ? 'Önizle' : 'Preview'}
                                                                    >
                                                                        <Eye size={16} />
                                                                    </button>
                                                                )}
                                                                <a
                                                                    href={att.url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                                                    title={language === 'tr' ? 'İndir' : 'Download'}
                                                                >
                                                                    <Download size={16} />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Submission Form (Visible only if not graded or allow edit) */}
                                {(!mySubmission || (!mySubmission.grade && (!isOverdue(selectedAssignment.dueDate) || selectedAssignment.allowLateSubmission))) && (
                                    <div id="submission-form" className="bg-white rounded-xl border border-stone-200 p-6 mt-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-1 h-6 bg-[#c02428] rounded-full" />
                                            <h3 className="font-bold text-stone-800">{mySubmission ? (language === 'tr' ? 'Teslimi Düzenle' : 'Edit Submission') : (language === 'tr' ? 'Yeni Teslim' : 'New Submission')}</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <textarea
                                                value={submitContent}
                                                onChange={e => setSubmitContent(e.target.value)}
                                                rows={4}
                                                className="w-full px-4 py-3 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-300 focus:outline-none resize-none bg-white shadow-inner"
                                                placeholder={language === 'tr' ? 'Yanıtınızı buraya yazın...' : 'Type your answer here...'}
                                            />

                                            {/* Existing/Uploaded Files */}
                                            {(existingSubmissionAttachments.length > 0 || uploadedSubmitAttachments.length > 0) && (
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{language === 'tr' ? 'Ekli Dosyalar' : 'Attached Files'}</label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {[...existingSubmissionAttachments, ...uploadedSubmitAttachments].map((att, i) => (
                                                            <div key={i} className="flex items-center justify-between p-2 bg-stone-50 border border-stone-200 rounded-lg">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="text-stone-400 shrink-0">{getFileIcon(att.type)}</div>
                                                                    <span className="text-xs text-stone-600 truncate">{att.name}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        if (i < existingSubmissionAttachments.length) {
                                                                            setExistingSubmissionAttachments(prev => prev.filter((_, idx) => idx !== i));
                                                                        } else {
                                                                            removeUploadedSubmitAttachment(i - existingSubmissionAttachments.length);
                                                                        }
                                                                    }}
                                                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <div className="flex-1">
                                                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-stone-200 rounded-xl hover:border-stone-400 hover:bg-stone-50 transition-all cursor-pointer group">
                                                        <div className="flex flex-col items-center justify-center pt-2">
                                                            {isUploadingSubmitFile ? <Loader2 className="animate-spin text-stone-400" /> : <Paperclip size={20} className="text-stone-400 group-hover:text-stone-600" />}
                                                            <p className="mt-1 text-xs text-stone-500 font-medium">{language === 'tr' ? 'Dosya seç' : 'Choose file'}</p>
                                                        </div>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            onChange={e => handleSubmitFileSelect(e.target.files)}
                                                            className="hidden"
                                                            disabled={isUploadingSubmitFile}
                                                        />
                                                    </label>
                                                </div>

                                                <button
                                                    onClick={mySubmission ? handleUpdateSubmission : handleSubmit}
                                                    disabled={isSubmitting || isUploadingSubmitFile || (!submitContent.trim() && !uploadedSubmitAttachments.length && !existingSubmissionAttachments.length)}
                                                    className="sm:w-40 h-24 bg-stone-800 text-white rounded-xl font-bold hover:bg-stone-700 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
                                                >
                                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                                                    <span>{mySubmission ? (language === 'tr' ? 'Güncelle' : 'Update') : (language === 'tr' ? 'Teslim Et' : 'Submit')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Grading Feedback (Read Only for Students) */}
                                {mySubmission?.grade !== undefined && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 mt-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-emerald-100 rounded-lg">
                                                <Award size={20} className="text-emerald-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-emerald-900">{language === 'tr' ? 'Değerlendirme Sonucu' : 'Grading Feedback'}</h4>
                                                <p className="text-xs text-emerald-600 font-medium">{mySubmission.gradedAt ? formatDate(mySubmission.gradedAt) : ''}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-[1fr,200px] gap-6">
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{language === 'tr' ? 'Öğretmen Yorumu' : 'Teacher Feedback'}</p>
                                                <div className="bg-white/60 rounded-lg p-4 text-sm text-stone-700 leading-relaxed italic">
                                                    "{mySubmission.feedback || (language === 'tr' ? 'Geribildirim bırakılmadı.' : 'No feedback left.')}"
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-emerald-100 shadow-inner">
                                                <span className="text-xs font-bold text-stone-400 uppercase mb-1">{language === 'tr' ? 'Alınan Puan' : 'Score'}</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-4xl font-black text-emerald-600">{mySubmission.grade}</span>
                                                    <span className="text-stone-300 text-lg">/</span>
                                                    <span className="text-stone-400 font-bold">{selectedAssignment.maxPoints || 100}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Submissions View (Teacher) */}
                {view === 'submissions' && selectedAssignment && isTeacher && (
                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-stone-100 gap-3">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setView('detail')} className="p-2 hover:bg-white rounded-lg transition-colors border border-stone-200 shadow-sm"><ArrowLeft size={18} /></button>
                                <div>
                                    <h2 className="font-bold text-stone-800 text-base sm:text-lg">{language === 'tr' ? 'Teslim Edilenler' : 'Submissions'}</h2>
                                    <p className="text-xs text-stone-500">{submissions.length} {language === 'tr' ? 'teslim' : 'submitted'} • {selectedAssignment.maxPoints || 100} {language === 'tr' ? 'puan' : 'pts'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 ml-auto sm:ml-0">
                                <button
                                    onClick={handlePlagiarismCheck}
                                    disabled={checkingPlagiarism || submissions.length < 2}
                                    className="flex items-center gap-1.5 px-2 sm:px-3 py-2 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:bg-white disabled:opacity-50 shadow-sm transition-colors"
                                >
                                    {checkingPlagiarism ? <Loader2 className="animate-spin" size={14} /> : <Shield size={14} />}
                                    <span className="hidden sm:inline">
                                        {checkingPlagiarism && plagiarismProgress
                                            ? `${plagiarismProgress.current}/${plagiarismProgress.total}`
                                            : (language === 'tr' ? 'İntihal' : 'Plagiarism')}
                                    </span>
                                </button>
                                <button
                                    onClick={handleExportSubmissions}
                                    className="flex items-center gap-1.5 px-2 sm:px-3 py-2 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:bg-white shadow-sm transition-colors"
                                >
                                    <FileDown size={14} />
                                    <span className="hidden sm:inline">CSV</span>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-3 sm:p-5">
                            {submissions.length === 0 ? (
                                <div className="text-center py-12 sm:py-16 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                                    <Users className="mx-auto mb-3 text-stone-300" size={40} />
                                    <p className="text-stone-500 font-medium text-sm">{language === 'tr' ? 'Henüz teslim yok' : 'No submissions yet'}</p>
                                    <p className="text-xs text-stone-400 mt-1">{language === 'tr' ? 'Öğrenciler ödevlerini teslim ettiğinde burada görünecek' : 'Submissions will appear here'}</p>
                                </div>
                            ) : (
                                <>
                                    {/* Mobile: Card Layout */}
                                    <div className="sm:hidden space-y-3">
                                        {submissions.map(sub => (
                                            <div key={sub.id} className="border border-stone-200 rounded-xl p-4 bg-white shadow-sm">
                                                {/* Student Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-bold text-stone-600">
                                                            {sub.studentName[0]?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-stone-800 text-sm">{sub.studentName}</p>
                                                            <p className="text-[10px] text-stone-500">{formatDate(sub.submittedAt)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {sub.isLate ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-bold">
                                                                <Clock size={10} /> {language === 'tr' ? 'GEÇ' : 'LATE'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
                                                                <CheckCircle size={10} /> {language === 'tr' ? 'OK' : 'OK'}
                                                            </span>
                                                        )}
                                                        {sub.grade !== undefined && (
                                                            <span className="text-sm font-bold text-emerald-600">{sub.grade}/{selectedAssignment.maxPoints || 100}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                {sub.content && (
                                                    <p className="text-sm text-stone-600 line-clamp-2 mb-2 bg-stone-50 p-2 rounded-lg">{sub.content}</p>
                                                )}

                                                {/* Attachments */}
                                                {sub.attachments && sub.attachments.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                                        {sub.attachments.map((att, i) => (
                                                            <div key={i} className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                                                                {getFileIcon(att.type)}
                                                                <span className="text-blue-700 font-medium truncate max-w-[80px]">{att.name}</span>
                                                                <a href={att.url} target="_blank" rel="noreferrer" className="p-0.5 text-blue-500">
                                                                    <Download size={12} />
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Grading Section */}
                                                {selectedSubmission?.id === sub.id ? (
                                                    <div className="pt-3 border-t border-stone-100 space-y-2">
                                                        <div className="flex gap-2">
                                                            <div className="relative flex-1">
                                                                <input type="number" value={feedbackGrade} onChange={e => setFeedbackGrade(e.target.value)} max={selectedAssignment.maxPoints || 100} placeholder="0" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm pr-10" />
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">/{selectedAssignment.maxPoints || 100}</span>
                                                            </div>
                                                        </div>
                                                        <input type="text" value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder={language === 'tr' ? 'Yorum...' : 'Feedback...'} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm" />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setSelectedSubmission(null)} className="flex-1 px-3 py-2 text-xs text-stone-600 border border-stone-200 rounded-lg font-medium">{language === 'tr' ? 'İptal' : 'Cancel'}</button>
                                                            <button onClick={handleGrade} disabled={isGrading} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1">
                                                                {isGrading ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle size={12} />}
                                                                {language === 'tr' ? 'Kaydet' : 'Save'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => { setSelectedSubmission(sub); setFeedbackGrade(sub.grade?.toString() || ''); setFeedbackText(sub.feedback || ''); }}
                                                        className={cn(
                                                            "w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                                            sub.grade !== undefined
                                                                ? "text-stone-600 bg-stone-100 hover:bg-stone-200"
                                                                : "bg-stone-800 text-white hover:bg-stone-700"
                                                        )}
                                                    >
                                                        {sub.grade !== undefined ? (
                                                            <><Edit2 size={14} /> {language === 'tr' ? 'Düzenle' : 'Edit'}</>
                                                        ) : (
                                                            <><Award size={14} /> {language === 'tr' ? 'Puanla' : 'Grade'}</>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Desktop: Table Layout */}
                                    <div className="hidden sm:block overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-stone-200 bg-stone-50">
                                                    <th className="text-left py-3 px-4 font-semibold text-stone-600 text-sm">{language === 'tr' ? 'Öğrenci' : 'Student'}</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-stone-600 text-sm">{language === 'tr' ? 'Teslim' : 'Submission'}</th>
                                                    <th className="text-center py-3 px-4 font-semibold text-stone-600 text-sm">{language === 'tr' ? 'Durum' : 'Status'}</th>
                                                    <th className="text-center py-3 px-4 font-semibold text-stone-600 text-sm">{language === 'tr' ? 'Puan' : 'Grade'}</th>
                                                    <th className="text-right py-3 px-4 font-semibold text-stone-600 text-sm">{language === 'tr' ? 'İşlemler' : 'Actions'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {submissions.map((sub, idx) => (
                                                    <tr key={sub.id} className={cn("border-b border-stone-100 hover:bg-stone-50/50 transition-colors", idx % 2 === 0 && "bg-white", idx % 2 !== 0 && "bg-stone-50/30")}>
                                                        {/* Student */}
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-sm font-bold text-stone-600 shrink-0">
                                                                    {sub.studentName[0]?.toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-stone-800">{sub.studentName}</p>
                                                                    <p className="text-xs text-stone-500">{formatDate(sub.submittedAt)}</p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Submission Content */}
                                                        <td className="py-4 px-4 max-w-md">
                                                            {sub.content && (
                                                                <p className="text-sm text-stone-600 line-clamp-2 mb-2">{sub.content}</p>
                                                            )}
                                                            {sub.attachments && sub.attachments.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {sub.attachments.map((att, i) => (
                                                                        <div key={i} className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                                                                            {getFileIcon(att.type)}
                                                                            <span className="text-blue-700 font-medium truncate max-w-[100px]">{att.name}</span>
                                                                            {canPreview(att.type) && (
                                                                                <button onClick={() => setPreviewFile(att)} className="p-0.5 hover:bg-blue-100 rounded text-blue-500">
                                                                                    <Eye size={12} />
                                                                                </button>
                                                                            )}
                                                                            <a href={att.url} target="_blank" rel="noreferrer" className="p-0.5 hover:bg-blue-100 rounded text-blue-500">
                                                                                <Download size={12} />
                                                                            </a>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {!sub.content && (!sub.attachments || sub.attachments.length === 0) && (
                                                                <span className="text-xs text-stone-400 italic">{language === 'tr' ? 'İçerik yok' : 'No content'}</span>
                                                            )}
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-4 px-4 text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                {sub.isLate ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold">
                                                                        <Clock size={10} />
                                                                        {language === 'tr' ? 'GEÇ' : 'LATE'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
                                                                        <CheckCircle size={10} />
                                                                        {language === 'tr' ? 'ZAMANINDA' : 'ON TIME'}
                                                                    </span>
                                                                )}
                                                                {/* Plagiarism Badge */}
                                                                {sub.plagiarismResult ? (
                                                                    <button
                                                                        onClick={() => handleSinglePlagiarismCheck(sub)}
                                                                        className={cn(
                                                                            "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80",
                                                                            getRiskLevelStyle(sub.plagiarismResult.riskLevel).bgColor,
                                                                            getRiskLevelStyle(sub.plagiarismResult.riskLevel).color
                                                                        )}
                                                                    >
                                                                        <Shield size={10} />
                                                                        {sub.plagiarismResult.overallScore}%
                                                                    </button>
                                                                ) : sub.content && sub.content.length > 50 ? (
                                                                    <button
                                                                        onClick={() => handleSinglePlagiarismCheck(sub)}
                                                                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
                                                                        title={language === 'tr' ? 'İntihal kontrolü yap' : 'Check plagiarism'}
                                                                    >
                                                                        <Shield size={10} />
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                        </td>

                                                        {/* Grade */}
                                                        <td className="py-4 px-4 text-center">
                                                            {sub.grade !== undefined ? (
                                                                <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                                                                    <Star size={14} className="text-emerald-500" />
                                                                    <span className="text-lg font-bold text-emerald-600">{sub.grade}</span>
                                                                    <span className="text-stone-400 text-sm">/{selectedAssignment.maxPoints || 100}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-stone-400 font-medium">{language === 'tr' ? 'Puansız' : 'Not graded'}</span>
                                                            )}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="py-4 px-4">
                                                            <div className="flex justify-end">
                                                                {selectedSubmission?.id === sub.id ? (
                                                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                                                        <div className="flex gap-2">
                                                                            <div className="relative flex-1">
                                                                                <input type="number" value={feedbackGrade} onChange={e => setFeedbackGrade(e.target.value)} max={selectedAssignment.maxPoints || 100} placeholder="0" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm pr-12" />
                                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">/ {selectedAssignment.maxPoints || 100}</span>
                                                                            </div>
                                                                        </div>
                                                                        <input type="text" value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder={language === 'tr' ? 'Yorum ekle...' : 'Add feedback...'} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm" />
                                                                        <div className="flex gap-2">
                                                                            <button onClick={() => setSelectedSubmission(null)} className="flex-1 px-3 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-lg border border-stone-200 font-medium">{language === 'tr' ? 'İptal' : 'Cancel'}</button>
                                                                            <button onClick={handleGrade} disabled={isGrading} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1">
                                                                                {isGrading ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle size={12} />}
                                                                                {language === 'tr' ? 'Kaydet' : 'Save'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => { setSelectedSubmission(sub); setFeedbackGrade(sub.grade?.toString() || ''); setFeedbackText(sub.feedback || ''); }}
                                                                        className={cn(
                                                                            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                                                            sub.grade !== undefined
                                                                                ? "text-stone-600 hover:bg-stone-100 border border-stone-200"
                                                                                : "bg-stone-800 text-white hover:bg-stone-700"
                                                                        )}
                                                                    >
                                                                        {sub.grade !== undefined ? (
                                                                            <><Edit2 size={14} /> {language === 'tr' ? 'Düzenle' : 'Edit'}</>
                                                                        ) : (
                                                                            <><Award size={14} /> {language === 'tr' ? 'Puanla' : 'Grade'}</>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Progress View (Teacher Only) */}
                {view === 'progress' && isTeacher && (
                    <div className="bg-white rounded-xl border border-stone-200 p-5">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setView('list')} className="p-1.5 hover:bg-stone-100 rounded-lg"><ArrowLeft size={18} /></button>
                                <div>
                                    <h2 className="font-semibold text-stone-800">{language === 'tr' ? 'Öğrenci İlerleme Raporu' : 'Student Progress Report'}</h2>
                                    <p className="text-xs text-stone-500">{studentsProgress.length} {language === 'tr' ? 'öğrenci' : 'students'}</p>
                                </div>
                            </div>
                            <button onClick={handleExportProgress} className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50">
                                <FileDown size={14} />
                                Excel (CSV)
                            </button>
                        </div>

                        {loadingProgress ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="animate-spin text-stone-400" size={24} />
                            </div>
                        ) : studentsProgress.length === 0 ? (
                            <div className="text-center py-16">
                                <Users className="mx-auto mb-3 text-stone-300" size={40} />
                                <p className="text-stone-500 text-sm">{language === 'tr' ? 'Henüz veri yok' : 'No data yet'}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-stone-200">
                                            <th className="text-left py-2 px-2 font-medium text-stone-600">{language === 'tr' ? 'Öğrenci' : 'Student'}</th>
                                            <th className="text-center py-2 px-2 font-medium text-stone-600">{language === 'tr' ? 'Teslim' : 'Submitted'}</th>
                                            <th className="text-center py-2 px-2 font-medium text-stone-600">{language === 'tr' ? 'Notlu' : 'Graded'}</th>
                                            <th className="text-center py-2 px-2 font-medium text-stone-600">{language === 'tr' ? 'Geç' : 'Late'}</th>
                                            <th className="text-center py-2 px-2 font-medium text-stone-600">{language === 'tr' ? 'Ortalama' : 'Avg'}</th>
                                            <th className="text-center py-2 px-2 font-medium text-stone-600">{language === 'tr' ? 'İlerleme' : 'Progress'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentsProgress.map((p, idx) => {
                                            const completionRate = p.totalAssignments > 0 ? Math.round((p.submittedCount / p.totalAssignments) * 100) : 0;
                                            return (
                                                <tr key={p.studentId} className={cn("border-b border-stone-100", idx % 2 === 0 && "bg-stone-50/50")}>
                                                    <td className="py-2 px-2">
                                                        <div className="flex items-center gap-2">
                                                            {p.studentPhotoURL ? (
                                                                <img src={p.studentPhotoURL} alt="" className="w-7 h-7 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600">
                                                                    {p.studentName[0]}
                                                                </div>
                                                            )}
                                                            <span className="font-medium text-stone-800">{p.studentName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <span className="text-stone-600">{p.submittedCount}</span>
                                                        <span className="text-stone-400">/{p.totalAssignments}</span>
                                                    </td>
                                                    <td className="py-2 px-2 text-center text-stone-600">{p.gradedCount}</td>
                                                    <td className="py-2 px-2 text-center">
                                                        {p.lateCount > 0 ? (
                                                            <span className="text-amber-600">{p.lateCount}</span>
                                                        ) : (
                                                            <span className="text-stone-400">0</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <span className={cn("font-semibold", p.averageGrade >= 70 ? "text-emerald-600" : p.averageGrade >= 50 ? "text-amber-600" : "text-red-500")}>
                                                            {p.averageGrade || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn("h-full rounded-full", completionRate >= 80 ? "bg-emerald-500" : completionRate >= 50 ? "bg-amber-500" : "bg-red-400")}
                                                                    style={{ width: `${completionRate}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-stone-500 w-8">{completionRate}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* File Preview Modal */}
                {previewFile && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPreviewFile(null)}>
                        <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto w-full" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-4 border-b border-stone-200">
                                <span className="font-medium text-stone-800">{previewFile.name}</span>
                                <button onClick={() => setPreviewFile(null)} className="p-1 hover:bg-stone-100 rounded">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-4">
                                {previewFile.type?.startsWith('image/') ? (
                                    <img src={previewFile.url} alt={previewFile.name} className="max-w-full mx-auto" />
                                ) : previewFile.type?.includes('pdf') ? (
                                    <iframe src={previewFile.url} className="w-full h-[70vh]" />
                                ) : (
                                    <div className="text-center py-8">
                                        <FileText size={48} className="mx-auto mb-3 text-stone-300" />
                                        <p className="text-sm text-stone-500 mb-3">{language === 'tr' ? 'Bu dosya önizlenemiyor' : 'Cannot preview this file'}</p>
                                        <a href={previewFile.url} target="_blank" className="text-blue-500 text-sm hover:underline">
                                            {language === 'tr' ? 'İndir' : 'Download'}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Gelişmiş İntihal Analiz Modal */}
                {showPlagiarismModal && selectedPlagiarismResult && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setShowPlagiarismModal(false); setSelectedPlagiarismResult(null); }}>
                        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-5 border-b border-stone-200 bg-gradient-to-r from-stone-50 to-stone-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-stone-800 rounded-xl flex items-center justify-center">
                                        <Shield size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-800">{language === 'tr' ? 'İntihal Analizi' : 'Plagiarism Analysis'}</h3>
                                        <p className="text-xs text-stone-500">{selectedPlagiarismResult.submission.studentName}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setShowPlagiarismModal(false); setSelectedPlagiarismResult(null); }} className="p-2 hover:bg-stone-200 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                                {!selectedPlagiarismResult.result ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <Loader2 className="w-10 h-10 animate-spin text-stone-400 mb-4" />
                                        <p className="text-sm text-stone-500">{language === 'tr' ? 'Analiz yapılıyor...' : 'Analyzing...'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Risk Level Banner */}
                                        <div className={cn(
                                            "p-4 rounded-xl border-2 flex items-center gap-4",
                                            getRiskLevelStyle(selectedPlagiarismResult.result.riskLevel).bgColor,
                                            getRiskLevelStyle(selectedPlagiarismResult.result.riskLevel).borderColor
                                        )}>
                                            <div className="text-4xl">{getRiskLevelStyle(selectedPlagiarismResult.result.riskLevel).icon}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-3xl font-bold", getRiskLevelStyle(selectedPlagiarismResult.result.riskLevel).color)}>
                                                        {selectedPlagiarismResult.result.overallScore}%
                                                    </span>
                                                    <span className={cn("text-sm font-medium px-2 py-0.5 rounded", getRiskLevelStyle(selectedPlagiarismResult.result.riskLevel).bgColor, getRiskLevelStyle(selectedPlagiarismResult.result.riskLevel).color)}>
                                                        {getRiskLevelStyle(selectedPlagiarismResult.result.riskLevel).label[language as 'tr' | 'en'] || getRiskLevelStyle(selectedPlagiarismResult.result.riskLevel).label.tr}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-stone-600 mt-1">
                                                    {language === 'tr' ? 'Genel benzerlik skoru' : 'Overall similarity score'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Detailed Scores Grid */}
                                        <div>
                                            <h4 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
                                                <BarChart3 size={16} />
                                                {language === 'tr' ? 'Detaylı Analiz Skorları' : 'Detailed Analysis Scores'}
                                            </h4>
                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                {[
                                                    { label: 'N-Gram', value: selectedPlagiarismResult.result.ngramScore, color: 'blue' },
                                                    { label: 'Cosine', value: selectedPlagiarismResult.result.cosineScore, color: 'purple' },
                                                    { label: 'LCS', value: selectedPlagiarismResult.result.lcsScore, color: 'emerald' },
                                                    { label: 'Jaccard', value: selectedPlagiarismResult.result.jaccardScore, color: 'amber' },
                                                    { label: language === 'tr' ? 'Cümle' : 'Sentence', value: selectedPlagiarismResult.result.sentenceScore, color: 'rose' },
                                                    { label: language === 'tr' ? 'Kelime' : 'Word Freq', value: selectedPlagiarismResult.result.wordFrequencyScore, color: 'indigo' },
                                                ].map((item, i) => (
                                                    <div key={i} className="bg-stone-50 rounded-lg p-3 text-center border border-stone-100">
                                                        <div className={cn("text-xl font-bold", `text-${item.color}-600`)}>{item.value}%</div>
                                                        <div className="text-[10px] text-stone-500 font-medium mt-1">{item.label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Similar Submissions */}
                                        {selectedPlagiarismResult.result.similarSubmissions.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
                                                    <Users size={16} />
                                                    {language === 'tr' ? 'Benzer Teslimler' : 'Similar Submissions'}
                                                    <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                                                        {selectedPlagiarismResult.result.similarSubmissions.length}
                                                    </span>
                                                </h4>
                                                <div className="space-y-2">
                                                    {selectedPlagiarismResult.result.similarSubmissions.slice(0, 5).map((sim, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center text-xs font-bold text-stone-600">
                                                                    {sim.studentName.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-stone-800 text-sm">{sim.studentName}</p>
                                                                    <p className="text-[10px] text-stone-500">
                                                                        {sim.matchCount} {language === 'tr' ? 'eşleşme' : 'matches'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className={cn(
                                                                "text-sm font-bold px-3 py-1 rounded-lg",
                                                                sim.similarity > 70 ? "bg-red-100 text-red-600" :
                                                                    sim.similarity > 50 ? "bg-orange-100 text-orange-600" :
                                                                        sim.similarity > 30 ? "bg-amber-100 text-amber-600" :
                                                                            "bg-green-100 text-green-600"
                                                            )}>
                                                                {sim.similarity}%
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Common Phrases */}
                                                {selectedPlagiarismResult.result.similarSubmissions[0]?.matchedPhrases?.length > 0 && (
                                                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                                        <p className="text-xs font-medium text-amber-700 mb-2">
                                                            {language === 'tr' ? 'Eşleşen İfadeler:' : 'Matched Phrases:'}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {selectedPlagiarismResult.result.similarSubmissions[0].matchedPhrases.map((phrase, i) => (
                                                                <span key={i} className="text-xs bg-white px-2 py-1 rounded border border-amber-200 text-amber-800">
                                                                    "{phrase}"
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Text Analysis Details */}
                                        <div>
                                            <h4 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
                                                <FileText size={16} />
                                                {language === 'tr' ? 'Metin Analizi' : 'Text Analysis'}
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                                                    <div className="text-lg font-bold text-stone-700">{selectedPlagiarismResult.result.analysisDetails.totalWords}</div>
                                                    <div className="text-[10px] text-stone-500">{language === 'tr' ? 'Toplam Kelime' : 'Total Words'}</div>
                                                </div>
                                                <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                                                    <div className="text-lg font-bold text-stone-700">{selectedPlagiarismResult.result.analysisDetails.uniqueWords}</div>
                                                    <div className="text-[10px] text-stone-500">{language === 'tr' ? 'Benzersiz Kelime' : 'Unique Words'}</div>
                                                </div>
                                                <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                                                    <div className="text-lg font-bold text-stone-700">{selectedPlagiarismResult.result.analysisDetails.totalSentences}</div>
                                                    <div className="text-[10px] text-stone-500">{language === 'tr' ? 'Cümle Sayısı' : 'Sentences'}</div>
                                                </div>
                                                <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                                                    <div className="text-lg font-bold text-stone-700">{selectedPlagiarismResult.result.analysisDetails.vocabularyRichness}%</div>
                                                    <div className="text-[10px] text-stone-500">{language === 'tr' ? 'Kelime Zenginliği' : 'Vocabulary Richness'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Suspicious Patterns */}
                                        {selectedPlagiarismResult.result.analysisDetails.suspiciousPatterns.length > 0 && (
                                            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                                                    <AlertCircle size={16} />
                                                    {language === 'tr' ? 'Şüpheli Kalıplar' : 'Suspicious Patterns'}
                                                </h4>
                                                <ul className="space-y-1">
                                                    {selectedPlagiarismResult.result.analysisDetails.suspiciousPatterns.map((pattern, i) => (
                                                        <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                                                            <span className="text-red-400 mt-0.5">•</span>
                                                            {pattern}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* No Plagiarism Found Message */}
                                        {selectedPlagiarismResult.result.overallScore === 0 && (
                                            <div className="p-6 bg-green-50 rounded-xl border border-green-200 text-center">
                                                <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
                                                <h4 className="font-semibold text-green-700 mb-1">
                                                    {language === 'tr' ? 'İntihal Tespit Edilmedi!' : 'No Plagiarism Detected!'}
                                                </h4>
                                                <p className="text-sm text-green-600">
                                                    {language === 'tr'
                                                        ? 'Bu teslim diğer teslimlerden önemli ölçüde farklıdır.'
                                                        : 'This submission is significantly different from other submissions.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-2">
                                <button
                                    onClick={() => { setShowPlagiarismModal(false); setSelectedPlagiarismResult(null); }}
                                    className="px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors"
                                >
                                    {language === 'tr' ? 'Kapat' : 'Close'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
