/**
 * imageUtils — 图片处理工具函数
 */

const MIME_TO_EXT: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
}

/** 生成图片文件名 */
export function generateImageFilename(originalName: string, mimeType: string): string {
    const ext = MIME_TO_EXT[mimeType] || '.png'
    if (originalName) {
        // 确保有正确扩展名
        const base = originalName.replace(/\.[^.]+$/, '')
        return `${base}${ext}`
    }
    return `paste-${Date.now()}${ext}`
}

/** 将 File 对象转为 data URL（用于预览缩略图） */
export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}
