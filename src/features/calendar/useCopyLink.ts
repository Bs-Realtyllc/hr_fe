import { useState } from 'react';

/** Copies a meeting link to the clipboard and tracks the "Copied" / error state. */
export function useCopyLink() {
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState('');

    const copy = async (link: string) => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setCopyError('');
        } catch (copyFailure) {
            console.error('Failed to copy meeting link:', copyFailure);
            setCopied(false);
            setCopyError('Unable to copy link.');
        }
    };

    const reset = () => {
        setCopied(false);
        setCopyError('');
    };

    return { copied, copyError, copy, reset };
}
