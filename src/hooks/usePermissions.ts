import { User, Board } from '@/types';
import { useStore } from '@/store/useStore';
import { useEffect } from 'react';
import { getRolePermissions } from '@/lib/admin';

export function usePermissions(board?: Board | null) {
    const { user, isLoading, rolePermissions, setRolePermissions } = useStore();

    // Fetch dynamic permissions if not already in store
    useEffect(() => {
        if (!rolePermissions && user) {
            getRolePermissions().then(setRolePermissions);
        }
    }, [user, rolePermissions, setRolePermissions]);

    const isAdmin = user?.role === 'admin';
    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';
    const isStaff = isAdmin || isTeacher;

    const isOwner = board && user && board.ownerId === user.uid;

    // Helper to check dynamic permission
    const checkPerm = (permissionName: string, defaultValue: boolean) => {
        if (isAdmin) return true; // Admins always have all permissions
        if (!user?.role) return false;
        if (!rolePermissions) return defaultValue; // Fallback to hardcoded default

        const roleConfig = rolePermissions[user.role];
        if (!roleConfig) return defaultValue;

        return roleConfig[permissionName] !== undefined ? roleConfig[permissionName] : defaultValue;
    };

    // Board management (settings, deleting board, etc.)
    const canManageBoard = isAdmin || isOwner || (isTeacher && board?.members?.includes(user?.uid || ''));

    // Content management
    const canManageSections = isAdmin || isOwner || checkPerm('canManageSections', isTeacher);
    const canDeleteAnyComment = isAdmin || isOwner || checkPerm('canDeleteComments', isTeacher);
    const canDeleteAnyNote = isAdmin || isOwner || checkPerm('canDeleteNotes', isTeacher);
    const canPinNote = isAdmin || isOwner || checkPerm('canPinNotes', isTeacher);
    const canLockComments = isAdmin || isOwner || checkPerm('canLockComments', isTeacher);

    // Member management
    const canManageMembers = isAdmin || isOwner || isTeacher; // Still keeping some core teacher logic
    const canApproveMembers = isAdmin || isOwner || isTeacher;

    // Assignment management
    const canCreateAssignment = isAdmin || isOwner || checkPerm('canCreateAssignments', isTeacher);
    const canGradeAssignment = isAdmin || isOwner || checkPerm('canGradeAssignments', isTeacher);

    return {
        user,
        isLoading,
        isAdmin,
        isTeacher,
        isStudent,
        isStaff,
        isOwner,
        canManageBoard,
        canManageSections,
        canDeleteAnyComment,
        canDeleteAnyNote,
        canPinNote,
        canLockComments,
        canManageMembers,
        canApproveMembers,
        canCreateAssignment,
        canGradeAssignment,
    };
}
