import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Board, Note } from '@/types';
import { Language } from '@/lib/translations';

interface AppState {
    user: User | null;
    currentBoard: Board | null;
    notes: Note[];
    boards: Board[];
    isLoading: boolean;
    language: Language;
    activeChatBoardId: string | null;
    setUser: (user: User | null) => void;
    setCurrentBoard: (board: Board | null) => void;
    setNotes: (notes: Note[]) => void;
    setBoards: (boards: Board[]) => void;
    setLoading: (loading: boolean) => void;
    setLanguage: (language: Language) => void;
    toggleLanguage: () => void;
    setActiveChatBoardId: (boardId: string | null) => void;
    addNote: (note: Note) => void;
    updateNote: (id: string, updates: Partial<Note>) => void;
    deleteNote: (id: string) => void;
    layout: 'horizontal' | 'vertical';
    toggleLayout: () => void;
    unreadDMCount: number;
    setUnreadDMCount: (count: number) => void;
    unreadNotificationCount: number;
    setUnreadNotificationCount: (count: number) => void;
    rolePermissions: any | null;
    setRolePermissions: (permissions: any) => void;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            user: null,
            currentBoard: null,
            notes: [],
            boards: [],
            isLoading: true,
            language: 'tr',
            activeChatBoardId: null,
            setUser: (user) => set({ user }),
            setActiveChatBoardId: (boardId) => set({ activeChatBoardId: boardId }),
            setCurrentBoard: (board) => set({ currentBoard: board }),
            setNotes: (notes) => set({ notes }),
            setBoards: (boards) => set({ boards }),
            setLoading: (isLoading) => set({ isLoading }),
            setLanguage: (language) => set({ language }),
            toggleLanguage: () => {
                const newLang = get().language === 'tr' ? 'en' : 'tr';
                set({ language: newLang });
            },
            addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
            updateNote: (id, updates) =>
                set((state) => ({
                    notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
                })),
            deleteNote: (id) =>
                set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),

            // Layout State
            layout: 'horizontal',
            toggleLayout: () => {
                const newLayout = get().layout === 'horizontal' ? 'vertical' : 'horizontal';
                set({ layout: newLayout });
            },
            unreadDMCount: 0,
            setUnreadDMCount: (unreadDMCount) => set({ unreadDMCount }),
            unreadNotificationCount: 0,
            setUnreadNotificationCount: (unreadNotificationCount) => set({ unreadNotificationCount }),
            rolePermissions: null,
            setRolePermissions: (rolePermissions) => set({ rolePermissions })
        }),
        {
            name: 'app-storage', // unique name
            partialize: (state) => ({ language: state.language, layout: state.layout }), // only persist language and layout
        }
    )
);
