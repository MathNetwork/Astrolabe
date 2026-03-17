'use client'
import { memo } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'

export const NetworkView = memo(function NetworkView() {
    const objects = useDataStore(s => s.objects)
    const morphisms = useDataStore(s => s.morphisms)
    const selectedObjHash = useSelectObjStore(s => s.selectedHash)
    const selectedMorHash = useSelectMorStore(s => s.selectedHash)
    return <div className="h-full" />
})
