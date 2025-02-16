import {Message} from '../types/chat';
import {ClientError, ServerError} from "@/types/error.ts";

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_URL = import.meta.env.VITE_OPENAI_BASE_URL + '/chat/completions';
const MODEL_NAME = import.meta.env.VITE_OPENAI_MODEL_NAME;

// Retry configuration constants
const MAX_RETRIES = 3; // Reduced retries for better user experience
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 5000;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const CLIENT_ERROR_CODES = new Set([400, 401, 403, 404]);


const calculateDelay = (attempt: number, retryAfter?: string): number => {
    if (retryAfter) {
        const delaySeconds = parseInt(retryAfter, 10);
        return isNaN(delaySeconds) ? BASE_DELAY_MS : delaySeconds * 1000;
    }
    const jitterMs = Math.random() * 250; // Reduced jitter for quicker retries
    const exponentialDelayMs = BASE_DELAY_MS * Math.pow(2, attempt);
    return Math.min(exponentialDelayMs + jitterMs, MAX_DELAY_MS);
};


const isNetworkError = (error: Error): boolean => {
    return error instanceof TypeError && error.message.includes('Failed to fetch');
};


export const fetchChatResponse = async (messages: Message[]): Promise<ReadableStream | null> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: messages,
                    stream: true,
                }),
            });

            if (response.ok) {
                return response.body;
            }

            const errorText = await response.text();
            if (CLIENT_ERROR_CODES.has(response.status)) {
                throw new ClientError(response.status, errorText);
            }
            if (!RETRYABLE_STATUS_CODES.has(response.status)) {
                throw new ServerError(response.status, errorText);
            }


            const retryAfter = response.headers.get('Retry-After');
            const delayMs = calculateDelay(attempt, retryAfter || undefined);
            lastError = new Error(`Retryable error (${response.status}): ${errorText}`);

            console.warn(
                `Attempt ${attempt + 1} failed with status ${response.status}, retrying in ${delayMs}ms...`
            );
            await wait(delayMs);


        } catch (error) {
            lastError = error as Error;
            if (isNetworkError(lastError)) {
                console.warn(`Network error detected: ${lastError.message}, retrying...`);
                await wait(calculateDelay(attempt)); // Wait before retrying network errors as well
                continue;
            }

            if (error instanceof ClientError || error instanceof ServerError) {
                console.error(`${error.name} (${error.statusCode}): ${error.message}`);
                throw error; // Re-throw client/server errors to stop retries
            }


            console.error(`Unknown error during API request: ${error}`);
            if (attempt === MAX_RETRIES - 1) break; // Stop retrying after max attempts for unknown errors
            await wait(calculateDelay(attempt));
        }
    }


    console.error(`API request failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message || 'Unknown'}`);
    return null; // Indicate failure after all retries

};


const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));