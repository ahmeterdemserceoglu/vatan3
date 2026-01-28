import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ydyo.vercel.app';

    // Static pages that should be indexed
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${baseUrl}/auth/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/auth/register`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/kvkk`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ];

    // In a real application, you might want to fetch dynamic pages from your database
    // For example, public boards could be added here:
    // 
    // const publicBoards = await getPublicBoards();
    // const boardPages = publicBoards.map(board => ({
    //     url: `${baseUrl}/board/${board.id}`,
    //     lastModified: board.updatedAt,
    //     changeFrequency: 'daily' as const,
    //     priority: 0.6,
    // }));

    return [
        ...staticPages,
        // ...boardPages, // Uncomment when you have public boards
    ];
}
