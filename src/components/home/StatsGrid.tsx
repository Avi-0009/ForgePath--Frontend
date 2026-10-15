import { TrendingUp, FolderGit2, Target, Check } from "lucide-react"

const StatsGrid = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
      <article className="p-4 sm:p-5 bg-app-panel border border-app-line rounded-panel shadow-panel">
        <div className="flex items-center justify-between gap-2 text-app-muted text-xs">
          <span>Active tasks</span>
          <span className="w-7 h-7 bg-app-mark-bg rounded-lg grid place-items-center text-app-mark-text">
            <TrendingUp size={14} />
          </span>
        </div>
        <div className="font-manrope text-2xl sm:text-3xl font-extrabold tracking-tight my-2">02</div>
        <div className="text-micro text-app-muted">
          <span className="text-status-green font-medium">+1</span> started this week
        </div>
      </article>

      <article className="p-4 sm:p-5 bg-app-panel border border-app-line rounded-panel shadow-panel">
        <div className="flex items-center justify-between gap-2 text-app-muted text-xs">
          <span>Indexed codebases</span>
          <span className="w-7 h-7 bg-app-mark-bg rounded-lg grid place-items-center text-app-mark-text">
            <FolderGit2 size={14} />
          </span>
        </div>
        <div className="font-manrope text-2xl sm:text-3xl font-extrabold tracking-tight my-2">03</div>
        <div className="text-micro text-app-muted">1,284 source files searchable</div>
      </article>

      <article className="p-4 sm:p-5 bg-app-panel border border-app-line rounded-panel shadow-panel">
        <div className="flex items-center justify-between gap-2 text-app-muted text-xs">
          <span>Open findings</span>
          <span className="w-7 h-7 bg-app-mark-bg rounded-lg grid place-items-center text-app-mark-text">
            <Target size={14} />
          </span>
        </div>
        <div className="font-manrope text-2xl sm:text-3xl font-extrabold tracking-tight my-2">07</div>
        <div className="text-micro text-app-muted">2 high · 3 medium · 2 low</div>
      </article>

      <article className="p-4 sm:p-5 bg-app-panel border border-app-line rounded-panel shadow-panel">
        <div className="flex items-center justify-between gap-2 text-app-muted text-xs">
          <span>Tests in last run</span>
          <span className="w-7 h-7 bg-app-mark-bg rounded-lg grid place-items-center text-app-mark-text">
            <Check size={14} />
          </span>
        </div>
        <div className="font-manrope text-2xl sm:text-3xl font-extrabold tracking-tight my-2">
          42<span className="text-sm font-normal text-app-text-faint">/45</span>
        </div>
        <div className="text-micro text-app-muted">
          <span className="text-status-green font-medium">93.3%</span> passed · 3 need review
        </div>
      </article>
    </div>
  );
}

export default StatsGrid