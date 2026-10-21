import { useState } from "react";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Hammer,
  UserRound,
  AtSign,
} from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import { z } from "zod";
import toast from "react-hot-toast";
import { Register } from "../../Api/Auth";
import { getApiError } from "../../utils/apiError";

interface SignupFormProps {
  setIsSignUp: (val: boolean) => void;
}

// Zod schema
const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required.")
    .max(100, "Full name cannot exceed 100 characters."),

  username: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .pipe(
      z
        .string()
        .min(3, "Username must be at least 3 characters.")
        .max(20, "Username cannot exceed 20 characters.")
        .regex(
          /^[a-z0-9_]+$/,
          "Username can contain lowercase letters, numbers, and underscores only.",
        ),
    ),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Email is too long.")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password cannot exceed 128 characters."),
});

// Components
const SignupForm = ({ setIsSignUp }: SignupFormProps) => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setFormError("");

  const parsed = signupSchema.safeParse({
    fullName,
    username,
    email,
    password,
  });

  if (!parsed.success) {
    setFormError(parsed.error.issues[0]?.message ?? "Invalid signup details.");
    return;
  }

  try {
    setIsSubmitting(true);

    await Register(
      parsed.data.fullName,
      parsed.data.username,
      parsed.data.email,
      parsed.data.password,
    );

    toast.success("Account created successfully!");
    setIsSignUp(false);
    navigate("/auth");
  } catch (err: unknown) {
    const msg = await getApiError(err, "Unable to create your account.");
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
          <label className="form-label" htmlFor="signup-full-name">
            Full name
          </label>

          <div className="relative">
            <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />

            <input
              id="signup-full-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              placeholder="Your full name"
              className="input pl-10 pr-3"
            />
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="signup-username">
            Username
          </label>

          <div className="relative">
            <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />

            <input
              id="signup-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              placeholder="Choose a username"
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