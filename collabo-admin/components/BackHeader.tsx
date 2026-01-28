'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface BackHeaderProps {
    title: string;
}

export default function BackHeader({ title }: BackHeaderProps) {
    return (
        <div className="bg-stone-900/50 backdrop-blur-xl border-b border-stone-800 sticky top-0 z-50">
            <div className="px-4 py-4 flex items-center gap-3">
                <Link href="/">
                    <button className="p-2 -ml-2 text-stone-400 hover:text-white transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                </Link>
                <h1 className="font-bold text-lg text-white">{title}</h1>
            </div>
        </div>
    );
}

