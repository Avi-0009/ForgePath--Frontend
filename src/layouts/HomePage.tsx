import AgentActivity from "../components/home/AgentActivity"
import CalloutBanner from "../components/home/CalloutBanner"
import PageHeader from "../components/home/PageHeader"
import QuickNavigation from "../components/home/QuickNavigation"
import RecentTasks from "../components/home/RecentTasks"
import StatsGrid from "../components/home/StatsGrid"

const HomePage = () => {
  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans">
        <div className="max-w-app mx-auto px-4 sm:px-6 md:px-9 py-6 sm:py-8 pb-16">
            <PageHeader/>

            <CalloutBanner title="Safe by default.">
              Runs are isolated; patches are proposals until you approve them. ForgePath is configured for local access only.
            </CalloutBanner>

            <StatsGrid/>

            <div className="grid grid-cols-1 lg:grid-cols-home gap-3.5 items-start mb-6">
              <RecentTasks />
              <AgentActivity />
            </div>

            <QuickNavigation />
        </div>
    </div>
  )
}

export default HomePage