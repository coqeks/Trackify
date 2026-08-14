import { toast } from "sonner"

export const useToast = () => {
    const showError = (description: string) => {
        toast.error("Error: ", {
            description
        })
    } 

    const showSuccess = (description: string) => {
        toast.success("Success!", {
            description
        })
    }

    return { showError, showSuccess }
}

