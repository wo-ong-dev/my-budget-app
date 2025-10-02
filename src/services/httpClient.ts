import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

const httpClient = axios.create({
  baseURL,
  timeout: 5000, // 5초로 단축
  headers: {
    "Content-Type": "application/json",
  },
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error) {
      return Promise.reject(new Error(error.response.data.error));
    }
    if (error.message) {
      return Promise.reject(new Error(error.message));
    }
    return Promise.reject(new Error("알 수 없는 오류가 발생했어요."));
  }
);

export default httpClient;
