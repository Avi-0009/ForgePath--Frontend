import { Search, ArrowLeftRight, ListChecks, ArrowRight, ArrowUpRight } from "lucide-react"

const QuickNavigation = () => {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-manrope text-base sm:text-lg font-bold tracking-tight text-app-text m-0">
            Continue building
          </h2>
          <div className="text-2xs text-app-muted mt-0.5">Jump into an engineering surface</div>
        </div>
        <button className="btn btn-ghost min-h-7.5! px-2.5! py-1! text-2xs!">
          12-chunk roadmap
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 bg-app-panel text-app-text border border-app-line rounded-xl hover:border-app-accent-line-hover hover:bg-app-accent-soft-hover transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-lg border border-app-line bg-app-icon-bg grid place-items-center mb-3">
            <Search size={14} />
          </div>
          <strong className="block text-xs font-semibold mb-1">Ask your codebase</strong>
          <p className="text-2xs text-app-muted m-0 leading-relaxed">
            Search indexed source, retrieve evidence, and get grounded explanations.
          </p>
          <span className="mt-3 text-app-accent text-2xs font-bold inline-flex items-center gap-1">
            Open code intelligence
            <ArrowUpRight size={12} />
          </span>
        </div>

        <div className="p-4 bg-app-panel text-app-text border border-app-line rounded-xl hover:border-app-accent-line-hover hover:bg-app-accent-soft-hover transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-lg border border-app-line bg-app-icon-bg grid place-items-center mb-3">
            <ArrowLeftRight size={14} />
          </div>
          <strong className="block text-xs font-semibold mb-1">Review a patch</strong>
          <p className="text-2xs text-app-muted m-0 leading-relaxed">
            Inspect precise changes, file context, and risk before approval.
          </p>
          <span className="mt-3 text-app-accent text-2xs font-bold inline-flex items-center gap-1">
            Open patch review
            <ArrowUpRight size={12} />
          </span>
        </div>

        <div className="p-4 bg-app-panel text-app-text border border-app-line rounded-xl hover:border-app-accent-line-hover hover:bg-app-accent-soft-hover transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-lg border border-app-line bg-app-icon-bg grid place-items-center mb-3">
            <ListChecks size={14} />
          </div>
          <strong className="block text-xs font-semibold mb-1">Inspect test results</strong>
          <p className="text-2xs text-app-muted m-0 leading-relaxed">
            Explore sandbox output, failures, and bounded retry history.
          </p>
          <span className="mt-3 text-app-accent text-2xs font-bold inline-flex items-center gap-1">
            Open test lab
            <ArrowUpRight size={12} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default QuickNavigation