# xiye-de-game

A rotatable retro handheld console with playable Tetris.

The complete static website is in `dist/`. All runtime assets use relative paths, so the game supports GitHub Pages project URLs under `/xiye-de-game/`.

## Publishing

Create the GitHub repository `xiye-de-game`, push the project to `main`, and select **GitHub Actions** in **Settings → Pages → Build and deployment → Source**. The included workflow publishes only `dist/`. Future pushes to `main` update the website automatically.

No server, build step, API key, or visitor login is required by the game itself. Public availability must be verified after GitHub Pages finishes deployment.

## Controls

Drag the shell to rotate. Press START or Enter to play/pause. Use arrow keys to move and rotate pieces, and Space to drop. On touchscreens, tap the console buttons.

Font attribution and the bitmap glyph subset are in `dist/assets/font-notice.txt`.
