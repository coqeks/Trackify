import apiClient from "./apiClient"

export interface User {
    id: number;
    email: string;
    full_name: string;
    is_active: boolean;
    created_at: Date;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export const read_user = async () => {
    console.log("Reading user")
    const data = await apiClient.get<User>("/auth/me");
    return data;
};

export const login = async (formData) => {
    try {
        const data = await apiClient.post<AuthResponse>("/auth/login", formData);
        return data;
    } catch (error) {
        console.log(error.detail)
    }
}

export const signup = async (formData) => {
    try {
        const data = await apiClient.post<AuthResponse>("/auth/signup", formData);
        return data;
    } catch (error) {
        console.log(error.status)
        throw error
    }
}