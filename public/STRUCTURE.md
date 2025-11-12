# Public Folder Structure

This folder contains all frontend assets organized into the following structure:

```
public/
├── assets/                  # Additional assets (profile avatars, etc.)
│   └── profile-avatars/     # Profile avatar images
├── fonts/                   # Font files (ready for future use)
├── images/                  # Image assets (logos, backgrounds, avatars)
│   ├── avatar1-5.png
│   ├── logo.jpeg
│   ├── signin.jpeg
│   ├── signin1.jpeg
│   ├── mainscreen.jpeg
│   ├── disney-interface.jpeg
│   ├── disneylogo-new.jpeg
│   ├── poster-placeholder.jpg
│   └── profile*.png
├── scripts/                 # JavaScript files
│   ├── api.js              # API utilities
│   ├── home.js             # Home page functionality
│   └── player.js           # Video player functionality
├── styles/                  # CSS files
│   ├── style.css           # Main stylesheet
│   └── avatar-placeholders.css  # Avatar placeholder styles
├── videos/                  # Video files (ready for future use)
└── views/                   # HTML view files
    ├── index.html          # Home/main page
    ├── login.html          # Login page
    ├── signup.html         # Signup page
    ├── profile-selection.html  # Profile selection page
    ├── genre.html          # Genre browsing page
    ├── title.html          # Title details page
    ├── player.html         # Video player page
    ├── settings.html       # User settings page
    └── admin.html          # Admin panel page
```

## Asset References

All HTML files reference assets using the following paths:
- CSS: `/styles/style.css`
- JavaScript: `/scripts/api.js`, `/scripts/home.js`, `/scripts/player.js`
- Images: `/images/logo.jpeg`, `/images/avatar*.png`, etc.

## Notes

- All root-level HTML, CSS, and asset files have been moved to this folder
- The backend (Express/Node.js) serves files from this `public` folder
- The `views/` subfolder contains all HTML pages
- Keep this structure organized for scalability
