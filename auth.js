(function () {
  const LOGIN_KEY = "libraryDemoLoggedIn";

  function checkDemoLogin() {
    let isLoggedIn = false;

    try {
      isLoggedIn = sessionStorage.getItem(LOGIN_KEY) === "true";
    } catch (error) {
      isLoggedIn = false;
    }

    if (!isLoggedIn) {
      window.location.replace("login.html");
    }
  }

  checkDemoLogin();

  // Check again when returning through browser history.
  window.addEventListener("pageshow", checkDemoLogin);

  document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logout-btn");

    if (logoutButton) {
      logoutButton.addEventListener("click", function () {
        try {
          sessionStorage.removeItem(LOGIN_KEY);
        } finally {
          window.location.replace("login.html");
        }
      });
    }
  });
})();