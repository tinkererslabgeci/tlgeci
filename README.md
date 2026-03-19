# Tinkerers Lab GECI Website

React + Vite single-page application (SPA) for Tinkerers Lab, GECI.

## Pages
- Home
- Events
- Team
- Gallery
- Slot Booking

## Tech Stack
- React 18
- React Router DOM 6
- Vite 5

## Local Development
1. Install dependencies:
```bash
npm install
```
2. Run development server:
```bash
npm run dev
```
3. Open:
```text
http://localhost:3000
```

## Production Build
Generate deployable static files:
```bash
npm run build
```

Build output is created in:
```text
dist/
```

Optional local production preview:
```bash
npm run preview
```

## Hosting Prerequisites
You need these before deployment:

### 1) Build machine requirements
- Node.js 18+ (recommended: latest LTS)
- npm (comes with Node.js)
- Project source code

Node.js is required only to build the project (`npm run build`).

### 2) Web server requirements
- Any static file server (Nginx / Apache / IIS / cPanel hosting)
- Ability to upload files to document root
- Ability to configure SPA fallback rewrite rules

Node.js is not required on the web server if you deploy prebuilt `dist/` files.

## Deploying On Any Server 
This project is a static SPA. Deployment is always:
1. Build with `npm run build`
2. Upload contents of `dist/` to web root
3. Configure SPA fallback so non-root routes work

Examples of routes that must work directly:
- `/events`
- `/team`
- `/gallery`
- `/booking`

Without fallback rules, opening those URLs directly will return 404.

## Step-by-Step Hosting Flow
1. On a machine with Node.js installed, run:
```bash
npm install
npm run build
```
2. Confirm `dist/` folder is generated.
3. Upload all contents inside `dist/` to server document root.
4. Configure SPA fallback (Nginx/Apache/IIS rules below).
5. Point domain DNS to server.
6. Enable SSL (HTTPS).
7. Test direct routes (`/events`, `/team`, `/gallery`, `/booking`).

## Server Configuration (SPA Fallback)

### Nginx
Use this inside your `server {}` block:
```nginx
root /var/www/tlgeci;
index index.html;

location / {
   try_files $uri $uri/ /index.html;
}
```

### Apache (.htaccess)
Place this file in the deployed web root:
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### IIS (web.config)
Place this `web.config` in the deployed web root:
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
   <system.webServer>
      <rewrite>
         <rules>
            <rule name="React Routes" stopProcessing="true">
               <match url=".*" />
               <conditions logicalGrouping="MatchAll">
                  <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                  <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
               </conditions>
               <action type="Rewrite" url="/index.html" />
            </rule>
         </rules>
      </rewrite>
   </system.webServer>
</configuration>
```

### Shared Hosting (cPanel/Plesk)
- Upload all files from `dist/` into `public_html` (or domain document root)
- Add Apache rewrite rules above in `.htaccess`

## Domain and SSL Checklist
1. Point domain/subdomain DNS to server IP
2. Set document root to deployed `dist/` files
3. Configure SPA fallback (Nginx/Apache/IIS)
4. Enable HTTPS SSL certificate
5. Force HTTP -> HTTPS redirect
6. Verify direct route access (`/team`, `/booking`, etc.)

## Deployment Validation Checklist
After deployment, test:
- Home page loads
- Navbar links work
- Direct open works for `/events`, `/team`, `/gallery`, `/booking`
- Page refresh on a deep link does not 404
- Static assets load (`/logo`, `/gallery`, `/posters`, `/execom`)

## Project Structure (Important for Hosting)
- Frontend static app: root project (`src`, `public`, `dist` after build)
- Optional Apps Script backend docs: `apps-script/README.md`

## Backend Note (Slot Booking)
- Current frontend works as static hosting.
- Slot booking conflict checks/inventory APIs are optional and documented separately in:
```text
apps-script/README.md
```

## Useful Commands
```bash
npm install
npm run dev
npm run build
npm run preview
```

