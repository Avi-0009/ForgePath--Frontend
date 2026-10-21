import logo from '../../assets/forgepath.svg';

interface AuthVisualProps {
  isSignUp: boolean;
  setIsSignUp: (val: boolean) => void;
}

const AuthVisual = ({ isSignUp, setIsSignUp }: AuthVisualProps) => {
  return (
    <aside
      className={`hidden md:flex absolute top-0 right-0 w-1/2 h-full bg-app-auth-panel flex-col items-center justify-center text-center p-12 overflow-hidden transition-transform duration-700 ease-in-out z-20 shadow-2xl ${
        isSignUp
          ? "-translate-x-full border-r border-app-line"
          : "translate-x-0 border-l border-app-line"
      }`}
    >
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-app-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-app-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-app-icon-bg border border-app-line grid place-items-center mb-8 text-app-accent">
          <img src={logo} alt="ForgePath Logo" className="w-15 h-15" />
        </div>

        <div className="relative w-full h-35">
          <div
            className={`absolute inset-0 flex flex-col items-center transition-all duration-500 transform ${
              !isSignUp
                ? "opacity-0 translate-y-4 pointer-events-none"
                : "opacity-100 translate-y-0"
            }`}
          >
            <h2 className="font-manrope text-3xl font-extrabold tracking-tight text-app-text mb-4">
              Welcome back, engineer.
            </h2>
            <p className="text-app-muted text-sm leading-relaxed">
              Sign in to pick up your investigations, patch reviews, and test runs.
            </p>
          </div>

          <div
            className={`absolute inset-0 flex flex-col items-center transition-all duration-500 transform ${
              isSignUp
                ? "opacity-0 -translate-y-4 pointer-events-none"
                : "opacity-100 translate-y-0"
            }`}
          >
            <h2 className="font-manrope text-3xl font-extrabold tracking-tight text-app-text mb-4">
              Welcome to ForgePath.
            </h2>
            <p className="text-app-muted text-sm leading-relaxed">
              Understand a codebase, investigate a bug, and review every proposed change before anything touches your repository.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="btn btn-ghost mt-2 px-6"
        >
          {isSignUp ? "Switch to sign in" : "Switch to sign up"}
        </button>
      </div>
    </aside>
  );
};

export default AuthVisual;