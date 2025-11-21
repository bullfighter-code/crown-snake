# How to Deploy Crown Snake to Vercel

Since your code is already on GitHub, deploying to Vercel is very easy.

## Option 1: Vercel Website (Recommended)

1.  **Go to Vercel**: Visit [vercel.com](https://vercel.com) and sign up or log in.
2.  **Add New Project**:
    *   Click the **"Add New..."** button on your dashboard.
    *   Select **"Project"**.
3.  **Import Git Repository**:
    *   You will see a list of your GitHub repositories.
    *   Find **`crown-snake`** and click **"Import"**.
4.  **Configure Project**:
    *   Vercel automatically detects that this is a static site.
    *   You don't need to change any build settings.
5.  **Deploy**:
    *   Click **"Deploy"**.
    *   Wait a minute for the build to finish.
6.  **Done!**: You will get a live URL (e.g., `crown-snake.vercel.app`) to share with the world.

## Option 2: Vercel CLI (Advanced)

If you prefer using the terminal:

1.  Install Vercel CLI: `npm i -g vercel`
2.  Login: `vercel login`
3.  Deploy: Run `vercel` in this project folder and follow the prompts.

## Option 3: GitHub Pages (School-Friendly)

If Vercel is blocked by your school, use GitHub Pages. It is often whitelisted.

1.  **I have already pushed a `gh-pages` branch for you.**
2.  Go to your repository settings on GitHub: [Settings > Pages](https://github.com/bullfighter-code/crown-snake/settings/pages).
3.  Under **"Build and deployment"** > **"Branch"**, ensure **`gh-pages`** is selected.
4.  Click **Save**.
5.  Your game will be live at: **[https://bullfighter-code.github.io/crown-snake/](https://bullfighter-code.github.io/crown-snake/)**
