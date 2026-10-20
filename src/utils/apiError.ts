import { HTTPError } from "ky";

export const getApiError = async (error: unknown, defaultMessage: string = "An unexpected error occurred"): Promise<string> => {
    if(error instanceof HTTPError){
        try {
            const errorData = await error.response.json();
            return errorData.detail || defaultMessage
        } catch {
            return defaultMessage
        }
    }

    if(error instanceof Error){
        return error.message
    }

    return defaultMessage
}