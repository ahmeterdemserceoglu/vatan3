'use client';

import { useEffect } from 'react';

export function SecurityGuard() {
    useEffect(() => {
        // 1. Console Warning (Self-XSS Protection)
        const showWarning = () => {
            if (process.env.NODE_ENV === 'development') return;

            console.clear();
            const styles = [
                'color: #ef4444', // red-500
                'font-size: 40px',
                'font-weight: bold',
                'text-shadow: 2px 2px black',
                'padding: 10px',
            ].join(';');

            const textStyles = [
                'color: #3f3f46',
                'font-size: 16px',
                'padding: 10px',
            ].join(';');

            setTimeout(() => {
                console.log('%cDUR!', styles);
                console.log(
                    '%cBu alan geliştiriciler içindir. Eğer birisi size buraya bir kod yapıştırmanızı veya yazmanızı söylerse, bu bir dolandırıcılık girişimidir ve hesabınızın çalınmasına neden olabilir.\n\nLütfen buraya hiçbir şey yapıştırmayın!',
                    textStyles
                );
            }, 1000);
        };

        showWarning();
        // Re-show warning occasionally if console is cleared by user or other scripts
        const interval = setInterval(showWarning, 20000);

        // 2. Disable Right Click
        const handleContextMenu = (e: MouseEvent) => {
            if (process.env.NODE_ENV === 'development') return;
            e.preventDefault();
        };

        // 3. Disable Developer Tools Shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            if (process.env.NODE_ENV === 'development') return;

            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                return;
            }

            // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element), Ctrl+U (Source)
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
                e.preventDefault();
                return;
            }
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                return;
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            clearInterval(interval);
        };
    }, []);

    return null;
}
