import { useState } from "react";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Hammer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import toast from "react-hot-toast";

interface SignupFormProps {
  setIsSignUp: (val: boolean) => void;
}

/*  Zod schema  */

const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .max(16, "Password cannot exceed 16 characters."),
});

/*  Component  */

const SignupForm = ({ setIsSignUp }: SignupFormProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = signupSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    // TODO: replace with real backend call
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Account created (demo). Sign in to continue.");
      setIsSignUp(false);
      navigate("/auth");
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
          GET STARTED
        </div>
        <h1 className="font-manrope text-3xl font-extrabold tracking-tight text-app-text mb-2">
          Create your account
        </h1>
        <p className="text-app-muted text-sm">
          Local-only workspace. Nothing leaves your device.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="form-label" htmlFor="signup-email">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input pl-10 pr-3"
            />
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="signup-password">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={16}
              placeholder="At least 6 characters"
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

        {error && (
          <div className="text-status-red text-xs font-medium px-1">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full h-11 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-app-muted md:hidden">
        Already have an account?{" "}
        <button
          onClick={() => setIsSignUp(false)}
          className="text-app-accent font-semibold hover:underline underline-offset-4"
        >
          Sign in
        </button>
      </div>
    </div>
  );
};

export default SignupForm;