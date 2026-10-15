import { Check, Activity, Diamond } from "lucide-react"

const AgentActivity = () => {
  return (
    <article className="bg-app-panel border border-app-line rounded-panel shadow-panel flex flex-col">
      <div className="flex items-center justify-between p-4 px-5 border-b border-app-line">
        <div>
          <div className="text-xs font-bold text-app-text">Agent activity</div>
          <div className="text-2xs text-app-muted mt-0.5">Latest events across tasks</div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-status-green-line bg-status-green-bg text-status-green rounded-md text-micro">
          <span className="w-1.5 h-1.5 rounded-full bg-status-green"></span>
          Live preview
        </span>
      </div>

      <div className="p-4 px-5 flex flex-col divide-y divide-app-line-faint">
        <div className="flex items-start gap-3 py-3 first:pt-0">
          <div className="w-7 h-7 rounded-lg bg-app-icon-bg2 text-status-green grid place-items-center shrink-0 mt-0.5">
            <Check size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <strong className="block text-xs font-semibold text-app-text">Repository index refreshed</strong>
            <p className="text-2xs text-app-muted m-0 mt-0.5">1,284 files · 9,817 chunks embedded</p>
            <time className="block text-micro text-app-dim2 mt-1">Today, 13:18</time>
          </div>
        </div>

        <div className="flex items-start gap-3 py-3">
          <div className="w-7 h-7 rounded-lg bg-app-icon-bg2 text-status-green grid place-items-center shrink-0 mt-0.5">
            <Activity size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <strong className="block text-xs font-semibold text-app-text">Investigator found 2 related files</strong>
            <p className="text-2xs text-app-muted m-0 mt-0.5 font-mono">auth/middleware.go · session/store.go</p>
            <time className="block text-micro text-app-dim2 mt-1">Today, 13:16</time>
          </div>
        </div>

        <div className="flex items-start gap-3 py-3 last:pb-0">
          <div className="w-7 h-7 rounded-lg bg-app-icon-bg2 text-status-green grid place-items-center shrink-0 mt-0.5">
            <Diamond size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <strong className="block text-xs font-semibold text-app-text">Patch waiting for your review</strong>
            <p className="text-2xs text-app-muted m-0 mt-0.5">1 file changed · no writes to main branch</p>
            <time className="block text-micro text-app-dim2 mt-1">Today, 13:14</time>
          </div>
        </div>
      </div>
    </article>
  );
}

export default AgentActivity