import { useState } from "react";
import SignupForm from "../components/auth/SignupForm";
import LoginForm from "../components/auth/LoginForm";
import AuthVisual from "../components/auth/AuthVisual";

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4 sm:p-8">
      <div className="auth-shell relative w-full max-w-5xl bg-app-bg md:bg-app-panel rounded-2xl md:rounded-4xl overflow-hidden md:border border-app-line md:shadow-panel flex">

        {/* Mobile: crossfading forms */}
        <div className="w-full h-full relative md:hidden z-10">
          <div
            className={`absolute inset-0 overflow-y-auto transition-all duration-500 ${
              isSignUp
                ? "opacity-0 translate-y-4 pointer-events-none"
                : "opacity-100 translate-y-0"
            }`}
          >
            <div className="min-h-full flex items-center justify-center p-6">
              <LoginForm setIsSignUp={setIsSignUp} />
            </div>
          </div>
          <div
            className={`absolute inset-0 overflow-y-auto transition-all duration-500 ${
              !isSignUp
                ? "opacity-0 translate-y-4 pointer-events-none"
                : "opacity-100 translate-y-0"
            }`}
          >
            <div className="min-h-full flex items-center justify-center p-6">
              <SignupForm setIsSignUp={setIsSignUp} />
            </div>
          </div>
        </div>

        {/* Desktop: left login */}
        <div className="hidden md:block absolute top-0 left-0 w-1/2 h-full z-10 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-12">
            <div
              className={`w-full transition-all duration-500 delay-100 ${
                isSignUp
                  ? "opacity-0 -translate-x-8 pointer-events-none"
                  : "opacity-100 translate-x-0"
              }`}
            >
              <LoginForm setIsSignUp={setIsSignUp} />
            </div>
          </div>
        </div>

        {/* Desktop: right signup */}
        <div className="hidden md:block absolute top-0 right-0 w-1/2 h-full z-10 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-12">
            <div
              className={`w-full transition-all duration-500 delay-100 ${
                !isSignUp
                  ? "opacity-0 translate-x-8 pointer-events-none"
                  : "opacity-100 translate-x-0"
              }`}
            >
              <SignupForm setIsSignUp={setIsSignUp} />
            </div>
          </div>
        </div>

        <AuthVisual isSignUp={isSignUp} setIsSignUp={setIsSignUp} />
      </div>
    </div>
  );
};

export default AuthPage;