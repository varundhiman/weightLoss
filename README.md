# Weight Tracker Mobile App

A private weight loss tracking application with group support, built with React and Capacitor for cross-platform mobile deployment.

## Features

- 🔐 Private weight tracking with percentage-based sharing
- 👥 Group chat and progress sharing
- 📊 Visual progress charts
- 📱 Native mobile app experience
- 🔒 Secure authentication with Supabase

## Development Setup

### Prerequisites

- Node.js 18+
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Add your Supabase credentials
   ```

4. Build the web app:
   ```bash
   npm run build
   ```

### Mobile Development

#### Android Setup

1. Add Android platform:
   ```bash
   npx cap add android
   ```

2. Sync the project:
   ```bash
   npm run cap:sync
   ```

3. Open in Android Studio:
   ```bash
   npm run cap:open android
   ```

4. Build and run from Android Studio

#### iOS Setup (macOS only)

1. Add iOS platform:
   ```bash
   npx cap add ios
   ```

2. Sync the project:
   ```bash
   npm run cap:sync
   ```

3. Open in Xcode:
   ```bash
   npm run cap:open ios
   ```

4. Build and run from Xcode

## Publishing to Google Play Store

### 1. Prepare for Release

1. Update version in `package.json`
2. Build the app:
   ```bash
   npm run cap:build
   ```

### 2. Generate Signed APK

1. In Android Studio, go to Build → Generate Signed Bundle/APK
2. Choose "Android App Bundle" (recommended) or "APK"
3. Create or use existing keystore
4. Build release version

### 3. Google Play Console

1. Create developer account at [Google Play Console](https://play.google.com/console)
2. Create new app
3. Upload your AAB/APK file
4. Fill in app details, screenshots, descriptions
5. Submit for review

### 4. App Store Optimization

- **App Name**: Weight Tracker - Private Progress
- **Description**: Focus on privacy, group support, motivation
- **Keywords**: weight loss, fitness, tracking, private, groups
- **Screenshots**: Show main features across different screen sizes

## Environment Variables

Create a `.env` file with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup

The app uses Supabase for backend services. Run the migrations in the `supabase/migrations` folder to set up the database schema.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details



Squarespace
Netlify
Resend email
bolt
supabase