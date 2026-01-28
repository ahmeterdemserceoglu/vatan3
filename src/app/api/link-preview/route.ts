import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    // Extract hostname for fallback
    let hostname = '';
    try {
        if (url) {
            const u = new URL(url);
            hostname = u.hostname.replace('www.', '');
        }
    } catch { }

    // Return fallback data for missing URL
    if (!url) {
        return NextResponse.json({
            title: '',
            description: '',
            image: '',
            hostname: '',
            url: '',
            error: true
        });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        // If fetch failed, return fallback with 200 OK (no browser console error)
        if (!response.ok) {
            return NextResponse.json({
                title: hostname || url,
                description: '',
                image: '',
                hostname,
                url,
                error: true
            });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const getMetaTag = (prop: string) => {
            return $(`meta[property="og:${prop}"]`).attr('content') ||
                $(`meta[property="twitter:${prop}"]`).attr('content') ||
                $(`meta[name="${prop}"]`).attr('content');
        };

        const title = getMetaTag('title') || $('title').text() || hostname;
        const description = getMetaTag('description') || '';
        const image = getMetaTag('image') || '';

        return NextResponse.json({
            title,
            description,
            image,
            hostname,
            url
        });

    } catch {
        // Return fallback data with 200 OK instead of 500 error
        return NextResponse.json({
            title: hostname || url,
            description: '',
            image: '',
            hostname,
            url,
            error: true
        });
    }
}
