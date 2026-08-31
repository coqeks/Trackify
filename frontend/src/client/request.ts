import apiClient from "./apiClient"

export interface User {
    id: number;
    email: string;
    full_name: string;
    is_active: boolean;
    created_at: Date;
    tracks_saved: number;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface CloudResponse {
    signed_url: string;
    s3_key: string;
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

export const get_purl = async () => {
    try {
        const response = await apiClient.get<CloudResponse>("/audio/upload");
        return response;
    } catch (error) {
        throw error;
    }
}

export const request_separation = async (payload: {target: string[], s3_key: string}) => {
    try {
        const response = await apiClient.post("/audio", payload);
        return response;
    } catch (error) {
        throw error;
    }
}

export const poll_progress = async (task_id: string, setProgress: any) => {
    while (true) {
        const response = await apiClient.get("/audio/" + task_id);
        if (response["Status"] == "SUCCESS") {
            console.log("Separation task finished.")
            setProgress("SUCCESS")
            return response
        } else if (response["Status"] == "FAILURE") {
            console.log("Separation task failed.")
            setProgress("FAILURE")
            return 1 
        } else if (response["Status"] == "CANCELLED") {
            console.log("Task cancelled successfully.")
            setProgress("CANCELLED")
            return "CANCELLED"
        } else {
            setProgress(response["Status"])
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

export const cancel_progress = async (task_id: string) => {
    await apiClient.delete("/audio/" + task_id);
}

export const save_track = async (title: string, cloud_key: string) => {
    const payload = { title, cloud_key }
    return await apiClient.post("/audio/save", payload)
}