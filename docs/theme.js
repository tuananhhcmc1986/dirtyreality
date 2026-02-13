function toggleTheme() {

    const current =
        document.documentElement.getAttribute("data-theme");

    const next =
        current === "dark" ? "light" : "dark";

    document.documentElement.setAttribute(
        "data-theme",
        next
    );

    localStorage.setItem("theme", next);

}


function loadTheme() {

    const saved =
        localStorage.getItem("theme");

    if (saved) {

        document.documentElement.setAttribute(
            "data-theme",
            saved
        );

        return;

    }

    if (
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches
    ) {

        document.documentElement.setAttribute(
            "data-theme",
            "dark"
        );

    }

}


loadTheme();
