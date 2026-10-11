import axios from "axios";

export const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "https://universyserver.onrender.com",
  headers: {
    "X-App-ID": import.meta.env.VITE_APP_ID || "cyber-tech",
  },
});

apiClient.interceptors.request.use((config) => {
  const accessToken =
    typeof window !== "undefined"
      ? window.localStorage.getItem("token") ??
        window.localStorage.getItem("access_token")
      : null;

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return config;
});
