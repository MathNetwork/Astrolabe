/** Convert LaTeX macros to HTML tags before Markdown rendering. */
export function preprocess(content: string): string {
    return content
        .replace(/\\entryref\{([^}]+)\}\{([^}]+)\}/g, '<span data-entry="$1">$2</span>')
        .replace(/\\entryblock\{([^}]+)\}/g, '<div data-entry="$1"></div>')
}
