import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Guardian: Security Middleware
// Rate Limiting Configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // Max requests per window
const ipRateLimit = new Map<string, { count: number; expires: number }>();

export function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const headers = response.headers;

    // 1. Security Headers (Helmet-like protection)
    headers.set('X-DNS-Prefetch-Control', 'on');
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), interest-cohort=()');

    // 2. Content Security Policy (CSP)
    const csp = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.firebaseapp.com https://apis.google.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' data: https: blob:;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://identitytoolkit.googleapis.com https://*.supabase.co https://api.cloudinary.com https://api.ipify.org;
        frame-src 'self' https://*.firebaseapp.com https://*.supabase.co https://aqeltsrhcygblheywria.supabase.co;
        media-src 'self' https://*.supabase.co https://aqeltsrhcygblheywria.supabase.co https://res.cloudinary.com blob:;
        object-src 'none';
        base-uri 'self';
    `.replace(/\s{2,}/g, ' ').trim();

    headers.set('Content-Security-Policy', csp);

    const userAgent = request.headers.get('user-agent') || '';
    const ip = (request as any).ip || request.headers.get('x-forwarded-for') || 'unknown';

    // 3. Rate Limiting (Basic Protection)
    if (request.nextUrl.pathname.startsWith('/api')) {
        const currentLimit = ipRateLimit.get(ip) || { count: 0, expires: Date.now() + RATE_LIMIT_WINDOW };

        if (Date.now() > currentLimit.expires) {
            currentLimit.count = 1;
            currentLimit.expires = Date.now() + RATE_LIMIT_WINDOW;
        } else {
            currentLimit.count++;
        }

        ipRateLimit.set(ip, currentLimit);

        if (currentLimit.count > MAX_REQUESTS) {
            console.warn(`[Guardian] Rate limit exceeded for IP: ${ip}`);
            return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 4. Bot & Attack Protection
    const badBots = ['sqlmap', 'nikto', 'curb', 'python-requests', 'nmap', 'nessus'];
    if (badBots.some(bot => userAgent.toLowerCase().includes(bot))) {
        console.warn(`[Guardian] Blocked malicious User-Agent: ${userAgent} from IP: ${ip}`);
        return new NextResponse(JSON.stringify({ error: 'Access Denied', reason: 'Security Violation' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 5. Path Protection
    const path = request.nextUrl.pathname;
    const sensitivePaths = ['/.env', '/.git', '/wp-admin', '/admin.php', '/config.php'];
    if (sensitivePaths.some(p => path.includes(p))) {
        console.warn(`[Guardian] Blocked sensitive path access: ${path} from IP: ${ip}`);
        return new NextResponse(JSON.stringify({ error: 'Access Denied' }), { status: 403 });
    }

    // 6. Authentication Check (Protected Routes)
    const protectedPaths = ['/dashboard', '/board', '/messages', '/notifications', '/profil'];
    const isProtectedPath = protectedPaths.some(p => path.startsWith(p));

    // Auth token kontrolü (Cookie tabanlı)
    // NOT: Kullanıcının giriş yaptığında 'session', 'token' veya 'sb-access-token' adında bir cookie set etmesi gerekir.
    const authToken = request.cookies.get('session') || request.cookies.get('token') || request.cookies.get('sb-access-token');

    if (isProtectedPath && !authToken) {
        // İsteği yapan bir API çağrısı ise JSON dön, sayfa ise redirect et
        if (path.startsWith('/api')) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const url = request.nextUrl.clone();
        url.pathname = '/auth/login'; // Login sayfasının doğru yolu
        url.searchParams.set('from', path);
        return NextResponse.redirect(url);
    }

    return response;
}

// Configure which paths the middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         * - manifest.json & service workers
         */
        '/((?!_next/static|_next/image|favicon.ico|public/|manifest.json|sw.js|firebase-messaging-sw.js).*)',
    ],
};
