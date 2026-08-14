import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query" 
import { useNavigate } from "@tanstack/react-router"
import { useToast } from "./useToast"
import { API, type ApiError } from "../client/apiClient"

import {
    read_user,
    login as loginRequest,
    signup as signupRequest
} from "../client/request"

export const isLoggedIn = () => {
    return localStorage.getItem("access_token") !== null
}

const useAuth = () => {

    const navigate = useNavigate()
    const { showError, showSuccess } = useToast()

    const { data: user } = useQuery({
        queryKey: ["currentUser"],
        queryFn: read_user,
        enabled: isLoggedIn(),
    });

    const login = async (data) => {
        const response = await loginRequest(data) 
        localStorage.setItem("access_token", response.access_token)
        API.TOKEN = response.access_token
    }

    const loginMutation = useMutation({
        mutationFn: login,
        onSuccess: () => {
            console.log("Success login")
            navigate({to: "/"})
        },
        onError: () => {
            console.log("Mutation failed")
        }
    })

    const signup = async (data) => {
        const response = await signupRequest(data)
        localStorage.setItem("access_token", response.access_token)
        API.TOKEN = response.access_token
    }

    const signupMutation = useMutation<any, ApiError>({
        mutationFn: signup,
        onSuccess: () => {
            console.log("Success signup")
            navigate({to: "/login"})
        },
        onError: (error) => {
            console.log(`Status: ${error.status}`)
            showError(error.message)
        }
    })

    const logout = () => {
        localStorage.removeItem("access_token")
        API.TOKEN = ""
        navigate({to: "/login"})
    }

    return {
        loginMutation,
        signupMutation,
        logout,
        user,
    }
}

export default useAuth