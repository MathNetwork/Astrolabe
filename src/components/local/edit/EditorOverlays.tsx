// @ts-nocheck
import { CustomNodeDialog, ResetConfirmDialog, ReloadPromptDialog, ClearCanvasDialog } from '@/components/dialogs/EditorDialogs'

export function EditorOverlays({ ctx }: any) {
    const {
        showCustomNodeDialog,
        setShowCustomNodeDialog,
        customNodeName,
        setCustomNodeName,
        handleCreateCustomNode,
        showResetConfirm,
        setShowResetConfirm,
        confirmResetAllData,
        showReloadPrompt,
        setShowReloadPrompt,
        showClearCanvasDialog,
        setShowClearCanvasDialog,
        canvasNodes,
        selectedNodesToRemove,
        toggleNodeToRemove,
        selectAllNodesToRemove,
        deselectAllNodesToRemove,
        removeSelectedNodes,
        clearAllNodes,
    } = ctx

    return (
        <>
            <CustomNodeDialog
                isOpen={showCustomNodeDialog}
                onClose={() => {
                    setShowCustomNodeDialog(false)
                    setCustomNodeName('')
                }}
                customNodeName={customNodeName}
                setCustomNodeName={setCustomNodeName}
                handleCreateCustomNode={handleCreateCustomNode}
            />

            <ResetConfirmDialog
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                confirmResetAllData={confirmResetAllData}
            />

            <ReloadPromptDialog
                isOpen={showReloadPrompt}
                onClose={() => setShowReloadPrompt(false)}
            />

            <ClearCanvasDialog
                isOpen={showClearCanvasDialog}
                onClose={() => setShowClearCanvasDialog(false)}
                canvasNodes={canvasNodes}
                selectedNodesToRemove={selectedNodesToRemove}
                toggleNodeToRemove={toggleNodeToRemove}
                selectAllNodesToRemove={selectAllNodesToRemove}
                deselectAllNodesToRemove={deselectAllNodesToRemove}
                removeSelectedNodes={removeSelectedNodes}
                clearAllNodes={clearAllNodes}
            />
        </>
    )
}
