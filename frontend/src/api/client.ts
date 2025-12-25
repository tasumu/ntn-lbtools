import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

// Prefer configured API base; if it would cause mixed-content (http on https page), fall back to same-origin relative.
const envBase = import.meta.env.VITE_API_BASE_URL;
const isBrowser = typeof window !== "undefined";
const pageOrigin = isBrowser ? window.location.origin : "";
let baseURL = envBase ?? "/api/v1";
if (isBrowser && envBase && envBase.startsWith("http://") && window.location.protocol === "https:") {
  // Avoid browser blocking on mixed content.
  baseURL = `${pageOrigin}/api/v1`;
}

const client: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Surface API errors in a consistent shape
    if (error.response?.data) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
);

export const apiClient = client;

export const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response = await apiClient.request<T>(config);
  return response.data;
};
