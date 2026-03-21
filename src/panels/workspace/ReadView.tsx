'use client'

import { useState, useEffect } from 'react'

const API = 'http://127.0.0.1:8765'

export function ReadView() {
    const [text, setText] = useState('')

    useEffect(() => {
        const path = new URLSearchParams(window.location.search).get('path')
        if (!path) return

        fetch(`${API}/api/docs/list?path=${encodeURIComponent(path)}`)
            .then(r => r.json())
            .then(data => {
                const files = data.files || []
                if (files.length === 0) return
                return fetch(`${API}/api/docs/read?path=${encodeURIComponent(files[0].path)}`)
            })
            .then(r => r?.json())
            .then(d => { if (d?.content) setText(d.content) })
    }, [])

    return <pre style={{ padding: 24, color: '#ccc', whiteSpace: 'pre-wrap' }}>{text}</pre>
}
