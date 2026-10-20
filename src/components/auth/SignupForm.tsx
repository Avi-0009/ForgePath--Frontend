import { useState } from "react";
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, Hammer } from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import { z } from "zod";
import toast from "react-hot-toast";
import { Register } from "../../Api/Auth";
import { getApiError } from "../../utils/apiError";

interface SignupFormProps {
  setIsSignUp: (val: boolean) => void;
}

// Zod schema
const nameSchema = z
  .string()
  .min(3, 'Name must be at least 3 characters.')
  .max(20, 'Name must be at most 20 characters')
  .regex(/^[A-Za-z\s]+$/, 'Name can only contain letter and spaces.');

const emailSchema = z.string().email('Please enter a valid email address.')

const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(32, 'Password must be at most 32 characters')

// Components

const SignupForm = ({ setIsSignUp }: SignupFormProps) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const nameVal = nameSchema.safeParse(name);
    if (!nameVal.success) return setFormError(nameVal.error.issues[0].message);

    const emailVal = emailSchema.safeParse(email);
    if (!emailVal.success) return setFormError(emailVal.error.issues[0].message);

    const passVal = passwordSchema.safeParse(password);
    if (!passVal.success) return setFormError(passVal.error.issues[0].message);

    try {
      setIsSubmitting(true);
      await Register(name, email, password);

      toast.success("Account created! Please sign in.");
      setName("");
      setEmail("");
      setPassword("");

      setTimeout(() => {
        setIsSignUp(false);
      }, 700);
    } catch (err) {
      const msg = await getApiError(err, 'Failed to create account.');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
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
        {/* FIXED: Added missing Name input field */}
        <div>
          <label className="form-label hidden" htmlFor="signup-name">
            Full name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[0-9]/g, ""))}
              placeholder="Your full name"
              className="input pl-10 pr-3"
            />
          </div>
        </div>

        <div>
          <label className="form-label hidden" htmlFor="signup-email">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              placeholder="you@example.com"
              className="input pl-10 pr-3"
            />
          </div>
        </div>

        <div>
          <label className="form-label hidden" htmlFor="signup-password">
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
              maxLength={32}
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
          {isSubmitting ? "Creating account…" : "Create account"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-4 text-center text-sm text-app-muted md:hidden">
        <div>
          Already have an account?{" "}
          <button
            onClick={() => setIsSignUp(false)}
            className="text-app-accent font-semibold hover:underline underline-offset-4"
          >
            Sign in
          </button>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-app-dim">
          <span className="h-px w-8 bg-app-line"></span>
          <span className="text-xs uppercase tracking-widest font-bold">OR</span>
          <span className="h-px w-8 bg-app-line"></span>
        </div>

        {/* Added NavLink for guest routing */}
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

export default SignupForm;