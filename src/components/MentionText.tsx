'use client';

import React from 'react';

interface MentionTextProps {
    text: string;
    className?: string;
    members?: { displayName: string }[];
}

// Special group mentions with their styles
const SPECIAL_MENTIONS: Record<string, string> = {
    '@everyone': 'text-indigo-600 font-semibold',
    '@student': 'text-emerald-600 font-semibold',
    '@teacher': 'text-amber-600 font-semibold',
};

/**
 * Renders text with @mentions highlighted
 * Special mentions (@everyone, @student, @teacher) have unique colors
 * If members list is provided, matches full names like "@Ahmet Serçeoğlu"
 * Otherwise falls back to simple @word matching
 */
export function MentionText({ text, className = '', members = [] }: MentionTextProps) {
    if (!text) return null;

    // Helper function to check for special mentions
    const getSpecialMentionStyle = (mention: string): string | null => {
        const lowerMention = mention.toLowerCase();
        for (const [key, style] of Object.entries(SPECIAL_MENTIONS)) {
            if (lowerMention === key) return style;
        }
        return null;
    };

    // If we have members, use their display names for accurate matching
    if (members.length > 0) {
        let result: React.ReactNode[] = [];
        let remainingText = text;
        let keyIndex = 0;

        // Add special mentions to the search list
        const allMentions = [
            ...Object.keys(SPECIAL_MENTIONS).map(m => ({ displayName: m.substring(1), isSpecial: true })),
            ...members.map(m => ({ displayName: m.displayName, isSpecial: false }))
        ];

        while (remainingText.length > 0) {
            // Find the earliest mention in remaining text
            let earliestMatch: { index: number; name: string; length: number; isSpecial: boolean } | null = null;

            for (const mention of allMentions) {
                if (!mention.displayName) continue;
                const mentionTag = `@${mention.displayName}`;
                const index = remainingText.toLowerCase().indexOf(mentionTag.toLowerCase());

                if (index !== -1 && (earliestMatch === null || index < earliestMatch.index)) {
                    earliestMatch = {
                        index,
                        name: remainingText.substring(index, index + mentionTag.length),
                        length: mentionTag.length,
                        isSpecial: mention.isSpecial
                    };
                }
            }

            if (earliestMatch) {
                // Add text before the mention
                if (earliestMatch.index > 0) {
                    result.push(
                        <React.Fragment key={keyIndex++}>
                            {remainingText.substring(0, earliestMatch.index)}
                        </React.Fragment>
                    );
                }

                // Get style based on mention type
                const specialStyle = getSpecialMentionStyle(earliestMatch.name);
                const mentionClass = specialStyle || "text-blue-600 underline decoration-blue-400/50 font-medium cursor-default hover:text-blue-700 transition-colors";

                // Add the styled mention
                result.push(
                    <span
                        key={keyIndex++}
                        className={mentionClass}
                    >
                        {earliestMatch.name}
                    </span>
                );
                // Continue with the rest
                remainingText = remainingText.substring(earliestMatch.index + earliestMatch.length);
            } else {
                // No more mentions, add the rest as plain text
                result.push(<React.Fragment key={keyIndex++}>{remainingText}</React.Fragment>);
                break;
            }
        }

        return <span className={className}>{result}</span>;
    }

    // Fallback: Simple regex for @word (no members provided)
    const mentionRegex = /(@[\w\u00C0-\u017F]+)/g;
    const parts = text.split(mentionRegex);

    return (
        <span className={className}>
            {parts.map((part, index) => {
                if (part.match(mentionRegex)) {
                    const specialStyle = getSpecialMentionStyle(part);
                    return (
                        <span
                            key={index}
                            className={specialStyle || "text-blue-600 underline decoration-blue-400/50 font-medium cursor-default hover:text-blue-700 transition-colors"}
                        >
                            {part}
                        </span>
                    );
                }
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </span>
    );
}
