# 🎨 RefBoard – Reference & Moodboard Tool for Artists

RefBoard is a **reference companion app** for artists that runs completely offline.

It helps you import reference images, transform them (flip, rotate), organize everything into boards, and add custom grids and annotations – so drawing from reference becomes easier and more structured.

> ⚠️ Work in progress – this is an early prototype (v0).  
> The goal is to validate the core UX and image processing pipeline before adding more features.

---

## ✨ Features (Current & Planned)

### Core (Implemented)

- 🧱 **Boards**

  - Create boards (projects) and attach multiple reference images
  - Simple board overview with thumbnails of all images
  - All data stored locally, works completely offline

- 🖼️ **Image Import**

  - Import images from device gallery or camera
  - Images stored locally on device
  - Automatic thumbnail generation

- 🎚️ **Image Operations** (via React Native Skia)

  - **Flip Horizontal** → detect drawing mistakes and check composition
  - **Rotate in 90° steps** → fresh view on composition and shapes
  - All transformations rendered in real-time using Skia's native graphics engine
  - More transformations coming soon (posterize, grayscale)

- 🧮 **Settings per image**
  - Each image can store its own settings: flip, rotation, etc.
  - Settings persisted in local database

### Planned / Roadmap

- 🎯 **Custom grids** (rows/cols, opacity, presets like rule-of-thirds)
- 🎨 **Color clustering / palette extraction** from references
- 📝 **Notes pinned to positions** on the image
- 🧩 **Tags and filters** (moodboard-style workflow)
- 🖼️ **Advanced image processing** (posterize, grayscale via Skia filters)
- 📤 **Project import/export** (backup & share boards)

---

## 🏗️ Tech Stack

**Core Framework**

- [Expo](https://expo.dev/) with [Expo Router](https://expo.github.io/router/) (React Native)
- TypeScript
- React Native with modern hooks and patterns

**Storage & Data**

- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) – SQLite database for structured data (boards, images, metadata)
- [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) – Fast key-value storage for settings and cache
- [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) – Local file storage for images

**Graphics & Image Processing**

- [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) – Native 2D graphics engine for:
  - **Image transformations** (flip, rotate, scale, filters)
  - **Canvas operations** (grids, overlays, annotations)
  - **Real-time rendering** with native performance
- [expo-image](https://docs.expo.dev/versions/latest/sdk/image/) – Optimized image loading and caching
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) – Smooth animations and gestures
- [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) – Native gesture handling

**Performance**

- React Native Worklets for off-thread operations
- Optimized image caching and thumbnail generation
- Efficient database queries with SQLite

---

## 🧬 Architecture

```
┌─────────────────────────────────────────────┐
│         React Native + Expo App             │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │   UI Layer (Expo Router)            │  │
│  │   - Screens & Navigation             │  │
│  └──────────────────────────────────────┘  │
│              │                               │
│  ┌───────────┴───────────┐                 │
│  │   Business Logic      │                 │
│  │   - Custom Hooks      │                 │
│  │   - Services          │                 │
│  └───────────┬───────────┘                 │
│              │                               │
│  ┌───────────┴───────────┐                 │
│  │   Data Layer          │                 │
│  │                       │                 │
│  │  • SQLite (expo-sqlite)               │  │
│  │    → Boards, Images, Metadata         │  │
│  │                       │                 │
│  │  • MMKV                               │  │
│  │    → Settings, Cache, Preferences     │  │
│  │                       │                 │
│  │  • File System (expo-file-system)     │  │
│  │    → Original Images, Thumbnails       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │   Graphics Layer (Skia)              │  │
│  │   - Image Transformations            │  │
│  │     (Flip, Rotate, Filters)          │  │
│  │   - Canvas Operations                │  │
│  │   - Grids & Overlays                 │  │
│  │   - Annotations                       │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

All data stored locally - 100% offline capable
```

**Key Principles:**

- **Offline-First**: All data stored locally, no server required
- **Performance**: Native modules (Skia, MMKV) for optimal speed
- **Type Safety**: Full TypeScript coverage
- **Modular**: Clear separation between UI, business logic, and data layer

---

## 🚀 Getting Started

### Requirements

- Node.js (LTS version, 18+)
- npm or yarn
- iOS Simulator (for iOS development) or Android Studio (for Android)
- For physical devices: Expo Go app (iOS/Android)

### Installation

1. **Clone the repository**

```bash
   git clone <repository-url>
   cd paintComp
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the development server**

   ```bash
   npm start
   # or
   npx expo start
   ```

4. **Run on your device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device
   - Press `w` for web (limited functionality)

### Project Structure

```
├── app/                    # Expo Router routes
│   ├── _layout.tsx         # Root layout
│   └── index.tsx           # Home screen
├── src/                    # Source code (to be organized)
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Business logic
│   │   ├── database/       # SQLite operations
│   │   ├── storage/        # MMKV operations
│   │   └── images/         # Image processing (Skia transformations)
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── assets/                 # Images, fonts, etc.
├── app.json                # Expo configuration
├── package.json
└── tsconfig.json
```

---

## 🗄️ Data Storage

### SQLite Database

Stores structured data:

- **Boards**: Projects/collections
- **Images**: Image metadata, settings, relationships
- **Tags**: (Future) Tag system
- **Notes**: (Future) Annotations on images

Database location: Managed by `expo-sqlite`, stored in app's document directory.

### MMKV Storage

Fast key-value storage for:

- User preferences
- App settings
- Cache keys
- Temporary state

### File System

Images stored in app's document directory:

```
{FileSystem.documentDirectory}/
  └── images/
      └── {boardId}/
          ├── {imageId}.jpg          # Original image
          └── {imageId}_thumb.jpg    # Thumbnail
```

---

## 🧪 Development

### Type Checking

```bash
npm run type-check
# or
npx tsc --noEmit
```

### Linting

```bash
npm run lint
```

### Database Inspection

For debugging, you can inspect the SQLite database:

- Use [SQLite Viewer](https://sqliteviewer.app/) or similar tools
- Database file location: `{FileSystem.documentDirectory}/SQLite/refboard.db` (or similar, depending on your setup)

### Image Storage Location

Images are stored in the app's document directory. On iOS/Android, you can access them via:

- `expo-file-system` APIs to list files programmatically

---

## 🗺️ Roadmap

### Short-term

- ✅ Basic board and image management
- ✅ Image import from gallery/camera
- ✅ Flip and rotate operations
- 🚧 Custom grids (rows/cols, opacity, rule-of-thirds)
- 🚧 Notes on images
- 🚧 Better viewer UI with gestures

### Medium-term

- Color palette extraction
- Advanced image processing (posterize, grayscale via Skia image filters)
- Tags & filters
- Project import/export

### Long-term

- Desktop app with Tauri
- Cloud sync (optional)
- Advanced image analysis
- Collaboration features

---

## 📝 License

TBD (MIT recommended).

---

## 🤝 Contributing

This is an experimental personal project.
Issues, suggestions and PRs welcome.

---

## 💡 Vision

A modern reference and moodboard tool for artists that:

- Works completely offline – no internet required
- Provides intelligent analysis tools (posterize, values, palettes, grids, notes)
- Offers a seamless mobile experience
- Eventually expands to desktop for a complete workflow next to any drawing software

---

## 🔧 Troubleshooting

### Common Issues

**"Module not found" errors**

- Run `npm install` again
- Clear Metro cache: `npx expo start -c`

**Database not initializing**

- Check that `expo-sqlite` is properly installed
- Verify app has file system permissions

**Images not loading**

- Check file system permissions
- Verify images are being saved to correct directory
- Check `expo-file-system` documentation for path issues

**Skia not working**

- Ensure you're using a development build (not Expo Go for native modules)
- Check that `@shopify/react-native-skia` is properly installed
- Rebuild native code if needed: `npx expo prebuild`

---

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Skia](https://shopify.github.io/react-native-skia/)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv)
- [Expo Router](https://expo.github.io/router/)
