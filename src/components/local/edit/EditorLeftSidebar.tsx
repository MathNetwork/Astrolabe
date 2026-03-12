// @ts-nocheck
import { Panel, PanelResizeHandle } from 'react-resizable-panels'
import { SearchPanel } from '@/components/SearchPanel'
import { SettingsPanel } from '@/components/panels/SettingsPanel'
import { useStore } from '@/lib/store'

function TocPanel() {
    return (
        <div className="h-full overflow-y-auto px-3 py-4">
            <div className="text-[10px] font-semibold tracking-wider text-white/50 uppercase mb-3">
                On This Page
            </div>
            <div className="flex flex-col items-center justify-center h-48 text-white/30 text-xs">
                <div className="mb-1">No document loaded</div>
                <div className="text-[10px] text-white/20">Select a node to view its proof structure</div>
            </div>
        </div>
    )
}

export function EditorLeftSidebar({ ctx }: any) {
    const {
        searchPanelOpen,
        leftPanelMode,
        setLeftPanelMode,
        searchPanelKey,
        selectedNode,
        handleSearchResultSelect,
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
        namespaceDepthPreview,
        namespaceData,
        namespacesOnCanvas,
        handleNamespaceClick,
        graphNodes,
        visibleNodes,
        canvasNodes,
        handleClearCanvas,
        handleResetAllData,
    } = ctx

    const mainViewTab = useStore(state => state.mainViewTab)

    if (!searchPanelOpen) return null

    // In READ mode, left panel is fixed to TOC — no tab switching needed
    if (mainViewTab === 'read') {
        return (
            <>
                <Panel defaultSize={18} minSize={15} maxSize={35}>
                    <div className="h-full flex flex-col bg-black">
                        <div className="flex border-b border-white/10 shrink-0">
                            <div className="flex-1 px-3 py-2.5 text-xs font-medium text-white/90 bg-white/5">
                                TOC
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <TocPanel />
                        </div>
                    </div>
                </Panel>
                <PanelResizeHandle className="relative w-2 cursor-col-resize group">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px group-hover:w-[2px] transition-all" style={{ background: 'rgba(252, 175, 69, 0.5)' }} />
                </PanelResizeHandle>
            </>
        )
    }

    return (
        <>
            <Panel defaultSize={18} minSize={15} maxSize={35}>
                <div className="h-full flex flex-col bg-black">
                    <div className="flex border-b border-white/10 shrink-0">
                        <button
                            onClick={() => setLeftPanelMode('settings')}
                            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
                                leftPanelMode === 'settings'
                                    ? 'text-white/90 bg-white/5'
                                    : 'text-white/40 hover:text-white/60'
                            }`}
                        >
                            Settings
                        </button>
                        <button
                            onClick={() => setLeftPanelMode('search')}
                            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
                                leftPanelMode === 'search'
                                    ? 'text-white/90 bg-white/5'
                                    : 'text-white/40 hover:text-white/60'
                            }`}
                        >
                            Search
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {leftPanelMode === 'search' ? (
                            <SearchPanel
                                key={searchPanelKey}
                                className="h-full"
                                selectedNodeId={selectedNode?.id}
                                onNodeSelect={handleSearchResultSelect}
                            />
                        ) : (
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
                                namespaceDepthPreview={namespaceDepthPreview}
                                namespaceData={namespaceData}
                                namespacesOnCanvas={namespacesOnCanvas}
                                handleNamespaceClick={handleNamespaceClick}
                                graphNodes={graphNodes}
                                visibleNodes={visibleNodes}
                                canvasNodes={canvasNodes}
                                handleClearCanvas={handleClearCanvas}
                                handleResetAllData={handleResetAllData}
                            />
                        )}
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle style={{ width: 1, background: 'rgba(252, 175, 69, 0.5)' }} className="cursor-col-resize hover:brightness-150 transition-all">
                <div />
            </PanelResizeHandle>
        </>
    )
}
