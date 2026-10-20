import ky from "ky"

const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

const apiClient = ky.create({
    prefix: API_BASE_URL,
})

export const Register = async (name: string, email: string, password: string) => {

    const response = await apiClient.post('auth/register', {
        json: {name, email, password}
    }).json();

    return response
}

export const Login = async (usernameOrEmail: string, password: string) => {
    const formdata = new URLSearchParams();
    formdata.append('username', usernameOrEmail);
    formdata.append('password', password);
    const response = await apiClient.post('auth/login', {
        body: formdata,
    }).json();

    return response
}