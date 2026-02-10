# climbr

## Overview

climbr is a dark-themed focus timer mobile application built with React Native and Expo. The app features a distinctive visual identity centered around an animated SVG stick figure pushing a boulder up a hill, representing the user's focus progress. The application supports both solo timer sessions and collaborative "Squad" rooms for group focus sessions.

The app uses a three-tab navigation structure (Squads, Timer, Profile) with the Timer as the central default screen featuring an elevated circular button in the bottom navigation bar.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54 (new architecture enabled)
- **Language**: TypeScript with strict mode
- **Navigation**: React Navigation with bottom tabs (`@react-navigation/bottom-tabs`) and native stack (`@react-navigation/native-stack`)
- **State Management**: React Query (`@tanstack/react-query`) for server state, React hooks for local state
- **Animations**: React Native Reanimated for fluid animations (timer pulse, button interactions, SVG climbing animation)
- **Styling**: Custom StyleSheet-based theming with a centralized theme system in `client/constants/theme.ts`

### Path Aliases
- `@/` maps to `./client/` for client-side code
- `@shared/` maps to `./shared/` for shared types and schemas

### Design System
- **Theme**: Dark mode only with deep slate background (#1A1A1B)
- **Accent Color**: Magma orange (#FF6B35)
- **Typography**: System fonts with defined hierarchy (h1-h4, body, small)
- **Components**: Reusable themed components (`ThemedText`, `ThemedView`, `Button`, `Card`)

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript compiled with tsx (development) and esbuild (production)
- **API Pattern**: RESTful routes prefixed with `/api`
- **Storage**: In-memory storage interface (`IStorage`) with `MemStorage` implementation, designed for easy swap to persistent storage

### Database Schema
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts`
- **Validation**: Zod schemas generated via `drizzle-zod`
- **Current Tables**: `users` table with id, username, password fields

### Build System
- **Development**: Concurrent Expo dev server and Express server
- **Production**: Static Expo build (`scripts/build.js`) + bundled Express server
- **Database Migrations**: Drizzle Kit with `db:push` command

## External Dependencies

### Core Services
- **Database**: PostgreSQL (configured via `DATABASE_URL` environment variable)
- **Hosting**: Replit deployment (uses `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS` for CORS)

### Key Third-Party Libraries
- **expo-haptics**: Haptic feedback for button interactions
- **expo-blur**: Backdrop blur effects for bottom navigation
- **react-native-svg**: SVG rendering for the climbing animation
- **react-native-gesture-handler**: Touch gesture handling
- **react-native-safe-area-context**: Safe area inset management
- **react-native-keyboard-controller**: Keyboard-aware scroll views

### Platform Support
- iOS (bundleIdentifier: `com.climbr.app`)
- Android (package: `com.climbr.app`, edge-to-edge enabled)
- Web (single-page output)

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN`: API domain for client requests
- `REPLIT_DEV_DOMAIN`: Development domain for CORS
- `REPLIT_DOMAINS`: Production domains for CORS

## Recent Changes (January 2026)

### Frontend Implementation
- **Timer Screen**: Implemented main timer with circular dial, climbing SVG animation, thick 18px progress ring, FOCUS label, timer display, and stats row
- **Squads Screen**: Created squad listing with My Squads/Public tab selector, squad cards with live status, location, course, member count, and JOIN buttons
- **Profile Screen**: Built user profile with avatar, stats cards (day streak, climbed), weekly focus chart, and View All Squads button
- **Custom Tab Bar**: Implemented custom bottom navigation with elevated center timer button (70px), protrudes above tab bar with shadow

### App Screens
1. **Timer (default)**: Focus timer with Mode selector (Solo/Room), circular dial with climbing visual, orange progress arc, FOCUS label, timer countdown, and daily/weekly stats
2. **Squads**: List of study groups with tab filtering, cards showing live sessions with JOIN functionality
3. **Profile**: User profile showing stats, weekly activity chart, and navigation to squads

### File Structure
- `client/screens/TimerScreen.tsx` - Main timer screen with climbing animation
- `client/screens/SquadsScreen.tsx` - Squad listing and cards
- `client/screens/ProfileScreen.tsx` - User profile and stats
- `client/navigation/MainTabNavigator.tsx` - Custom bottom tab bar with elevated center button
- `client/constants/theme.ts` - App colors including AppColors object with all brand colors