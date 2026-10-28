import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { Check, X, Loader2 } from 'lucide-react';

interface DiffViewerProps {
  originalCode: string;
  newCode: string;
  onApprove: () => void;
  onReject: () => void;
  isApplying?: boolean;
}

const DiffViewer = ({ originalCode, newCode, onApprove, onReject, isApplying }: DiffViewerProps) => {
  const customStyles = {
    variables: {
      dark: {
        diffViewerBackground: 'var(--diff-bg)',
        diffViewerColor: 'var(--diff-text)',
        addedBackground: 'var(--diff-added-bg)',
        addedColor: 'var(--diff-added-text)',
        removedBackground: 'var(--diff-removed-bg)',
        removedColor: 'var(--diff-removed-text)',
        wordAddedBackground: 'var(--diff-word-added)',
        wordRemovedBackground: 'var(--diff-word-removed)',
        addedGutterBackground: 'var(--diff-gutter-added)',
        removedGutterBackground: 'var(--diff-gutter-removed)',
        gutterBackground: 'var(--diff-gutter-bg)',
        gutterBackgroundDark: 'var(--diff-gutter-bg)',
        highlightBackground: 'var(--diff-highlight-bg)',
        highlightGutterBackground: 'var(--diff-highlight-bg)',
        codeFoldGutterBackground: 'var(--diff-gutter-bg)',
        codeFoldBackground: 'var(--diff-gutter-bg)',
        emptyLineBackground: 'var(--diff-bg)',
        gutterColor: 'var(--diff-gutter-text)',
        addedGutterColor: 'var(--diff-gutter-text)',
        removedGutterColor: 'var(--diff-gutter-text)',
        codeFoldContentColor: 'var(--diff-gutter-text)',
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-app-panel animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between p-4 border-b border-app-line bg-app-panel2 shrink-0">
        <h3 className="font-bold text-app-text text-sm uppercase tracking-wider">Review Patch</h3>
        <div className="flex gap-3">
          <button 
            onClick={onReject}
            disabled={isApplying}
            className="px-4 py-2 bg-transparent border border-status-red text-status-red hover:bg-status-red/10 flex items-center gap-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4" /> Reject
          </button>
          <button 
            onClick={onApprove}
            disabled={isApplying}
            className="btn btn-primary px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          >
            {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isApplying ? "Applying..." : "Approve & Apply"}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto text-sm">
        <ReactDiffViewer
          oldValue={originalCode}
          newValue={newCode}
          splitView={true}
          useDarkTheme={true}
          styles={customStyles}
          compareMethod={DiffMethod.WORDS}
        />
      </div>
    </div>
  );
};

export default DiffViewer;