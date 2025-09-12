# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CosmicBoard Mobile is a React Native (Expo) project management application with a cosmic/space theme. It's a cloud-first mobile companion to the CosmicBoard web app, sharing the same MongoDB backend and subscription model. Designed for tech-savvy users who are always connected.

## Technology Stack

- **Framework**: React Native with Expo SDK 53
- **Language**: TypeScript (strict mode enabled)
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **Storage**: AsyncStorage for local data persistence
- **UI Components**: Custom PrismCard components with gradient effects
- **Icons**: lucide-react-native

## Common Development Commands

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web

# Install dependencies
npm install
```

## Project Architecture

### Directory Structure
- `/src/components` - Reusable UI components (PrismCard)
- `/src/models` - TypeScript interfaces (Project, Task, Reference)
- `/src/navigation` - Navigation setup with typed routes
- `/src/screens` - Screen components for each view
- `/src/services` - Business logic (storage.ts handles all data operations)
- `/src/styles` - Theme colors and shared styles

### Key Architectural Patterns

1. **Cloud-First Data Management**: All data operations go through `ApiService` singleton in `/src/services/api.ts`. This service connects to the MongoDB backend shared with the web app. No offline storage except for auth tokens.

2. **Authentication**: Secure token storage using react-native-keychain with automatic token refresh via axios interceptors.

3. **State Management**: React Query for server state management with caching and automatic refetching.

4. **Navigation Types**: Strongly typed navigation using `RootStackParamList` and `MainTabParamList` in `/src/navigation/AppNavigator.tsx`.

5. **Data Model Relationships** (same as web app):
   - Projects have many Tasks and References (linked by projectId)
   - Tasks have priority levels (SUPERNOVA, STELLAR, NEBULA) and status states
   - References are categorized as snippets or documentation
   - Single subscription model across all platforms

### Important Implementation Details

- **Cloud-first approach**: Direct connection to MongoDB backend (no offline mode)
- **Shared backend**: Uses the same API as the CosmicBoard web app
- **Authentication required**: Users must login with their existing account
- **Single subscription**: One subscription works across web and mobile
- **Secure token storage**: Using react-native-keychain for auth tokens
- **Auto token refresh**: Axios interceptors handle expired tokens
- **Color theme**: Defined in `/src/styles/colors.ts` with cosmic-themed gradients
- **TypeScript strict mode**: Enabled - ensure all types are properly defined