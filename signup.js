import { callApi, showUserMessage, logMessage } from './config.js';

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name")?.value?.trim();
    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();

    if (!name || !email || !password) {
      showUserMessage("يرجى تعبئة جميع الحقول.", "warning");
      return;
    }

    const result = await callApi("register", { name, email, password });

    if (result.success) {
      showUserMessage(result.message, "success");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      showUserMessage(result.message, "error");
    }
  });
});
