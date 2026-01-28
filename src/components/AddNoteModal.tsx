import { useState, useRef, useEffect } from 'react';
import { X, Type, Link as LinkIcon, FileText, BarChart, Mic, Square, Play, Trash2, File as FileIcon, Loader2, Globe, Upload, ChevronDown, Check, Video, Camera, StopCircle, RotateCcw } from 'lucide-react';
import { NOTE_COLORS, Section } from '@/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { uploadToSupabase, uploadMultipleToSupabase } from '@/lib/supabase';
import { RichTextEditor } from './RichTextEditor';

interface AddNoteModalProps {
    onClose: () => void;
    onSubmit: (data: {
        content: string;
        type: 'text' | 'image' | 'link' | 'file' | 'poll' | 'audio' | 'video';
        color: string;
        imageUrl?: string;
        linkUrl?: string;
        linkTitle?: string;
        linkDescription?: string;
        linkDomain?: string;
        pollOptions?: string[];
        audioUrl?: string;
        audioDuration?: number;
        // Video desteği
        videoUrl?: string;
        videoDuration?: number;
        // Çoklu dosya desteği
        files?: { url: string; name: string; type?: string }[];
        sectionId?: string; // Seçilen bölüm ID'si
    }) => void;
    sections?: Section[]; // Bölüm seçimi için opsiyonel
    defaultSectionId?: string | null;
    initialFiles?: File[]; // Sürükle-bırak ile gelen dosyalar
}

export function AddNoteModal({ onClose, onSubmit, sections, defaultSectionId, initialFiles }: AddNoteModalProps) {
    const { t, language } = useTranslation();
    const [type, setType] = useState<'text' | 'image' | 'link' | 'file' | 'poll' | 'audio' | 'video'>('text');
    const [content, setContent] = useState('');
    const [color, setColor] = useState(NOTE_COLORS[0]);
    const [imageUrl, setImageUrl] = useState('');

    // Section Selection
    const [selectedSectionId, setSelectedSectionId] = useState<string>(defaultSectionId || (sections?.[0]?.id || ''));
    const [isSectionOpen, setIsSectionOpen] = useState(false);

    // Link States
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [linkDescription, setLinkDescription] = useState('');
    const [linkDomain, setLinkDomain] = useState('');
    const [linkImage, setLinkImage] = useState('');
    const [isFetchingPreview, setIsFetchingPreview] = useState(false);

    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

    // Audio Recording States
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [isUploadingAudio, setIsUploadingAudio] = useState(false);

    // Video Recording States
    const [isVideoRecording, setIsVideoRecording] = useState(false);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [videoRecordingTime, setVideoRecordingTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const videoMediaRecorderRef = useRef<MediaRecorder | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const videoTimerRef = useRef<NodeJS.Timeout | null>(null);
    const videoStartTimeRef = useRef<number>(0);

    // Çoklu dosya desteği için yeni state'ler
    const [uploadedFiles, setUploadedFiles] = useState<{ url: string; name: string; type?: string }[]>([]);
    const [pendingFiles, setPendingFiles] = useState<File[]>(initialFiles || []);
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 });

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    // Initial files handling & Back Button handling
    useEffect(() => {
        // Initial files logic
        if (initialFiles && initialFiles.length > 0) {
            const firstFile = initialFiles[0];
            if (firstFile.type.startsWith('image/') && initialFiles.length === 1) {
                setType('image');
            } else {
                setType('file');
            }
        }

        // Back button (PopState) handling
        window.history.pushState({ modalOpen: true }, '');

        const handlePopState = () => {
            onClose();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            // If the modal is closing NOT due to a back button, we need to pop the state
            if (window.history.state?.modalOpen) {
                window.history.back();
            }
        };
    }, [initialFiles, onClose]);

    // Link Preview Debounce
    useEffect(() => {
        if (type !== 'link' || !linkUrl) return;

        const timer = setTimeout(async () => {
            if (!isValidUrl(linkUrl)) return;

            setIsFetchingPreview(true);
            try {
                const res = await fetch(`/api/link-preview?url=${encodeURIComponent(linkUrl)}`);
                const data = await res.json();

                if (data.title) setLinkTitle(data.title);
                if (data.description) setLinkDescription(data.description);
                if (data.image) setLinkImage(data.image);
                if (data.hostname) setLinkDomain(data.hostname);
            } catch (error) {
                console.error('Link preview failed', error);
            } finally {
                setIsFetchingPreview(false);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [linkUrl, type]);

    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    // Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: BlobPart[] = [];
            startTimeRef.current = Date.now();

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const duration = (Date.now() - startTimeRef.current) / 1000;
                setAudioBlob(blob);
                setAudioDuration(Math.ceil(duration));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);

        } catch (error) {
            console.error('Mikrofon erişim hatası:', error);
            alert('Mikrofon erişimi reddedildi veya desteklenmiyor.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const deleteAudio = () => {
        setAudioBlob(null);
        setRecordingTime(0);
        setAudioDuration(0);
    };

    // Helper to format time (00:00)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const uploadAudioToCloudinary = async (blob: Blob): Promise<string> => {
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', 'section');

        try {
            // Audio files are treated as 'video' resource_type in Cloudinary usually, or use 'auto'
            const res = await fetch(`https://api.cloudinary.com/v1_1/dqgx6wpbt/video/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Yükleme hatası');
            return data.secure_url;
        } catch (error) {
            console.error('Ses yükleme hatası:', error);
            throw error;
        }
    };

    // Video Recording Functions
    const startVideoRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cameraFacing },
                audio: true
            });
            videoStreamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            videoMediaRecorderRef.current = mediaRecorder;
            const chunks: BlobPart[] = [];
            videoStartTimeRef.current = Date.now();

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const duration = (Date.now() - videoStartTimeRef.current) / 1000;
                setVideoBlob(blob);
                setVideoDuration(Math.ceil(duration));
                setVideoPreviewUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }
            };

            mediaRecorder.start();
            setIsVideoRecording(true);
            setVideoRecordingTime(0);

            videoTimerRef.current = setInterval(() => {
                setVideoRecordingTime(Math.floor((Date.now() - videoStartTimeRef.current) / 1000));
            }, 1000);

        } catch (error) {
            console.error('Kamera erişim hatası:', error);
            alert(language === 'tr' ? 'Kamera erişimi reddedildi veya desteklenmiyor.' : 'Camera access denied or not supported.');
        }
    };

    const stopVideoRecording = () => {
        if (videoMediaRecorderRef.current && isVideoRecording) {
            videoMediaRecorderRef.current.stop();
            setIsVideoRecording(false);
            if (videoTimerRef.current) clearInterval(videoTimerRef.current);
        }
    };

    const deleteVideo = () => {
        if (videoPreviewUrl) {
            URL.revokeObjectURL(videoPreviewUrl);
        }
        setVideoBlob(null);
        setVideoPreviewUrl(null);
        setVideoRecordingTime(0);
        setVideoDuration(0);
    };

    const switchCamera = async () => {
        if (isVideoRecording) return;
        setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
    };

    const uploadVideoToCloudinary = async (blob: Blob): Promise<string> => {
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', 'section');

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/dqgx6wpbt/video/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Yükleme hatası');
            return data.secure_url;
        } catch (error) {
            console.error('Video yükleme hatası:', error);
            throw error;
        }
    };

    const isFormValid = () => {
        // Section check
        if (!selectedSectionId && (!sections || sections.length > 0)) {
            // If sections are provided, one must be selected.
            // If no sections provided (legacy mode), we assume parent handles it.
            if (sections && sections.length > 0) return false;
        }

        if (type === 'text') return content.trim().length > 0;
        if (type === 'image') return imageUrl.length > 0 || pendingFiles.length > 0;
        if (type === 'link') return linkUrl.length > 0;
        if (type === 'file') return uploadedFiles.length > 0 || pendingFiles.length > 0;
        if (type === 'poll') {
            const validOptions = pollOptions.filter(o => o.trim().length > 0);
            return content.trim().length > 0 && validOptions.length >= 2;
        }
        if (type === 'audio') return audioBlob !== null || isUploadingAudio;
        if (type === 'video') return videoBlob !== null || isUploadingVideo;
        return false;
    };

    // Dosya seçme handler'ı
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // 50MB Limit Kontrolü
        const MAX_SIZE = 50 * 1024 * 1024;
        const largeFiles = files.filter(f => f.size > MAX_SIZE);
        if (largeFiles.length > 0) {
            alert(language === 'tr'
                ? `Bazı dosyalar 50MB sınırını aşıyor: ${largeFiles.map(f => f.name).join(', ')}`
                : `Some files exceed the 50MB limit: ${largeFiles.map(f => f.name).join(', ')}`
            );
            return;
        }

        setPendingFiles(prev => [...prev, ...files]);
        e.target.value = '';
    };

    // Sürükle-bırak için state
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        // 50MB Limit Kontrolü
        const MAX_SIZE = 50 * 1024 * 1024;
        const largeFiles = files.filter(f => f.size > MAX_SIZE);
        if (largeFiles.length > 0) {
            alert(language === 'tr'
                ? `Bazı dosyalar 50MB sınırını aşıyor: ${largeFiles.map(f => f.name).join(', ')}`
                : `Some files exceed the 50MB limit: ${largeFiles.map(f => f.name).join(', ')}`
            );
            return;
        }

        setPendingFiles(prev => [...prev, ...files]);
    };

    // Bekleyen dosyayı kaldır
    const removePendingFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Yüklenen dosyayı kaldır
    const removeUploadedFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Dosya uzantısına göre renk belirleme
    const getFileColor = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'bg-purple-100 text-purple-600';
        if (ext === 'pdf') return 'bg-rose-100 text-rose-600';
        if (['doc', 'docx'].includes(ext)) return 'bg-blue-100 text-blue-600';
        if (['xls', 'xlsx'].includes(ext)) return 'bg-emerald-100 text-emerald-600';
        if (['ppt', 'pptx'].includes(ext)) return 'bg-orange-100 text-orange-600';
        if (['mp3', 'wav', 'ogg', 'webm'].includes(ext)) return 'bg-pink-100 text-pink-600';
        if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'bg-indigo-100 text-indigo-600';
        return 'bg-stone-100 text-stone-600';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid()) return;

        let finalAudioUrl = '';
        let finalVideoUrl = '';

        if (type === 'audio' && audioBlob) {
            try {
                setIsUploadingAudio(true);
                finalAudioUrl = await uploadAudioToCloudinary(audioBlob);
                setIsUploadingAudio(false);
            } catch (error) {
                alert(language === 'tr' ? 'Ses yüklenirken bir hata oluştu.' : 'An error occurred while uploading audio.');
                setIsUploadingAudio(false);
                return;
            }
        }

        if (type === 'video' && videoBlob) {
            try {
                setIsUploadingVideo(true);
                finalVideoUrl = await uploadVideoToCloudinary(videoBlob);
                setIsUploadingVideo(false);
            } catch (error) {
                alert(language === 'tr' ? 'Video yüklenirken bir hata oluştu.' : 'An error occurred while uploading video.');
                setIsUploadingVideo(false);
                return;
            }
        }

        // Dosya yükleme (Supabase)
        let finalFiles: { url: string; name: string; type?: string }[] = [...uploadedFiles];
        if (pendingFiles.length > 0) {
            setIsUploadingFiles(true);
            setUploadProgress({ completed: 0, total: pendingFiles.length });
            try {
                // Batch upload with concurrency limit (5)
                const urls = await uploadMultipleToSupabase(
                    pendingFiles,
                    5,
                    (completed, total) => setUploadProgress({ completed, total })
                );

                urls.forEach((url, idx) => {
                    finalFiles.push({
                        url,
                        name: pendingFiles[idx].name,
                        type: pendingFiles[idx].type
                    });
                });
            } catch (error) {
                console.error("Batch upload failed:", error);
                alert(language === 'tr'
                    ? `Bazı dosyalar yüklenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
                    : `Some files failed to upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setIsUploadingFiles(false);
                return;
            }
            setIsUploadingFiles(false);
        }

        // Image tipi için ilk dosyayı imageUrl olarak ata (Eğer file yüklenmişse)
        let finalImageUrl = imageUrl;
        if (type === 'image' && finalFiles.length > 0) {
            finalImageUrl = finalFiles[0].url;
        }

        // Use linkImage as imageUrl if it's a link card and no other image was provided
        // Use linkUrl for link field

        onSubmit({
            content: type === 'video' && !content ? (language === 'tr' ? 'Video Notu' : 'Video Note') : content,
            type,
            color,
            imageUrl: (type === 'image' || type === 'file') ? finalImageUrl : (type === 'link' ? linkImage : undefined),
            linkUrl: (type === 'link' || type === 'file') ? linkUrl : undefined,
            linkTitle: type === 'link' ? linkTitle : undefined,
            linkDescription: type === 'link' ? linkDescription : undefined,
            linkDomain: type === 'link' ? linkDomain : undefined,
            pollOptions: type === 'poll' ? pollOptions.filter(o => o.trim().length > 0) : undefined,
            audioUrl: finalAudioUrl || undefined,
            audioDuration: type === 'audio' ? audioDuration : undefined,
            videoUrl: finalVideoUrl || undefined,
            videoDuration: type === 'video' ? videoDuration : undefined,
            files: (type === 'file' || (type === 'image' && finalFiles.length > 1)) && finalFiles.length > 0 ? finalFiles : undefined,
            sectionId: selectedSectionId,
        });
    };

    const handleFileUploadSuccess = (url: string) => {
        setImageUrl(url);
        setLinkUrl('');
    };

    // Helper for poll options
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const addOption = () => {
        setPollOptions([...pollOptions, '']);
    };

    const removeOption = (index: number) => {
        if (pollOptions.length <= 2) return;
        setPollOptions(pollOptions.filter((_, i) => i !== index));
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
                    <h2 className="text-lg font-semibold text-stone-800">{t('note.addNote')}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} className="p-5 space-y-4">

                        {/* Section Selection (if enabled) */}
                        {sections && sections.length > 0 && (
                            <div className="relative z-20">
                                <label className="block text-sm font-medium text-stone-600 mb-2">
                                    {language === 'tr' ? 'Bölüm' : 'Section'}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsSectionOpen(!isSectionOpen)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors text-left"
                                >
                                    <span className="truncate">
                                        {sections.find(s => s.id === selectedSectionId)?.title || (language === 'tr' ? 'Bölüm Seç' : 'Select Section')}
                                    </span>
                                    <ChevronDown size={16} className={cn("text-stone-400 transition-transform", isSectionOpen && "rotate-180")} />
                                </button>

                                {isSectionOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-20"
                                            onClick={() => setIsSectionOpen(false)}
                                        />
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-30 animate-in zoom-in-95 duration-100">
                                            {sections.map(section => (
                                                <button
                                                    key={section.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedSectionId(section.id);
                                                        setIsSectionOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-stone-50 flex items-center justify-between border-b border-stone-100 last:border-0"
                                                >
                                                    <span className={cn("text-sm truncate", selectedSectionId === section.id ? "text-stone-900 font-medium" : "text-stone-600")}>
                                                        {section.title}
                                                    </span>
                                                    {selectedSectionId === section.id && <Check size={16} className="text-stone-900" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Note Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-3">{t('note.type')}</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 noscrollbar">
                                {[
                                    { value: 'text', icon: Type, labelKey: 'note.text' },
                                    { value: 'link', icon: LinkIcon, labelKey: 'note.link' },
                                    { value: 'file', icon: FileText, labelKey: 'note.file' },
                                    { value: 'poll', icon: BarChart, labelKey: 'note.poll' },
                                    { value: 'audio', icon: Mic, labelKey: 'note.audio' },
                                    { value: 'video', icon: Video, label: language === 'tr' ? 'Video' : 'Video' },
                                ].map(({ value, icon: Icon, labelKey, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setType(value as any)}
                                        className={cn(
                                            'flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all duration-200 text-xs font-medium flex-1 justify-center whitespace-nowrap min-w-[80px]',
                                            type === value
                                                ? 'border-stone-800 bg-stone-800 text-white'
                                                : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                                        )}
                                    >
                                        <Icon size={16} />
                                        {label || t(labelKey!)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dynamic Fields based on Type */}

                        {/* AUDIO RECORDER */}
                        {type === 'audio' && (
                            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col items-center gap-4">
                                {/* Recording Visualization / Timer */}
                                <div className="text-3xl font-mono font-bold text-stone-700 tabular-nums">
                                    {formatTime(isRecording ? recordingTime : audioDuration)}
                                </div>

                                {/* Controls */}
                                {!audioBlob && !isRecording && (
                                    <button type="button" onClick={startRecording} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all">
                                        <Mic size={32} />
                                    </button>
                                )}

                                {isRecording && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-end gap-1 h-8">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="w-1 bg-red-500 animate-pulse" style={{ height: Math.random() * 20 + 10 + 'px', animationDelay: i * 0.1 + 's' }} />
                                            ))}
                                        </div>
                                        <button type="button" onClick={stopRecording} className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all">
                                            <Square size={24} fill="currentColor" />
                                        </button>
                                    </div>
                                )}

                                {audioBlob && !isRecording && (
                                    <div className="flex items-center gap-4 w-full justify-center">
                                        <button type="button" onClick={() => { const audio = new Audio(URL.createObjectURL(audioBlob)); audio.play(); }} className="p-3 bg-stone-200 rounded-full text-stone-700 hover:bg-stone-300 transition-colors">
                                            <Play size={24} fill="currentColor" />
                                        </button>
                                        <button type="button" onClick={deleteAudio} className="p-3 bg-red-100 rounded-full text-red-600 hover:bg-red-200 transition-colors">
                                            <Trash2 size={24} />
                                        </button>
                                    </div>
                                )}

                                <p className="text-xs text-stone-500 font-medium">
                                    {isRecording
                                        ? (language === 'tr' ? 'Kaydediliyor...' : 'Recording...')
                                        : (audioBlob
                                            ? (language === 'tr' ? 'Kaydedildi' : 'Recorded')
                                            : (language === 'tr' ? 'Kayıt için bas' : 'Press to record'))}
                                </p>
                            </div>
                        )}

                        {/* VIDEO RECORDER */}
                        {type === 'video' && (
                            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 flex flex-col items-center gap-4">
                                {/* Camera Preview / Recorded Video */}
                                <div className="relative w-full aspect-video bg-stone-900 rounded-xl overflow-hidden">
                                    {!videoBlob && (
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            className={cn(
                                                "w-full h-full object-cover",
                                                cameraFacing === 'user' && "scale-x-[-1]"
                                            )}
                                        />
                                    )}
                                    {videoPreviewUrl && (
                                        <video
                                            src={videoPreviewUrl}
                                            controls
                                            className="w-full h-full object-contain"
                                        />
                                    )}
                                    {!isVideoRecording && !videoBlob && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-stone-800/80">
                                            <Camera size={48} className="text-stone-500" />
                                        </div>
                                    )}
                                    {/* Recording indicator */}
                                    {isVideoRecording && (
                                        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-full">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                            <span className="text-xs font-bold text-white tabular-nums">{formatTime(videoRecordingTime)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-4">
                                    {/* Switch Camera */}
                                    {!videoBlob && !isVideoRecording && (
                                        <button
                                            type="button"
                                            onClick={switchCamera}
                                            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-stone-600 shadow-md hover:scale-105 active:scale-95 transition-all border border-stone-200"
                                            title={language === 'tr' ? 'Kamerayı Değiştir' : 'Switch Camera'}
                                        >
                                            <RotateCcw size={20} />
                                        </button>
                                    )}

                                    {/* Start Recording */}
                                    {!videoBlob && !isVideoRecording && (
                                        <button
                                            type="button"
                                            onClick={startVideoRecording}
                                            className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all ring-4 ring-red-200"
                                        >
                                            <Camera size={28} />
                                        </button>
                                    )}

                                    {/* Stop Recording */}
                                    {isVideoRecording && (
                                        <button
                                            type="button"
                                            onClick={stopVideoRecording}
                                            className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all animate-pulse"
                                        >
                                            <StopCircle size={28} />
                                        </button>
                                    )}

                                    {/* Delete Recording */}
                                    {videoBlob && !isVideoRecording && (
                                        <button
                                            type="button"
                                            onClick={deleteVideo}
                                            className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 shadow-md hover:bg-red-200 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>

                                {/* Status Text */}
                                <p className="text-xs text-indigo-600 font-medium">
                                    {isVideoRecording
                                        ? (language === 'tr' ? 'Kaydediliyor... Durdurmak için basın' : 'Recording... Press to stop')
                                        : (videoBlob
                                            ? (language === 'tr' ? `${videoDuration} saniyelik video kaydedildi` : `${videoDuration} seconds video recorded`)
                                            : (language === 'tr' ? 'Video kaydetmek için kamera butonuna basın' : 'Press camera button to record'))}
                                </p>

                                {/* Uploading Indicator */}
                                {isUploadingVideo && (
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span className="text-sm font-medium">{language === 'tr' ? 'Video yükleniyor...' : 'Uploading video...'}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* IMAGE UPLOAD & URL */}
                        {type === 'image' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-600 mb-2">{t('note.imageUrl')}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="url"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            placeholder="https://example.com/image.jpg"
                                            className="w-full px-4 py-2 border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-center text-xs text-stone-400 mb-3">— {language === 'tr' ? 'VEYA' : 'OR'} —</p>
                                        <label
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-2 py-8 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                                                isDragging ? "border-indigo-500 bg-indigo-50" : "border-stone-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                                            )}
                                        >
                                            <Upload size={24} className={cn("transition-colors", isDragging ? "text-indigo-500" : "text-stone-400")} />
                                            <span className="text-sm text-stone-500 font-medium">
                                                {language === 'tr' ? 'Cihazdan Fotoğraf Yükle' : 'Upload Image from Device'}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileSelect}
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Preview for image upload */}
                                {pendingFiles.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {pendingFiles.map((file, idx) => (
                                            <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-stone-200 bg-stone-50 group">
                                                {file.type.startsWith('image/') ? (
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt="preview"
                                                        className="w-full h-full object-cover"
                                                        onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-stone-100 italic text-[10px] text-stone-400">
                                                        {file.name}
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removePendingFile(idx)}
                                                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* LINK INPUTS AND PREVIEW */}
                        {type === 'link' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-600 mb-2">Link URL</label>
                                    <div className="relative">
                                        <input
                                            type="url"
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                            placeholder="https://ornek.com"
                                            className="w-full px-4 py-2 border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300 pr-10"
                                            autoFocus
                                        />
                                        {isFetchingPreview && (
                                            <div className="absolute right-3 top-2.5 animate-spin text-stone-400">
                                                <Loader2 size={18} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Link Preview Card */}
                                {(linkTitle || linkImage || linkDescription) && (
                                    <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50 flex flex-col md:flex-row shadow-sm">
                                        {linkImage && (
                                            <div className="w-full md:w-32 h-32 md:h-auto shrink-0 bg-stone-200 relative">
                                                <img src={linkImage} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="p-3">
                                            <div className="text-[10px] text-stone-400 uppercase font-bold mb-1 flex items-center gap-1">
                                                <Globe size={10} />
                                                {linkDomain || 'WEBSITE'}
                                            </div>
                                            <h3 className="text-sm font-bold text-stone-800 line-clamp-1 mb-1">
                                                {linkTitle || (language === 'tr' ? 'Başlıksız' : 'Untitled')}
                                            </h3>
                                            <p className="text-xs text-stone-500 line-clamp-2">
                                                {linkDescription || (language === 'tr' ? 'Açıklama yok' : 'No description')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-stone-600 mb-2">
                                        {language === 'tr' ? 'Başlık (Opsiyonel)' : 'Title (Optional)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={linkTitle}
                                        onChange={(e) => setLinkTitle(e.target.value)}
                                        placeholder={language === 'tr' ? 'Link başlığı...' : 'Link title...'}
                                        className="w-full px-4 py-2 border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300"
                                    />
                                </div>
                            </div>
                        )}

                        {/* FILE UPLOAD - ÇOKLU DOSYA DESTEĞİ */}
                        {type === 'file' && (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-stone-600 mb-2">
                                    {language === 'tr' ? 'Dosya Yükle' : 'Upload Files'}
                                </label>

                                {/* Dosya Seçme Alanı */}
                                <label
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-2 py-8 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                                        isDragging ? "border-indigo-500 bg-indigo-50" : "border-stone-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                                    )}
                                >
                                    <Upload size={24} className={cn("transition-colors", isDragging ? "text-indigo-500" : "text-stone-400")} />
                                    <div className="text-center">
                                        <p className="text-sm text-stone-600 font-semibold">
                                            {language === 'tr' ? 'Dosyaları buraya sürükleyin' : 'Drag files here'}
                                        </p>
                                        <p className="text-xs text-stone-400 mt-1">
                                            {language === 'tr' ? 'veya tıklayarak seçin' : 'or click to select'}
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip,.rar,.mp3,.mp4,.wav,.webm"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </label>
                                <p className="text-xs text-stone-400 text-center">
                                    PDF, Word, Excel, PowerPoint, Resim, Video, Ses (Max 50MB/dosya)
                                </p>

                                {/* Bekleyen Dosyalar (Henüz yüklenmemiş) */}
                                {pendingFiles.length > 0 && (
                                    <div className="space-y-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                        <p className="text-xs font-medium text-amber-600 mb-2">
                                            {language === 'tr'
                                                ? `${pendingFiles.length} dosya seçildi (gönderildiğinde yüklenecek)`
                                                : `${pendingFiles.length} file(s) selected (will upload on submit)`}
                                        </p>
                                        {pendingFiles.map((file, idx) => {
                                            const ext = file.name.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE';
                                            return (
                                                <div key={idx} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-amber-100">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold",
                                                        getFileColor(file.name)
                                                    )}>
                                                        {ext}
                                                    </div>
                                                    <span className="text-sm text-stone-700 truncate flex-1">{file.name}</span>
                                                    <span className="text-xs text-stone-400 shrink-0">
                                                        {(file.size / 1024 / 1024).toFixed(1)} MB
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removePendingFile(idx)}
                                                        className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Yüklenmiş Dosyalar */}
                                {uploadedFiles.length > 0 && (
                                    <div className="space-y-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                        <p className="text-xs font-medium text-emerald-600 mb-2">
                                            {language === 'tr'
                                                ? `${uploadedFiles.length} dosya yüklendi`
                                                : `${uploadedFiles.length} file(s) uploaded`}
                                        </p>
                                        {uploadedFiles.map((file, idx) => {
                                            const ext = file.name.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE';
                                            return (
                                                <div key={idx} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-emerald-100">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold",
                                                        getFileColor(file.name)
                                                    )}>
                                                        {ext}
                                                    </div>
                                                    <span className="text-sm text-stone-700 truncate flex-1">{file.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeUploadedFile(idx)}
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
                        )}

                        {/* POLL OPTIONS */}
                        {type === 'poll' && (
                            <div>
                                <label className="block text-sm font-medium text-stone-600 mb-2">
                                    {t('note.pollOptions')} <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-2">
                                    {pollOptions.map((option, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                                placeholder={language === 'tr' ? `Seçenek ${index + 1}` : `Option ${index + 1}`}
                                                className="flex-1 px-4 py-2 border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300"
                                            />
                                            {pollOptions.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeOption(index)}
                                                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <X size={20} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addOption}
                                        className="text-sm text-stone-600 hover:text-stone-900 font-medium px-2 py-1"
                                    >
                                        + {t('note.addOption')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Content / Question (Optional for Audio) */}
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-2">
                                {type === 'poll'
                                    ? (language === 'tr' ? 'Soru' : 'Question')
                                    : (type === 'audio'
                                        ? (language === 'tr' ? 'Not (Opsiyonel)' : 'Note (Optional)')
                                        : type === 'file'
                                            ? (language === 'tr' ? 'Açıklama (Opsiyonel)' : 'Description (Optional)')
                                            : t('note.content'))} {type !== 'link' && type !== 'image' && type !== 'file' && type !== 'audio' && <span className="text-red-500">*</span>}
                            </label>

                            {/* Rich Text Editor for text notes */}
                            <RichTextEditor
                                content={content}
                                onChange={setContent}
                                placeholder={type === 'poll'
                                    ? (language === 'tr' ? "Sorunuzu buraya yazın..." : "Write your question...")
                                    : (type === 'audio'
                                        ? (language === 'tr' ? "Bu ses kaydı hakkında bir not..." : "A note about this audio recording...")
                                        : type === 'file'
                                            ? (language === 'tr' ? "Dosyalar hakkında bir açıklama..." : "A description about the files...")
                                            : t('note.contentPlaceholder'))}
                                minHeight={type === 'text' ? "120px" : "80px"}
                            />
                        </div>

                        {/* Color Picker */}
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-2">{t('note.color')}</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 noscrollbar">
                                {NOTE_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg border-2 transition-all flex-shrink-0",
                                            color === c ? "border-stone-800 scale-110 shadow-sm" : "border-stone-100 hover:border-stone-300",
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 px-5 py-4 border-t border-stone-100 bg-stone-50 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-stone-200 rounded-lg text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid() || isUploadingAudio || isUploadingFiles}
                        className="flex-1 py-2.5 bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {isUploadingAudio || isUploadingFiles ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {isUploadingAudio
                                    ? (language === 'tr' ? 'Yükleniyor...' : 'Uploading...')
                                    : (language === 'tr'
                                        ? `Yükleniyor (${uploadProgress.completed}/${uploadProgress.total})`
                                        : `Uploading (${uploadProgress.completed}/${uploadProgress.total})`)}
                            </>
                        ) : (
                            type === 'poll'
                                ? (language === 'tr' ? 'Anket Oluştur' : 'Create Poll')
                                : t('note.addNote')
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
