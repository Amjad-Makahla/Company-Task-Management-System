// assets/js/login.js
import { callApi, showUserMessage, logMessage } from './config.js';

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // ✅ Redirect if already logged in
  if (user?.id) {
    window.location.href = "dashboard.html";
  }

  const loginForm = document.getElementById("login-form");
  if (!loginForm) {
    logMessage("Login form not found in DOM");
    return;
  }

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!email || !password) {
      showUserMessage("Please enter both email and password", "warning");
      return;
    }

    try {
      const res = await callApi("login", { email, password });
      logMessage("Login Response", res);

      if (res.success && res.data?.user?.id) {
        // ✅ Save full user object, not just the ID
        localStorage.setItem("user", JSON.stringify(res.data.user));
        showUserMessage("Login successful!", "success");
        window.location.href = "dashboard.html";
      } else {
        showUserMessage(res.message || "Login failed", "error");
      }
    } catch (error) {
      logMessage("Login Error", error);
      showUserMessage("Server error during login", "error");
    }
  });
});
