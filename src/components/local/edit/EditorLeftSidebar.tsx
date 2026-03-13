// @ts-nocheck
import { Panel, PanelResizeHandle } from 'react-resizable-panels'
import { SettingsPanel } from '@/components/panels/SettingsPanel'

export function EditorLeftSidebar({ ctx }: any) {
    const {
        searchPanelOpen,
        viewMode,
        filterOptions,
        updateFilterOptionsUndoable,
        physics,
        updatePhysicsUndoable,
        analysisData,
        analysisLoading,
        sizeMappingMode,
        setSizeMappingMode,
        sizeCurveControl,
        setSizeCurveControl,
        colorMappingMode,
        setColorMappingMode,
        layoutClusterMode,
        setLayoutClusterMode,
        graphNodes,
        visibleNodes,
        canvasNodes,
        handleClearCanvas,
        handleResetAllData,
    } = ctx

    if (!searchPanelOpen) return null

    return (
        <>
            <Panel id="left-sidebar" defaultSize={18} minSize={15} maxSize={35}>
                <div className="h-full flex flex-col bg-black">
                    <div className="flex border-b border-white/10 shrink-0">
                        <div className="flex-1 px-3 py-2.5 text-xs font-medium text-white/90 bg-white/5">
                            Settings
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <SettingsPanel
                            viewMode={viewMode}
                            filterOptions={filterOptions}
                            updateFilterOptionsUndoable={updateFilterOptionsUndoable}
                            physics={physics}
                            updatePhysicsUndoable={updatePhysicsUndoable}
                            analysisData={analysisData}
                            analysisLoading={analysisLoading}
                            sizeMappingMode={sizeMappingMode}
                            setSizeMappingMode={setSizeMappingMode}
                            sizeCurveControl={sizeCurveControl}
                            setSizeCurveControl={setSizeCurveControl}
                            colorMappingMode={colorMappingMode}
                            setColorMappingMode={setColorMappingMode}
                            layoutClusterMode={layoutClusterMode}
                            setLayoutClusterMode={setLayoutClusterMode}
                            graphNodes={graphNodes}
                            visibleNodes={visibleNodes}
                            canvasNodes={canvasNodes}
                            handleClearCanvas={handleClearCanvas}
                            handleResetAllData={handleResetAllData}
                        />
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle style={{ width: 1, background: 'rgba(252, 175, 69, 0.5)' }} className="cursor-col-resize hover:brightness-150 transition-all">
                <div />
            </PanelResizeHandle>
        </>
    )
}
