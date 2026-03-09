# Workly Frontend Dashboard

A modern, professional React frontend for the Workly employee management system built with Vite.

## Features

### Home Dashboard
- **Background Video**: Professional workplace video showcasing employee performance, task assignment, and progress analytics
- **Responsive Sections**: 
  - Hero section with call-to-action
  - About section with mission and vision
  - Why We're Here section explaining the purpose  
  - Features section with dynamic cards
  - Get Started button leading to login

### Login Page
- **Professional Design**: Work environment background with centered login form
- **Secure Authentication**: Ready for integration with Spring Boot backend
- **User Experience**: Smooth animations and intuitive interface

## Technologies Used

- **React 18.3** - Modern React with hooks
- **Vite 6.0** - Fast build tool and development server
- **React Router** - Client-side routing
- **Framer Motion** - Smooth animations
- **Lucide React** - Beautiful icons
- **CSS3** - Modern styling with gradients and animations

## Project Structure

```
workly-frontend/
├── src/
│   ├── components/
│   │   ├── HomePage.jsx       # Main dashboard component
│   │   ├── HomePage.css       # Home page styles
│   │   ├── LoginPage.jsx      # Login form component
│   │   └── LoginPage.css      # Login page styles
│   ├── App.jsx               # Main app with routing
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles
├── package.json             # Dependencies and scripts
├── vite.config.js          # Vite configuration
└── index.html              # HTML template
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd workly-frontend
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Preview Production Build**
   ```bash
   npm run preview
   ```

## Backend Integration

The frontend is designed to integrate with your Spring Boot Workly backend:

- **Login endpoint**: Ready to connect to `/api/auth/login`
- **Employee ID**: Matches your backend Employee entity structure
- **JWT Authentication**: Prepared for token-based authentication

### API Integration Points

All network requests use the base URL defined in the environment variable `VITE_API_URL` via `src/config/api.js`. During development this defaults to `http://localhost:8082` and in production it uses your deployed backend URL.

For example, the login page now calls:

```javascript
const response = await fetch(buildApiUrl('/api/auth/login-email'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData),
});
```

Make sure you set `VITE_API_URL` appropriately in `.env.development` or `.env.production`.

## Key Features Implemented

### Home Page
- ✅ Professional background video
- ✅ Smooth scroll animations  
- ✅ Responsive design
- ✅ Modern gradient backgrounds
- ✅ Dynamic feature cards
- ✅ Get Started CTA button

### Login Page
- ✅ Work environment background
- ✅ Centered login form
- ✅ Employee ID and password fields
- ✅ Show/hide password toggle
- ✅ Loading states
- ✅ Error handling
- ✅ Back to home navigation

## Customization

### Videos
Replace the background video URL in `HomePage.jsx`:
```javascript
<source src="your-video-url.mp4" type="video/mp4" />
```

### Colors & Branding
Modify the CSS custom properties in `HomePage.css` and `LoginPage.css` to match your brand colors.

### Background Images
Update the login background image in `LoginPage.css`:
```css
background-image: url('your-image-url.jpg');
```

## Development Server

The development server runs on `http://localhost:3000` and includes:
- Hot module replacement
- Fast refresh
- Error overlay
- Automatic browser opening

## Production Deployment

1. Build the project: `npm run build`
2. Deploy the `dist` folder to your web server
3. Configure your web server to serve the `index.html` for all routes (SPA routing)

## Next Steps

1. Install dependencies and run the development server
2. Test the homepage and login flow
3. Integrate with your Spring Boot backend
4. Add dashboard components after login
5. Implement JWT token storage and protected routes