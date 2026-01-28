'use client';

import { useStore } from '@/store/useStore';
import { translations, Language } from '@/lib/translations';

// Helper function to get nested translation value
function getNestedValue(obj: any, path: string): string {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            return path; // Return the path if translation not found
        }
    }

    return result;
}

export function useTranslation() {
    const { language, toggleLanguage, setLanguage } = useStore();

    /**
     * Get translation for a key path like 'common.save' or 'board.title'
     */
    const t = (key: string, fallback?: string): string => {
        const value = getNestedValue(translations, key);

        if (typeof value === 'object' && value !== null && language in value) {
            return value[language];
        }

        return fallback || key;
    };

    return {
        t,
        language,
        toggleLanguage,
        setLanguage,
        isEnglish: language === 'en',
        isTurkish: language === 'tr',
    };
}

// Re-export for convenience
export type { Language };
