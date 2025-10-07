import axios from "axios";

// Force API base to same-origin '/api' so that Nginx can proxy to backend (127.0.0.1:8080)
// This avoids accidental leakage of build-time hosts/ports (e.g., :8080) into the client bundle.
const baseURL = "/api";

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
