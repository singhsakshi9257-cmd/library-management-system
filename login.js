const LOGIN_KEY = "libraryDemoLoggedIn";

const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("login-error");

loginForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  errorMessage.textContent = "";

  // Demo credentials only. This is not secure authentication.
  if (username !== "admin" || password !== "LibraryDemo123!") {
    errorMessage.textContent = "Incorrect username or password.";
    return;
  }

  try {
    sessionStorage.setItem(LOGIN_KEY, "true");
    window.location.replace("index.html");
  } catch (error) {
    errorMessage.textContent =
      "Browser storage is unavailable. Allow site storage and try again.";
  }
});