import { Info } from "lucide-react"

interface CalloutBannerProps {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode
}

const CalloutBanner: React.FC<CalloutBannerProps> = ({ icon, title, children }) => {
  return (
    <div className="p-3.5 px-4 border border-callout-line bg-callout-bg rounded-callout flex items-start gap-3 text-xs text-callout-text mb-5">
      <span className="leading-none mt-0.5 shrink-0">
        {icon ?? <Info size={14} />}
      </span>
      <div>
        <strong className="text-callout-strong font-semibold">{title}</strong> {children}
      </div>
    </div>
  );
}

export default CalloutBanner