/**
 * Spam Protection Utility
 * Prevents duplicate messages and rate limiting
 */

// Store for tracking recent messages per user
const recentMessages = new Map<string, { content: string; timestamp: number }[]>();
const lastMessageTime = new Map<string, number>();

// Configuration
const SPAM_CONFIG = {
    // Minimum time between messages (milliseconds)
    MIN_MESSAGE_INTERVAL: 500, // 0.5 second

    // Duplicate message check window (milliseconds)
    DUPLICATE_WINDOW: 30000, // 30 seconds

    // Maximum messages allowed in rate limit window
    RATE_LIMIT_COUNT: 10,

    // Rate limit window (milliseconds)
    RATE_LIMIT_WINDOW: 60000, // 1 minute

    // Maximum messages to store for duplicate checking
    MAX_STORED_MESSAGES: 10,
};

export interface SpamCheckResult {
    allowed: boolean;
    reason?: 'too_fast' | 'duplicate' | 'rate_limit';
    waitTime?: number; // milliseconds to wait
}

/**
 * Check if a message should be allowed to send
 */
export function checkSpam(userId: string, content: string): SpamCheckResult {
    const now = Date.now();
    const normalizedContent = content.trim().toLowerCase();

    // Check minimum interval between messages
    const lastTime = lastMessageTime.get(userId);
    if (lastTime) {
        const timeSinceLastMessage = now - lastTime;
        if (timeSinceLastMessage < SPAM_CONFIG.MIN_MESSAGE_INTERVAL) {
            return {
                allowed: false,
                reason: 'too_fast',
                waitTime: SPAM_CONFIG.MIN_MESSAGE_INTERVAL - timeSinceLastMessage,
            };
        }
    }

    // Get user's recent messages
    let userMessages = recentMessages.get(userId) || [];

    // Clean old messages
    userMessages = userMessages.filter(
        msg => now - msg.timestamp < SPAM_CONFIG.RATE_LIMIT_WINDOW
    );

    // Check rate limit
    if (userMessages.length >= SPAM_CONFIG.RATE_LIMIT_COUNT) {
        const oldestMessage = userMessages[0];
        const waitTime = SPAM_CONFIG.RATE_LIMIT_WINDOW - (now - oldestMessage.timestamp);
        return {
            allowed: false,
            reason: 'rate_limit',
            waitTime: waitTime > 0 ? waitTime : 1000,
        };
    }

    // Check for duplicate message in recent window
    const duplicateWindow = now - SPAM_CONFIG.DUPLICATE_WINDOW;
    const isDuplicate = userMessages.some(
        msg => msg.timestamp > duplicateWindow && msg.content === normalizedContent
    );

    if (isDuplicate) {
        return {
            allowed: false,
            reason: 'duplicate',
        };
    }

    return { allowed: true };
}

/**
 * Record a sent message for spam tracking
 */
export function recordMessage(userId: string, content: string): void {
    const now = Date.now();
    const normalizedContent = content.trim().toLowerCase();

    // Update last message time
    lastMessageTime.set(userId, now);

    // Get user's messages
    let userMessages = recentMessages.get(userId) || [];

    // Add new message
    userMessages.push({
        content: normalizedContent,
        timestamp: now,
    });

    // Keep only recent messages
    if (userMessages.length > SPAM_CONFIG.MAX_STORED_MESSAGES) {
        userMessages = userMessages.slice(-SPAM_CONFIG.MAX_STORED_MESSAGES);
    }

    // Clean old messages
    userMessages = userMessages.filter(
        msg => now - msg.timestamp < SPAM_CONFIG.RATE_LIMIT_WINDOW
    );

    recentMessages.set(userId, userMessages);
}

/**
 * Get spam error message in the given language
 */
export function getSpamErrorMessage(
    reason: 'too_fast' | 'duplicate' | 'rate_limit',
    language: 'tr' | 'en',
    waitTime?: number
): string {
    const messages = {
        too_fast: {
            tr: 'Çok hızlı gönderiyorsunuz. Lütfen bekleyin.',
            en: 'Sending too fast. Please wait.',
        },
        duplicate: {
            tr: 'Aynı mesajı tekrar gönderemezsiniz.',
            en: 'Cannot send duplicate messages.',
        },
        rate_limit: {
            tr: `Çok fazla mesaj gönderdiniz. ${waitTime ? Math.ceil(waitTime / 1000) + ' saniye' : 'Biraz'} bekleyin.`,
            en: `Too many messages. Wait ${waitTime ? Math.ceil(waitTime / 1000) + ' seconds' : 'a moment'}.`,
        },
    };

    return messages[reason][language];
}

/**
 * Clear spam tracking data for a user (optional - for logout/cleanup)
 */
export function clearSpamTracking(userId: string): void {
    recentMessages.delete(userId);
    lastMessageTime.delete(userId);
}
