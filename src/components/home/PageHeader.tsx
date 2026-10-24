import { FolderGit, Plus, LogIn } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const PageHeader = () => {
  const { isAuthenticated, user } = useAuthStore();
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  return (
    <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-7">
      <div className="flex-1 max-w-3xl">
        <div className="text-micro tracking-eyebrow uppercase text-app-dim font-bold mb-1">
          {currentDate}
        </div>
        <h1 className="font-manrope text-2xl sm:text-3xl font-extrabold tracking-tight text-app-text m-0 mb-1.5">
          {isAuthenticated ? `Welcome back, ${user?.name?.split(' ')[0]}.` : "Your engineering command center."}
        </h1>
        <p className="text-xs sm:text-sm text-app-muted m-0 leading-relaxed">
          Understand a codebase, investigate a bug, and review every proposed change before anything touches your repository.
        </p>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        {!isAuthenticated ? (
          <NavLink to="/auth" className="btn btn-primary">
            <LogIn size={14} />
            Sign in to Workspace
          </NavLink>
        ) : (
          <>
            <button className="btn btn-ghost">
              <FolderGit size={14}/>
              Repositories
            </button>
            <button className="btn btn-primary">
              <Plus size={14} />
              Create task
            </button>
          </>
        )}
      </div>
    </section>
  );
};

export default PageHeader;