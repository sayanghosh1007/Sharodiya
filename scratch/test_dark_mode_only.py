with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

with open("js/app.js", "r", encoding="utf-8") as f:
    app_js = f.read()

with open("css/styles.css", "r", encoding="utf-8") as f:
    css = f.read()

assert "theme-toggle-btn" not in html, "Found theme-toggle-btn in index.html"
assert "mobile-theme-toggle-btn" not in html, "Found mobile-theme-toggle-btn in index.html"
assert "master-map-theme-btn" not in html, "Found master-map-theme-btn in index.html"
assert 'class="dark"' in html, "Missing class='dark' on <html> in index.html"

assert "html:not(.dark)" not in css, "Found html:not(.dark) in css"

assert "theme-toggle-btn" not in app_js, "Found theme-toggle-btn in js/app.js"
assert "master-map-theme-btn" not in app_js, "Found master-map-theme-btn in js/app.js"
assert "applyTheme('dark'" in app_js, "Missing applyTheme('dark' in js/app.js"

print("SUCCESS: Light mode completely removed. Dark mode permanently enforced across HTML, CSS, and JS!")
