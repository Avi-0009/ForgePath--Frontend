import { useState } from "react";
import { User, Lock, ArrowRight, Eye, EyeOff, Hammer } from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import { z } from "zod";
import toast from "react-hot-toast";
import { Login } from "../../Api/Auth";
import { getApiError } from "../../utils/apiError";
import { useAuthStore } from "../../store/useAuthStore";

interface LoginFormProps {
  setIsSignUp: (val: boolean) => void;
}

// Zod schemas for Login
const identifierSchema = z.string().min(1, "Username or email is required.");
const passwordSchema = z.string().min(1, "Password is required.");

const LoginForm = ({ setIsSignUp }: LoginFormProps) => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const idVal = identifierSchema.safeParse(identifier);
    if (!idVal.success) return setFormError(idVal.error.issues[0].message);

    const passVal = passwordSchema.safeParse(password);
    if (!passVal.success) return setFormError(passVal.error.issues[0].message);

    try {
      setIsSubmitting(true);
      const data: any = await Login(identifier, password);
      
      // Pass the user object and token to your auth store
      login(
        {
          id: data.user?.id || "user-1",
          name: data.user?.name || identifier,
          email: data.user?.email || identifier,
          avatar: data.user?.avatar || data.user?.name?.substring(0, 2).toUpperCase() || "FP",
        },
        data.token
      );

      toast.success("Signed in successfully!");
      navigate("/");
    } catch (err) {
      const msg = await getApiError(err, "Invalid credentials.");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">

      <div className="flex md:hidden items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-app-accent text-app-accent-ink grid place-items-center">
          <Hammer className="w-5 h-5" />
        </div>
        <div className="font-manrope font-extrabold tracking-tight text-app-text">
          ForgePath
        </div>
      </div>

      <div className="mb-8">
        <div className="text-micro tracking-eyebrow uppercase text-app-dim font-bold mb-2">
          WELCOME BACK
        </div>
        <h1 className="font-manrope text-3xl font-extrabold tracking-tight text-app-text mb-2">
          Sign in
        </h1>
        <p className="text-app-muted text-sm">
          Access your workspace, investigations, and patches.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="form-label hidden" htmlFor="login-identifier">
            Username or Email
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
            <input
              id="login-identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.trim())}
              placeholder="Username or Email"
              className="input pl-10 pr-3"
            />
          </div>
        </div>

        <div>
          <label className="form-label hidden" htmlFor="login-password">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={32}
              placeholder="Your password"
              className="input pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-app-dim hover:text-app-text transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => toast("Password reset coming soon.")}
            className="text-xs font-medium text-app-muted hover:text-app-accent transition-colors"
          >
            Forgot password?
          </button>
        </div>

        {formError && (
          <div className="text-status-red text-xs font-medium px-1">
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full h-11 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-4 text-center text-sm text-app-muted md:hidden">
        <div>
          Don&apos;t have an account?{" "}
          <button
            onClick={() => setIsSignUp(true)}
            className="text-app-accent font-semibold hover:underline underline-offset-4"
          >
            Sign up
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-app-dim">
          <span className="h-px w-8 bg-app-line"></span>
          <span className="text-xs uppercase tracking-widest font-bold">OR</span>
          <span className="h-px w-8 bg-app-line"></span>
        </div>

        <NavLink 
          to="/" 
          className="font-medium text-app-text hover:text-app-accent transition-colors"
        >
          Explore workspace as guest →
        </NavLink>
      </div>
    </div>
  );
};

export default LoginForm;