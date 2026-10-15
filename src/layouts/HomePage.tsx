import PageHeader from "../components/home/PageHeader"

const HomePage = () => {
  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans">
        <div className="max-w-app mx-auto px-4 sm:px-6 md:px-9 py-6 sm:py-8 pb-16">
            <PageHeader/>
        </div>
    </div>
  )
}

export default HomePage