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

export interface Track {
    id: number;
    title: string | null;
    local_index: number | null;
    cloud_key: string;
    creator_id: number;
    musical_key: string | null;
    bpm: number | null;
    size_bytes: number | null;
    created_at: string;
}

export interface SeparationResult {
    s3_key: string;
    result_url: string;
    musical_key: string | null;
    bpm: number | null;
}

export type PollOutcome =
    | { status: "SUCCESS"; result: SeparationResult }
    | { status: "FAILURE"; detail: string }
    | { status: "CANCELLED" };

interface TaskStatusResponse extends Partial<SeparationResult> {
    Status: string;
    Detail?: string;
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

export const get_purl = async (file: { file_type: string; file_size: number; duration_seconds: number | null }) => {
    return await apiClient.post<CloudResponse>("/audio/upload", file);
}

export const get_saved_purl = async (cloud_key: string) => {
    return await apiClient.get<CloudResponse>(`/dashboard/saved/purl?cloud_key=${encodeURIComponent(cloud_key)}`);
}

export const request_separation = async (payload: {target: string[], s3_key: string}) => {
    try {
        const response = await apiClient.post<{ Task_ID: string }>("/audio", payload);
        return response;
    } catch (error) {
        throw error;
    }
}

export const poll_progress = async (task_id: string, setProgress: (state: string) => void): Promise<PollOutcome> => {
    while (true) {
        const response = await apiClient.get<TaskStatusResponse>("/audio/" + task_id);
        if (response.Status == "SUCCESS") {
            setProgress("FINISHING")
            return {
                status: "SUCCESS",
                result: {
                    s3_key: response.s3_key!,
                    result_url: response.result_url!,
                    musical_key: response.musical_key ?? null,
                    bpm: response.bpm ?? null,
                },
            }
        } else if (response.Status == "FAILURE") {
            return { status: "FAILURE", detail: response.Detail ?? "Processing failed. Please try again." }
        } else if (response.Status == "CANCELLED") {
            setProgress("CANCELLED")
            return { status: "CANCELLED" }
        } else {
            setProgress(response.Status)
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

export const cancel_progress = async (task_id: string) => {
    await apiClient.delete("/audio/" + task_id);
}

export const save_track = async (title: string, cloud_key: string) => {
    const payload = { title, cloud_key }
    return await apiClient.post<{ Response: string; Track: Track }>("/audio/save", payload)
}

export const get_all_tracks = async () => {
    return await apiClient.get<{ Tracks: Track[] }>("/dashboard")
}

export const delete_track = async (track_id: number) => {
    await apiClient.delete<void>(`/dashboard/tracks/${track_id}`)
}