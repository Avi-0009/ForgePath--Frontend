import { useState } from "react";
import { z } from "zod";
import { NavLink, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Mail, Key, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { RequestPasswordReset, ResetPassword } from "../Api/Auth";

const emailSchema = z.string().email("Invalid email format");
const resetSchema = z.object({
  otp: z.string().min(4, "OTP is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const ForgotPasswordPage = () => {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      await RequestPasswordReset(email);
      setStep("reset");
    } catch (err: any) {
      setError("Failed to send OTP. Please verify the email address.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = resetSchema.safeParse({ otp, newPassword });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      await ResetPassword(email, otp, newPassword);
      navigate("/auth", { replace: true });
    } catch (err: any) {
      setError("Invalid OTP or server error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex items-start justify-center pt-[15vh] sm:p-8 p-6">
      <div className="w-full max-w-md mx-auto">
        
        {step === "request" ? (
          <NavLink to="/auth" className="inline-flex items-center gap-2 text-sm font-medium text-app-muted hover:text-app-text transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </NavLink>
        ) : (
          <button onClick={() => setStep("request")} className="inline-flex items-center gap-2 text-sm font-medium text-app-muted hover:text-app-text transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Change email
          </button>
        )}

        <div className="mb-8">
          <div className="text-micro tracking-eyebrow uppercase text-app-dim font-bold mb-2">
            {step === "request" ? "Account Recovery" : "Verification"}
          </div>
          <h1 className="font-manrope text-3xl font-extrabold tracking-tight text-app-text mb-3">
            {step === "request" ? "Reset password" : "Secure your account"}
          </h1>
          <p className="text-app-muted text-sm leading-relaxed">
            {step === "request" 
              ? "Enter your account email to receive a secure verification code." 
              : <>We sent a code to <span className="font-semibold text-app-text">{email}</span>. Enter it below with your new password.</>}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 text-sm font-medium text-status-red bg-status-red/10 rounded-lg border border-status-red/20">
            {error}
          </div>
        )}

        {step === "request" && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-app-dim uppercase tracking-wider mb-2 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 bg-[#1c2124] border border-app-line rounded-xl text-app-text focus:outline-none focus:border-app-accent transition-all shadow-sm"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <button type="submit" disabled={isLoading} className="w-full btn btn-primary h-12 flex justify-center items-center gap-2 mt-2 disabled:opacity-60 text-base font-semibold">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Verification Code"}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-app-dim uppercase tracking-wider mb-2 block">
                6-Digit OTP Code
              </label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
                <input
                  type="text"
                  maxLength={6}
                  className="w-full pl-12 pr-4 py-3 bg-[#1c2124] border border-app-line rounded-xl text-app-text focus:outline-none focus:border-app-accent transition-all tracking-[0.5em] font-mono text-lg font-bold shadow-sm"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-app-dim uppercase tracking-wider mb-2 block">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-12 pr-12 py-3 bg-[#1c2124] border border-app-line rounded-xl text-app-text focus:outline-none focus:border-app-accent transition-all shadow-sm"
                  placeholder="Create a strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-app-dim hover:text-app-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full btn btn-primary h-12 flex justify-center items-center gap-2 mt-4 disabled:opacity-60 text-base font-semibold">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Secure Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        <div className="mt-10 flex flex-col items-center gap-5 text-center text-sm text-app-muted">
          <div className="flex items-center justify-center gap-3 text-app-dim w-full">
            <span className="h-px flex-1 max-w-10 bg-app-line"></span>
            <span className="text-xs uppercase tracking-widest font-bold">OR</span>
            <span className="h-px flex-1 max-w-10 bg-app-line"></span>
          </div>

          <NavLink 
            to="/" 
            className="font-medium text-app-text hover:text-app-accent transition-colors flex items-center gap-1"
          >
            Explore workspace as guest <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;