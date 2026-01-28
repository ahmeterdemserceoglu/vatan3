// Admin email address used across the application for support/contact purposes
export const ADMIN_EMAIL = 'admin@collabo.com';
export const SUPPORT_EMAIL = 'admin@collabo.com';

// Helper function to create mailto link
export const getMailtoLink = (subject?: string) => {
    const base = `mailto:${ADMIN_EMAIL}`;
    if (subject) {
        return `${base}?subject=${encodeURIComponent(subject)}`;
    }
    return base;
};
