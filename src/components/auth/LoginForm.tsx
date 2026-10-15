import { useState } from "react";
import { Phone, Lock, ArrowRight, Eye, EyeOff, Hammer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface LoginFormProps {
  setIsSignUp: (val: boolean) => void;
}

const LoginForm = ({ setIsSignUp }: LoginFormProps) => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.startsWith("0")) val = val.slice(1);
    if (val.length > 10) val = val.slice(0, 10);
    setPhone(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      toast.error("Phone number must be 10 digits.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Signed in (demo).");
      navigate("/");
    }, 700);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Mobile-only brand */}
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
          <label className="form-label" htmlFor="login-phone">
            Phone number
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
            <input
              id="login-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="10-digit phone number"
              className="input pl-10 pr-3"
            />
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="login-password">
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
              maxLength={16}
              placeholder="Your password"
              className="input pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-app-dim hover:text-app-text transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => toast("Password reset is not wired up yet.")}
            className="text-xs font-medium text-app-muted hover:text-app-accent transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full h-11 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Mobile-only switch to signup */}
      <div className="mt-6 text-center text-sm text-app-muted md:hidden">
        Don&apos;t have an account?{" "}
        <button
          onClick={() => setIsSignUp(true)}
          className="text-app-accent font-semibold hover:underline underline-offset-4"
        >
          Sign up
        </button>
      </div>
    </div>
  );
};

export default LoginForm;