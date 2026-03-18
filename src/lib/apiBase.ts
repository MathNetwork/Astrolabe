/**
 * API base URL — 统一配置
 *
 * 开发/Tauri：http://127.0.0.1:8765
 * 生产/部署：通过环境变量 NEXT_PUBLIC_API_BASE 配置
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8765'
