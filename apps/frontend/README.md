# Developer Guide

The frontend is built with **Vite** and **SvelteKit**. Below are instructions for setting up the environment, running the app, and working with the codebase.

## Setup

1. **Install dependencies** (without modifying `package-lock.json`):

   ```bash
   npm ci
   ```

2. **Create a `.env`** file in the project root:

   ```bash
   VITE_ENV=development
   ```

   This will allow to start the dev server without the use of the live api. It uses mock data available in `/lib/mocks/*`.
   Currently only implemented for `/maps`.

3. **Start the dev server**
   ```bash
   npm run dev
   ```

## Available Commands

| Command               | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Start the development server                          |
| `npm run build`       | Build the app for production                          |
| `npm run preview`     | Preview the production build locally                  |
| `npm run check`       | Run `svelte-check` for type and compiler errors       |
| `npm run check:watch` | Run `svelte-check` in watch mode                      |
| `npm run lint`        | Run Prettier and ESLint to check formatting and style |
| `npm run format`      | Format the entire codebase using Prettier             |
