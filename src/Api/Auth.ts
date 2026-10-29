import ky from "ky";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
).replace(/\/+$/, "");

export const apiClient = ky.create({
  prefix: API_BASE_URL,
  credentials: "include",
  retry: 0,
  timeout: 20_000,
});

export interface UserResponse {
  id: string;
  full_name: string;
  username: string;
  email: string;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  user: UserResponse;
}

export const Register = async (
  fullName: string,
  username: string,
  email: string,
  password: string,
): Promise<UserResponse> => {
  return apiClient
    .post("auth/signup", {
      json: {
        full_name: fullName,
        username,
        email,
        password,
      },
    })
    .json<UserResponse>();
};

export const Login = async (
  usernameOrEmail: string,
  password: string,
): Promise<LoginResponse> => {
  return apiClient
    .post("auth/login", {
      json: {
        identifier: usernameOrEmail,
        password,
      },
    })
    .json<LoginResponse>();
};

export const Logout = async () : Promise<void> => {
  await apiClient.post("auth/logout");
};

export const RequestPasswordReset = async (email: string) => {
  return apiClient
    .post("auth/forgot-password", {
      json: {email},
    })
    .json();
}

export const ResetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  return apiClient
    .post("auth/reset-password", {
      json: {
        email, 
        otp,
        new_password: newPassword,
      },
    })
    .json();
}

export const RequestEmailVerification = async (token: string) => {
  return apiClient
    .post("auth/email-verification/request", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .json();
};

export const VerifyEmailOtp = async (token: string, otp: string) => {
  return apiClient
    .post("auth/email-verification/verify", {
      headers: {
        Authorization: `Bearer ${token}`
      },
      json: { otp }
    })
    .json();
};

export const UpdateProfile = async (
  token: string,
  data: { name: string; username: string; email: string },
) => {
  const response = await fetch("auth/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update profile");
  }

  return response.json();
};