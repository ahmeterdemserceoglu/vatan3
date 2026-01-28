'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles?: ('admin' | 'teacher' | 'student')[];
    requireStaff?: boolean;
    redirectTo?: string;
    fallback?: ReactNode;
}

export function RoleGuard({
    children,
    allowedRoles,
    requireStaff = false,
    redirectTo = '/dashboard',
    fallback
}: RoleGuardProps) {
    const router = useRouter();
    const { user, isAdmin, isTeacher, isStaff, isLoading } = usePermissions();

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            router.push('/auth/login');
            return;
        }

        let hasAccess = true;

        if (requireStaff && !isStaff) {
            hasAccess = false;
        }

        if (allowedRoles && allowedRoles.length > 0) {
            if (!user.role || !allowedRoles.includes(user.role as any)) {
                hasAccess = false;
            }
        }

        if (!hasAccess) {
            if (!fallback) {
                router.push(redirectTo);
            }
        }
    }, [user, isLoading, isAdmin, isTeacher, isStaff, requireStaff, allowedRoles, router, redirectTo, fallback]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
            </div>
        );
    }

    // Check access for rendering
    let hasAccess = true;
    if (!user) hasAccess = false;
    if (requireStaff && !isStaff) hasAccess = false;
    if (allowedRoles && allowedRoles.length > 0 && user?.role && !allowedRoles.includes(user.role as any)) {
        hasAccess = false;
    }

    if (!hasAccess) {
        return fallback || null;
    }

    return <>{children}</>;
}
