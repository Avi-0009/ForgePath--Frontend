import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, User, Mail, Loader2, Save, AtSign, Key } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { RequestEmailVerification, VerifyEmailOtp } from "../Api/Auth";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { user, token, updateUser } = useAuthStore();
  
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showOtpVerify, setShowOtpVerify] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername(user.username || "");
      setEmail(user.email || "");
    } else {
      setName("");
      setUsername("");
      setEmail("");
      setShowOtpVerify(false);
      setOtp("");
    }
  }, [user]);

  const getInitials = (name: string) => {
    if (!name) return "FP";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile. Username might be taken.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendVerification = async () => {
    if (!token) return toast.error("Authentication required");
    
    try {
      await RequestEmailVerification(token);
      setShowOtpVerify(true);
      toast.success(`Verification code sent to ${email}`);
    } catch (error) {
      toast.error("Failed to request verification code.");
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return toast.error("Please enter a valid 6-digit OTP");
    if (!token) return toast.error("Authentication required");
    
    setIsVerifying(true);
    try {
      await VerifyEmailOtp(token, otp);

      toast.success("Email verified successfully!");
      setShowOtpVerify(false);
      setOtp("");
      updateUser({ is_email_verified: true } as any);
    } catch (error) {
      toast.error("Invalid verification code or code expired.");
    } finally {
      setIsVerifying(false);
    }
  };

  const isEmailVerified = (user as any)?.is_email_verified === true;
  const hasChanges = name !== user?.name || username !== user?.username;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center pt-[3vh] animate-in fade-in slide-in-from-bottom-2 duration-300 px-6">
      
      <div className="flex items-center justify-center w-full px-4">
        <div className="flex-1 h-px bg-app-line max-w-30"></div>
        <div className="w-24 h-24 shrink-0 rounded-full bg-[#2a3036] border-2 border-app-line flex items-center justify-center text-3xl font-extrabold text-app-accent uppercase shadow-xl mx-6">
          {getInitials(user?.name || "")}
        </div>
        <div className="flex-1 h-px bg-app-line max-w-30"></div>
      </div>

      <div className="text-app-accent font-medium text-lg p-2">
        @{user?.username || "username"}
      </div>
      
      <div className="flex flex-col items-center gap-4 mb-12">
        {isEmailVerified ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Email Verified
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-red/10 border border-status-red/20 text-status-red text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            Unverified Email
          </div>
        )}
      </div>

      <form onSubmit={handleSaveProfile} className="w-full max-w-md space-y-5">
        <div className="space-y-4">
          
          <div>
            <label className="text-xs font-bold text-app-dim uppercase tracking-wider mb-2 block">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1c2124] border border-app-line rounded-xl text-app-text focus:outline-none focus:border-app-accent transition-all shadow-sm"
                placeholder="Your full name"
                disabled={isSubmitting || !user}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-app-dim uppercase tracking-wider">
                Username
              </label>
              <span className="text-micro text-app-muted">Must be unique</span>
            </div>
            <div className="relative">
              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                className="w-full pl-10 pr-4 py-2 bg-[#1c2124] border border-app-line rounded-xl text-app-text focus:outline-none focus:border-app-accent transition-all shadow-sm"
                placeholder="username"
                disabled={isSubmitting || !user}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-app-dim uppercase tracking-wider mb-2 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
              <input
                type="email"
                value={email}
                readOnly
                className="w-full pl-10 pr-4 py-2 bg-[#1c2124]/50 border border-app-line rounded-xl text-app-muted focus:outline-none cursor-not-allowed transition-all shadow-sm"
                placeholder="name@example.com"
              />
            </div>
            
            {!isEmailVerified && !showOtpVerify && user && (
              <div className="mt-2 text-xs text-app-muted flex items-center justify-between px-1 animate-in fade-in duration-200">
                <span>Verification required</span>
                <button 
                  type="button" 
                  onClick={handleSendVerification}
                  className="text-app-accent hover:underline font-medium"
                >
                  Verify Email
                </button>
              </div>
            )}

            {/* OTP Verification Container */}
            {showOtpVerify && (
              <div className="mt-3 p-4 bg-[#141719] border border-app-line rounded-xl animate-in slide-in-from-top-2 fade-in duration-200">
                <label className="text-xs font-bold text-app-dim uppercase tracking-wider mb-2 block">
                  Enter Verification Code
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-dim" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#1c2124] border border-app-line rounded-lg text-app-text focus:outline-none focus:border-app-accent transition-all tracking-[0.25em] font-mono shadow-sm"
                      placeholder="••••••"
                      disabled={isVerifying}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || otp.length < 4}
                    className="btn btn-primary px-4 py-2 flex items-center justify-center disabled:opacity-50 transition-all text-sm font-semibold rounded-lg"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                  </button>
                </div>
                <div className="mt-2 text-micro text-app-muted px-1 flex justify-between">
                  <span>Code sent to your inbox.</span>
                  <button 
                    type="button" 
                    onClick={() => setShowOtpVerify(false)}
                    className="hover:text-app-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-1">
          <button 
            type="submit" 
            disabled={isSubmitting || !hasChanges || !user}
            className="w-full btn btn-primary h-8 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;