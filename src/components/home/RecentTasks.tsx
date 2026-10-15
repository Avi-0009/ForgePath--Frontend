import { ArrowRight } from "lucide-react"

const RecentTasks = () => {
  return (
    <article className="bg-app-panel border border-app-line rounded-panel shadow-panel overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 px-5 border-b border-app-line">
        <div>
          <div className="text-xs font-bold text-app-text">Recent tasks</div>
          <div className="text-2xs text-app-muted mt-0.5">Your latest investigations and patch runs</div>
        </div>
        <button className="btn min-h-7.5! px-2.5! py-1.5! text-2xs!">
          View all
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
          <thead>
            <tr className="border-b border-app-line text-app-table-head text-micro uppercase tracking-wider font-bold">
              <th className="py-3 px-4">Task</th>
              <th className="py-3 px-4">Repository</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-line-soft">
            <tr className="hover:bg-app-row-hover cursor-pointer transition-colors">
              <td className="py-3.5 px-4">
                <strong className="block text-app-text font-semibold">Prevent duplicate session refresh</strong>
                <div className="text-2xs text-app-muted">DP-024 · bug fix</div>
              </td>
              <td className="py-3.5 px-4 font-mono text-xs text-app-mono-text">instantwicket-backend</td>
              <td className="py-3.5 px-4">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-status-amber-line bg-status-amber-bg text-status-amber rounded-md text-micro">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-amber"></span>
                  Needs approval
                </span>
              </td>
              <td className="py-3.5 px-4 text-app-muted text-xs">4 min ago</td>
            </tr>

            <tr className="hover:bg-app-row-hover cursor-pointer transition-colors">
              <td className="py-3.5 px-4">
                <strong className="block text-app-text font-semibold">Audit auth middleware</strong>
                <div className="text-2xs text-app-muted">DP-023 · investigation</div>
              </td>
              <td className="py-3.5 px-4 font-mono text-xs text-app-mono-text">instantwicket-backend</td>
              <td className="py-3.5 px-4">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-status-blue-line bg-status-blue-bg text-status-blue rounded-md text-micro">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-blue"></span>
                  Investigated
                </span>
              </td>
              <td className="py-3.5 px-4 text-app-muted text-xs">1 hr ago</td>
            </tr>

            <tr className="hover:bg-app-row-hover cursor-pointer transition-colors">
              <td className="py-3.5 px-4">
                <strong className="block text-app-text font-semibold">Add edge-case test coverage</strong>
                <div className="text-2xs text-app-muted">DP-022 · testing</div>
              </td>
              <td className="py-3.5 px-4 font-mono text-xs text-app-mono-text">langGraph</td>
              <td className="py-3.5 px-4">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-status-green-line bg-status-green-bg text-status-green rounded-md text-micro">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-green"></span>
                  Completed
                </span>
              </td>
              <td className="py-3.5 px-4 text-app-muted text-xs">Yesterday</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default RecentTasks