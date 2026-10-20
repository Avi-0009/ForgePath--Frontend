import ky from "ky";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

const apiClient = ky.create({
  prefix: API_BASE_URL,
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