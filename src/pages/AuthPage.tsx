import { useEffect, useRef, useState } from "react";
import SignupForm from "../components/auth/SignupForm";
import LoginForm from "../components/auth/LoginForm";
import AuthVisual from "../components/auth/AuthVisual";

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const previousMode = useRef(isSignUp);

  useEffect(() => {
    if (previousMode.current === isSignUp) return;
    previousMode.current = isSignUp;
    formRef.current?.querySelector<HTMLElement>('[data-auth-active="true"] input')?.focus();
  }, [isSignUp]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-app-bg p-4 sm:p-8">
      <div className="auth-shell relative flex w-full max-w-5xl overflow-hidden rounded-2xl border-app-line bg-app-bg md:rounded-4xl md:border md:bg-app-panel md:shadow-panel">
        {/* One instance of each form, independent of viewport size. Inactive forms are hidden and inert; drafts survive switching. */}
        <div ref={formRef} className={`relative min-w-0 w-full md:w-1/2 ${isSignUp ? "md:ml-auto" : "md:mr-auto"}`}>
          <div className="flex min-h-full items-center justify-center p-3 sm:p-6 md:p-8 xl:p-12">
            <div className="w-full min-w-0">
              <div hidden={isSignUp} inert={isSignUp} data-auth-active={!isSignUp}><LoginForm setIsSignUp={setIsSignUp} /></div>
              <div hidden={!isSignUp} inert={!isSignUp} data-auth-active={isSignUp}><SignupForm setIsSignUp={setIsSignUp} /></div>
            </div>
          </div>
        </div>
        <AuthVisual isSignUp={isSignUp} setIsSignUp={setIsSignUp} />
      </div>
    </main>
  );
};

export default AuthPage;
