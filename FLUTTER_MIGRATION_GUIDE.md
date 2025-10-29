# Flutter Mobile App Migration Guide
## JKUAT Course Hub - Native Mobile Application

> **Purpose:** This guide provides step-by-step instructions for building a high-performance, offline-first Flutter mobile application that mirrors the functionality of the existing Next.js web app.

> **Important:** This creates a **NEW** repository. The existing Next.js app remains unchanged and serves as reference documentation.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Reference Files Setup](#reference-files-setup)
4. [Architecture Overview](#architecture-overview)
5. [Dependencies Configuration](#dependencies-configuration)
6. [Implementation Phases](#implementation-phases)
7. [File Mapping Guide](#file-mapping-guide)
8. [Code Templates](#code-templates)
9. [Testing Strategy](#testing-strategy)
10. [Deployment](#deployment)

---

## Prerequisites

### Required Tools
- Flutter SDK (latest stable: 3.x)
- Dart SDK (comes with Flutter)
- Android Studio or VS Code with Flutter extensions
- Git
- Access to the existing Supabase project
- Firebase project (for App Distribution)

### Required Knowledge
- Dart programming language
- Flutter framework basics
- State management (GetX or Riverpod)
- SQLite/sqflite
- Supabase basics
- Async/await patterns

### Verify Installation
```bash
flutter --version
dart --version
flutter doctor
```

---

## Project Setup

### Step 1: Create New Flutter Project

```bash
# Navigate to parent directory (NOT inside jkuat-course-hub)
cd C:\Users\Jason

# Create new Flutter project
flutter create jkuat_course_hub_mobile

# Navigate into project
cd jkuat_course_hub_mobile

# Initialize Git
git init
git add .
git commit -m "Initial Flutter project setup"

# Create GitHub repo and push
# (Create repo on GitHub first: jkuat-course-hub-mobile)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jkuat-course-hub-mobile.git
git push -u origin main
```

### Step 2: Create Project Structure

```bash
# Create folder structure
mkdir -p lib/models
mkdir -p lib/services
mkdir -p lib/database
mkdir -p lib/screens
mkdir -p lib/widgets
mkdir -p lib/utils
mkdir -p lib/constants
mkdir -p reference
mkdir -p test/unit
mkdir -p test/widget
mkdir -p test/integration
```

---

## Reference Files Setup

### Copy All Reference Files from Next.js App

**Run these commands from PowerShell in the `jkuat_course_hub_mobile` directory.**

#### Step 1: Create Directory Structure

```powershell
# Create reference directory structure
@(
  "reference\lib\db",
  "reference\lib\hooks",
  "reference\lib\auth",
  "reference\lib\storage",
  "reference\lib\sw",
  "reference\lib",
  "reference\supabase",
  "reference\app\courses",
  "reference\app\upload",
  "reference\app\auth",
  "reference\components",
  "reference\tests\lib\db",
  "reference\tests\lib\hooks",
  "reference\tests\app\courses",
  "reference\tests\app\upload",
  "reference\config"
) | ForEach-Object { New-Item -ItemType Directory -Path $_ -Force | Out-Null }

Write-Host "✅ Directory structure created"
```

#### Step 2: Copy All Reference Files

```powershell
# ============================================
# DATABASE & SYNC LOGIC FILES (CRITICAL)
# ============================================

# Main sync manager - contains all sync logic to port
Copy-Item "..\jkuat-course-hub\lib\db\syncManager.js" "reference\lib\db\" -Force

# IndexedDB wrapper - port to sqflite
Copy-Item "..\jkuat-course-hub\lib\db\indexedDB.js" "reference\lib\db\" -Force

# ============================================
# HOOKS & STATE MANAGEMENT (OFFLINE-FIRST PATTERNS)
# ============================================

# Main offline data hooks - port to GetX/Riverpod
Copy-Item "..\jkuat-course-hub\lib\hooks\useOfflineData.js" "reference\lib\hooks\" -Force

# Cached file hook
Copy-Item "..\jkuat-course-hub\lib\hooks\useCachedFile.js" "reference\lib\hooks\" -Force

# ============================================
# AUTHENTICATION
# ============================================

# User authentication hook
Copy-Item "..\jkuat-course-hub\lib\auth\useUser.js" "reference\lib\auth\" -Force

# ============================================
# SUPABASE & AUTH FILES
# ============================================

# Client-side Supabase initialization
Copy-Item "..\jkuat-course-hub\lib\supabase\client.js" "reference\lib\supabase\" -Force

# Server-side Supabase (for reference only)
Copy-Item "..\jkuat-course-hub\lib\supabase\server.js" "reference\lib\supabase\" -Force

# Middleware (auth patterns)
Copy-Item "..\jkuat-course-hub\lib\supabase\middleware.js" "reference\lib\supabase\" -Force

# ============================================
# UPLOAD & QUEUE SYSTEM
# ============================================

# Upload queue system for managing queued uploads
Copy-Item "..\jkuat-course-hub\lib\uploadQueue.js" "reference\lib\" -Force

# ============================================
# STORAGE & FILE HANDLING
# ============================================

# PDF compression logic
Copy-Item "..\jkuat-course-hub\lib\storage\pdf-compressor.js" "reference\lib\storage\" -Force

# Cloudflare R2 client for file storage
Copy-Item "..\jkuat-course-hub\lib\storage\r2-client.js" "reference\lib\storage\" -Force

# Storage manager - handles file operations
Copy-Item "..\jkuat-course-hub\lib\storage\storage-manager.js" "reference\lib\storage\" -Force

# ============================================
# SERVICE WORKER & PWA
# ============================================

# Service worker registration
Copy-Item "..\jkuat-course-hub\lib\sw\register.js" "reference\lib\sw\" -Force

# Service worker - offline caching patterns
Copy-Item "..\jkuat-course-hub\public\sw.js" "reference\config\" -Force

# PWA manifest
Copy-Item "..\jkuat-course-hub\public\manifest.json" "reference\config\" -Force

# ============================================
# PAGE COMPONENTS (UI PATTERNS & LOGIC)
# ============================================

# Courses list page - offline-first UI pattern
Copy-Item "..\jkuat-course-hub\app\courses\page.jsx" "reference\app\courses\" -Force

# Course detail page - materials display
Copy-Item "..\jkuat-course-hub\app\courses\[courseId]\page.jsx" "reference\app\courses\" -Force

# Upload page - complex form with queue
Copy-Item "..\jkuat-course-hub\app\upload\page.jsx" "reference\app\upload\" -Force

# Auth layout
Copy-Item "..\jkuat-course-hub\app\auth\login\page.jsx" "reference\app\auth\" -Force

# Root layout - app structure
Copy-Item "..\jkuat-course-hub\app\layout.js" "reference\app\" -Force

# ============================================
# REUSABLE COMPONENTS
# ============================================

# Material card component
Copy-Item "..\jkuat-course-hub\components\MaterialCard.jsx" "reference\components\" -Force

# Upload queue component - queue management UI
Copy-Item "..\jkuat-course-hub\components\UploadQueue.jsx" "reference\components\" -Force

# Sync status component - shows sync state
Copy-Item "..\jkuat-course-hub\components\SyncStatus.jsx" "reference\components\" -Force

# Navigation component
Copy-Item "..\jkuat-course-hub\components\Navigation.jsx" "reference\components\" -Force

# Virtual material list - performant list rendering
Copy-Item "..\jkuat-course-hub\components\VirtualMaterialList.jsx" "reference\components\" -Force

# Service worker initialization
Copy-Item "..\jkuat-course-hub\components\ServiceWorkerInit.jsx" "reference\components\" -Force

# Install prompt - PWA install UI
Copy-Item "..\jkuat-course-hub\components\InstallPrompt.jsx" "reference\components\" -Force

# ============================================
# UTILITY FILES
# ============================================

# Utils - general helper functions
Copy-Item "..\jkuat-course-hub\lib\utils.js" "reference\lib\" -Force

# ============================================
# TEST FILES (REFERENCE FOR FLUTTER TESTS)
# ============================================

# Sync manager tests
Copy-Item "..\jkuat-course-hub\__tests__\lib\db\syncManager.test.js" "reference\tests\lib\db\" -Force

# Offline hooks tests
Copy-Item "..\jkuat-course-hub\__tests__\lib\hooks\useOfflineData.test.js" "reference\tests\lib\hooks\" -Force

# Courses page tests
if (Test-Path "..\jkuat-course-hub\__tests__\app\courses\page.test.jsx") {
  Copy-Item "..\jkuat-course-hub\__tests__\app\courses\page.test.jsx" "reference\tests\app\courses\" -Force
}

# Course detail page tests
if (Test-Path "..\jkuat-course-hub\__tests__\app\courses\courseId\page.test.jsx") {
  Copy-Item "..\jkuat-course-hub\__tests__\app\courses\courseId\page.test.jsx" "reference\tests\app\courses\" -Force
}

# Upload page tests
if (Test-Path "..\jkuat-course-hub\__tests__\app\upload\page.test.jsx") {
  Copy-Item "..\jkuat-course-hub\__tests__\app\upload\page.test.jsx" "reference\tests\app\upload\" -Force
}

# ============================================
# CONFIGURATION & DOCUMENTATION
# ============================================

# Package.json - for dependency reference
Copy-Item "..\jkuat-course-hub\package.json" "reference\config\" -Force

# Test summary documentation
Copy-Item "..\jkuat-course-hub\TEST_SUMMARY.md" "reference\" -Force

# Main README
Copy-Item "..\jkuat-course-hub\README.md" "reference\" -Force

# Next.js config (for understanding setup)
Copy-Item "..\jkuat-course-hub\next.config.mjs" "reference\config\" -Force

# Jest config (for test setup reference)
Copy-Item "..\jkuat-course-hub\jest.config.mjs" "reference\config\" -Force

# Environment variables template
if (Test-Path "..\jkuat-course-hub\.env.example") {
  Copy-Item "..\jkuat-course-hub\.env.example" "reference\config\" -Force
}

Write-Host ""
Write-Host "✅ All reference files copied successfully!"
Write-Host "📁 Reference files location: ./reference/"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review reference files in ./reference/"
Write-Host "2. Install Flutter dependencies (see Dependencies section)"
Write-Host "3. Start with Phase 1: Database Setup"
```

### Verify Reference Files

```powershell
# Verify all files were copied
Get-ChildItem -Path reference -Recurse -Include "*.js", "*.jsx", "*.json", "*.md" |
  Select-Object -ExpandProperty FullName |
  ForEach-Object { Write-Host $_ }
```

---

## Architecture Overview

### Next.js App → Flutter App Mapping

| Next.js Component | Flutter Equivalent | Purpose |
|-------------------|-------------------|---------|
| IndexedDB (lib/db/indexedDB.js) | sqflite (database/database_helper.dart) | Local storage |
| React Hooks (lib/hooks/) | GetX Controllers / Riverpod Providers | State management |
| Supabase JS Client | supabase_flutter | Backend API |
| Next.js Pages | Flutter Screens | UI pages |
| React Components | Flutter Widgets | Reusable UI |
| Service Worker | WorkManager + connectivity_plus | Background sync |
| File API | path_provider + file_picker | File handling |

### Key Differences

1. **No Server-Side Rendering:** Flutter connects directly to Supabase (no Next.js middleware)
2. **Native File Access:** Use device storage instead of browser storage
3. **Background Processing:** Use Dart Isolates instead of Web Workers
4. **State Management:** Use GetX/Riverpod instead of React hooks
5. **Offline Storage:** Use sqflite instead of IndexedDB

### App Architecture

```
┌─────────────────────────────────────┐
│          Flutter UI Layer           │
│  (Screens, Widgets, Controllers)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Services Layer                │
│  ┌──────────┐  ┌─────────────┐     │
│  │ Supabase │  │ Sync Service│     │
│  │ Service  │  │             │     │
│  └────┬─────┘  └──────┬──────┘     │
│       │               │             │
│  ┌────▼───────────────▼─────┐      │
│  │   Offline Service        │      │
│  └──────────┬───────────────┘      │
└─────────────┼────────────────────────┘
              │
┌─────────────▼────────────────────────┐
│     Local Database (sqflite)         │
│  ┌─────────┐ ┌──────────┐ ┌───────┐│
│  │ Courses │ │Materials │ │Topics ││
│  └─────────┘ └──────────┘ └───────┘│
└──────────────────────────────────────┘
```

---

## Dependencies Configuration

### pubspec.yaml

Replace the contents of `pubspec.yaml` with:

```yaml
name: jkuat_course_hub_mobile
description: JKUAT Course Hub - Offline-first mobile app for course materials
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # State Management
  get: ^4.6.6  # OR use riverpod: ^2.4.0

  # Backend & Auth
  supabase_flutter: ^2.0.0

  # Local Database
  sqflite: ^2.3.0
  path: ^1.8.3

  # File Handling
  file_picker: ^6.1.1
  path_provider: ^2.1.1
  permission_handler: ^11.0.1

  # HTTP & Downloads
  dio: ^5.4.0  # For file downloads with progress
  http: ^1.1.0

  # Connectivity & Network
  connectivity_plus: ^5.0.2
  internet_connection_checker: ^1.0.0+1

  # Background Tasks
  workmanager: ^0.5.1

  # Date & Time
  intl: ^0.18.1

  # PDF Viewer
  flutter_pdfview: ^1.3.2
  syncfusion_flutter_pdfviewer: ^24.1.41  # Better PDF viewer

  # UI Components
  cached_network_image: ^3.3.0
  shimmer: ^3.0.0  # Loading skeletons
  flutter_svg: ^2.0.9

  # Utilities
  uuid: ^4.2.1
  logger: ^2.0.2+1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1
  mockito: ^5.4.4
  build_runner: ^2.4.7

flutter:
  uses-material-design: true

  # Add your assets here
  assets:
    - assets/images/
    - assets/icons/
```

### Install Dependencies

```bash
flutter pub get
```

---

## Implementation Phases

### Phase 1: Database Setup (Week 1)
**Goal:** Create local SQLite database with schema matching Supabase

#### Tasks:
1. **Create Database Schema** (`lib/database/schema.dart`)
   - Define tables: courses, materials, topics, sync_metadata
   - Reference: `reference/lib/db/indexedDB.js` (STORES constant)

2. **Create Database Helper** (`lib/database/database_helper.dart`)
   - Port from: `reference/lib/db/indexedDB.js`
   - Functions to implement:
     - `initDatabase()`
     - `insertMany()` → port from `putManyInStore()`
     - `getByIndex()` → port from `getByIndex()`
     - `updateLastSyncTime()` → port from `updateLastSyncTime()`
     - `getLastSyncTime()` → port from `getLastSyncTime()`

3. **Create Models** (`lib/models/`)
   - `course_model.dart` - with `fromJson()`, `toJson()`, `toMap()`, `fromMap()`
   - `material_model.dart`
   - `topic_model.dart`
   - `sync_metadata_model.dart`

#### Success Criteria:
- ✅ Database creates on first app launch
- ✅ Can insert test data
- ✅ Can query data back
- ✅ Last sync time tracking works

---

### Phase 2: Supabase Integration (Week 1-2)
**Goal:** Connect to Supabase and implement auth

#### Tasks:
1. **Setup Supabase Service** (`lib/services/supabase_service.dart`)
   - Reference: `reference/lib/supabase/client.js`
   - Initialize Supabase client
   - Implement auth methods:
     - `signIn(email, password)`
     - `signUp(email, password)`
     - `signOut()`
     - `getCurrentUser()`
     - `onAuthStateChange()`

2. **Create Auth Screen** (`lib/screens/auth_screen.dart`)
   - Login form
   - Sign up form
   - Password reset

3. **Setup Environment Variables**
   - Create `.env` file
   - Add Supabase URL and anon key
   - Reference: `reference/config/.env.example`

#### Success Criteria:
- ✅ Can sign in/sign up
- ✅ Auth state persists across app restarts
- ✅ Can fetch data from Supabase

---

### Phase 3: Sync Service (Week 2-3)
**Goal:** Implement offline-first sync logic

#### Tasks:
1. **Create Sync Service** (`lib/services/sync_service.dart`)
   - **Reference: `reference/lib/db/syncManager.js`** (THIS IS CRITICAL!)
   - Port these functions to Dart:
     - `syncCourses()` → Fetch courses, store in sqflite
     - `syncMaterialsForCourse(courseId)` → Fetch materials
     - `syncTopicsForCourse(courseId)` → Fetch topics

2. **Create Offline Service** (`lib/services/offline_service.dart`)
   - Reference: `reference/lib/hooks/useOfflineData.js`
   - Implement:
     - `getCourses()` → Read from local DB first
     - `getMaterialsForCourse(courseId)`
     - `getTopicsForCourse(courseId)`
     - `isDataStale(lastSync)` → Check if > 30 min old
     - `shouldSync()` → Check connectivity + staleness

3. **Implement Upload Queue** (`lib/services/upload_queue_service.dart`)
   - Reference: `reference/lib/uploadQueue.js` and `reference/components/UploadQueue.jsx`
   - Implement:
     - Queue item management
     - Retry logic for failed uploads
     - Persistence in local DB
     - Sync when online

4. **Implement Background Sync** (`lib/services/background_sync_service.dart`)
   - Use WorkManager for periodic sync
   - Run sync in Dart Isolate
   - Reference: Service Worker patterns in `reference/config/sw.js` and `reference/lib/sw/register.js`

5. **Network Detection** (`lib/services/connectivity_service.dart`)
   - Use `connectivity_plus` package
   - Emit stream of online/offline status
   - Integration with background sync

#### Success Criteria:
- ✅ Courses sync from Supabase to local DB
- ✅ App works offline with cached data
- ✅ Background sync runs every 30 minutes when online
- ✅ Sync indicator shows during sync

---

### Phase 4: UI Implementation (Week 3-4)
**Goal:** Build all screens with offline-first UX

#### 4.1 Courses List Screen (`lib/screens/courses_screen.dart`)
**Reference:** `reference/app/courses/page.jsx`

**Port these patterns:**
- Loading state with shimmer skeletons
- Empty cache detection (show loading, not empty state)
- "Syncing..." banner when `isSyncing == true`
- Offline badge
- Search functionality
- Pull-to-refresh

**Key Logic to Port:**
```javascript
// From reference/app/courses/page.jsx
const { courses, loading, isSyncing, error, isOffline, lastSync } = useOfflineCourses()

// Flutter equivalent:
final controller = Get.find<CoursesController>();
// Access: controller.courses, controller.loading, controller.isSyncing, etc.
```

#### 4.2 Course Detail Screen (`lib/screens/course_detail_screen.dart`)
**Reference:** `reference/app/courses/[courseId]/page.jsx`

**Port these patterns:**
- Material cards with categories
- Topic/week grouping
- Empty state handling
- Sync banner
- Offline mode banner with last sync time

#### 4.3 Upload Screen (`lib/screens/upload_screen.dart`)
**Reference:** `reference/app/upload/page.jsx`

**Port these patterns:**
- File picker for PDFs
- Course/Unit autocomplete with creation
- Material category selection
- Upload queue (offline support)
- Non-blocking sync after creation
- Form persistence

**Critical References:**
- `reference/lib/uploadQueue.js` - Upload queue logic
- `reference/app/upload/page.jsx` - Form patterns
- `reference/components/UploadQueue.jsx` - Queue UI patterns

#### 4.4 Widgets
Create reusable widgets:
- `lib/widgets/material_card.dart` → Reference: `reference/components/MaterialCard.jsx`
- `lib/widgets/sync_status.dart` → Reference: `reference/components/SyncStatus.jsx`
- `lib/widgets/upload_queue_widget.dart` → Reference: `reference/components/UploadQueue.jsx`
- `lib/widgets/navigation_drawer.dart` → Reference: `reference/components/Navigation.jsx`
- `lib/widgets/loading_skeleton.dart` → Build custom shimmer widget
- `lib/widgets/offline_badge.dart` → Build custom offline indicator

#### Success Criteria:
- ✅ All screens match Next.js functionality
- ✅ Offline-first UX works
- ✅ Loading states smooth
- ✅ Material Design follows Flutter best practices

---

### Phase 5: File Download & Storage (Week 4)
**Goal:** Download, compress, and cache PDFs locally

#### Tasks:
1. **Create Download Service** (`lib/services/download_service.dart`)
   - Reference: `reference/lib/storage/storage-manager.js` and `reference/lib/hooks/useCachedFile.js`
   - Download PDFs with progress tracking
   - Store in app documents directory
   - Track download status in local DB
   - Handle resume/retry

2. **Create PDF Compression Service** (`lib/services/pdf_service.dart`)
   - Reference: `reference/lib/storage/pdf-compressor.js`
   - Compress PDFs to reduce storage
   - Handle compression errors
   - Cache compressed versions

3. **Create File Upload Service** (`lib/services/file_upload_service.dart`)
   - Reference: `reference/lib/storage/r2-client.js`
   - Handle file uploads to Cloudflare R2 or similar
   - Integration with upload queue

4. **Create PDF Viewer Screen** (`lib/screens/pdf_viewer_screen.dart`)
   - Open local PDFs (syncfusion_flutter_pdfviewer)
   - Fallback to web URL if not downloaded
   - Show download progress

5. **Add Download UI**
   - Download button on material cards
   - Progress indicator
   - Downloaded badge

#### Success Criteria:
- ✅ PDFs download and open offline
- ✅ Progress shown during download
- ✅ Downloaded files persist

---

### Phase 6: Testing & Polish (Week 5-6)
**Goal:** Comprehensive testing and UX polish

#### Tasks:
1. **Unit Tests** (`test/unit/`)
   - Reference: `reference/tests/` for test patterns
   - Test sync_service.dart
   - Test offline_service.dart
   - Test models

2. **Widget Tests** (`test/widget/`)
   - Test all screens
   - Test key widgets

3. **Integration Tests** (`test/integration/`)
   - Test offline-to-online flow
   - Test sync recovery
   - Test upload queue

4. **Performance Testing**
   - Measure sync time
   - Measure UI frame rate
   - Optimize slow queries

#### Success Criteria:
- ✅ 80%+ code coverage
- ✅ All critical paths tested
- ✅ No performance bottlenecks

---

## File Mapping Guide

### Complete File-by-File Mapping

#### Critical Files (Must Port)

| Next.js File | Location | Flutter Equivalent | Purpose |
|--------------|----------|-------------------|---------|
| lib/db/syncManager.js | reference/lib/db/ | lib/services/sync_service.dart | Port ALL sync logic |
| lib/db/indexedDB.js | reference/lib/db/ | lib/database/database_helper.dart | Port to sqflite |
| lib/hooks/useOfflineData.js | reference/lib/hooks/ | lib/controllers/courses_controller.dart | Offline-first pattern |
| lib/uploadQueue.js | reference/lib/ | lib/services/upload_queue_service.dart | Upload queue logic |

#### Important Supporting Files

| Next.js File | Location | Flutter Equivalent | Purpose |
|--------------|----------|-------------------|---------|
| lib/supabase/client.js | reference/lib/supabase/ | lib/services/supabase_service.dart | Supabase connection |
| lib/supabase/server.js | reference/lib/supabase/ | (Reference only) | Auth patterns |
| lib/supabase/middleware.js | reference/lib/supabase/ | (Reference only) | Security patterns |
| lib/hooks/useCachedFile.js | reference/lib/hooks/ | lib/services/download_service.dart | File caching |
| lib/auth/useUser.js | reference/lib/auth/ | lib/services/auth_service.dart | Auth patterns |

#### Storage & File Handling

| Next.js File | Location | Flutter Equivalent | Purpose |
|--------------|----------|-------------------|---------|
| lib/storage/pdf-compressor.js | reference/lib/storage/ | lib/services/pdf_service.dart | PDF handling |
| lib/storage/r2-client.js | reference/lib/storage/ | lib/services/file_upload_service.dart | File upload |
| lib/storage/storage-manager.js | reference/lib/storage/ | lib/services/download_service.dart | File management |

#### UI Pages (Redesign, Don't Copy)

| Next.js File | Location | Flutter Equivalent | Purpose |
|--------------|----------|-------------------|---------|
| app/courses/page.jsx | reference/app/courses/ | lib/screens/courses_screen.dart | Redesign with Flutter Material |
| app/courses/[courseId]/page.jsx | reference/app/courses/ | lib/screens/course_detail_screen.dart | Redesign with Flutter Material |
| app/upload/page.jsx | reference/app/upload/ | lib/screens/upload_screen.dart | Redesign with Flutter Material |
| app/auth/login/page.jsx | reference/app/auth/ | lib/screens/auth_screen.dart | Redesign with Flutter Material |
| app/layout.js | reference/app/ | lib/main.dart | App structure |

#### UI Components (Reference & Port Logic)

| Next.js File | Location | Flutter Equivalent | Purpose |
|--------------|----------|-------------------|---------|
| components/MaterialCard.jsx | reference/components/ | lib/widgets/material_card.dart | Material display |
| components/UploadQueue.jsx | reference/components/ | lib/widgets/upload_queue_widget.dart | Upload queue UI |
| components/SyncStatus.jsx | reference/components/ | lib/widgets/sync_status.dart | Sync indicator |
| components/VirtualMaterialList.jsx | reference/components/ | Use ListView.builder | Virtualized lists |
| components/Navigation.jsx | reference/components/ | lib/widgets/navigation_drawer.dart | Navigation |
| components/ServiceWorkerInit.jsx | reference/components/ | lib/services/background_sync.dart | Background sync |
| components/InstallPrompt.jsx | reference/components/ | (Native to Flutter) | PWA install (built-in) |

#### Service Worker & PWA (Port Logic)

| Next.js File | Location | Flutter Equivalent | Purpose |
|--------------|----------|-------------------|---------|
| lib/sw/register.js | reference/lib/sw/ | lib/services/background_sync_service.dart | Background task setup |
| public/sw.js | reference/config/ | WorkManager + Isolates | Service worker logic |
| public/manifest.json | reference/config/ | pubspec.yaml | App metadata |

#### Tests (Reference for Test Patterns)

| Next.js Test File | Location | Notes |
|-------------------|----------|-------|
| __tests__/lib/db/syncManager.test.js | reference/tests/lib/db/ | Port test scenarios to Dart |
| __tests__/lib/hooks/useOfflineData.test.js | reference/tests/lib/hooks/ | Port test patterns |
| __tests__/app/courses/page.test.jsx | reference/tests/app/courses/ | Widget test reference |

#### Configuration (Reference Only)

| Next.js File | Location | Purpose |
|--------------|----------|---------|
| package.json | reference/config/ | Dependency mapping |
| next.config.mjs | reference/config/ | Build configuration reference |
| jest.config.mjs | reference/config/ | Test setup reference |
| TEST_SUMMARY.md | reference/ | Test documentation reference |
| README.md | reference/ | Project documentation |

---

## Code Templates

### 1. Database Helper Template

```dart
// lib/database/database_helper.dart
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('jkuat_hub.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // Reference: reference/lib/db/indexedDB.js - STORES constant

    await db.execute('''
      CREATE TABLE courses (
        id TEXT PRIMARY KEY,
        course_name TEXT NOT NULL,
        department TEXT,
        description TEXT,
        synced_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE materials (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        course_id TEXT NOT NULL,
        topic_id TEXT,
        material_category TEXT,
        file_url TEXT,
        local_path TEXT,
        status TEXT,
        synced_at INTEGER,
        FOREIGN KEY (course_id) REFERENCES courses (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE topics (
        id TEXT PRIMARY KEY,
        topic_name TEXT NOT NULL,
        course_id TEXT NOT NULL,
        unit_code TEXT,
        year INTEGER,
        semester INTEGER,
        week_number INTEGER,
        synced_at INTEGER,
        FOREIGN KEY (course_id) REFERENCES courses (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE sync_metadata (
        store_name TEXT PRIMARY KEY,
        last_sync INTEGER
      )
    ''');

    // Create indices for fast lookups
    await db.execute('CREATE INDEX idx_materials_course ON materials(course_id)');
    await db.execute('CREATE INDEX idx_topics_course ON topics(course_id)');
  }

  // Port from reference/lib/db/indexedDB.js - putManyInStore()
  Future<void> insertMany(String table, List<Map<String, dynamic>> items) async {
    final db = await database;
    final batch = db.batch();

    for (var item in items) {
      batch.insert(
        table,
        item,
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }

    await batch.commit(noResult: true);
  }

  // Port from reference/lib/db/indexedDB.js - updateLastSyncTime()
  Future<void> updateLastSyncTime(String storeName) async {
    final db = await database;
    await db.insert(
      'sync_metadata',
      {
        'store_name': storeName,
        'last_sync': DateTime.now().millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  // Port from reference/lib/db/indexedDB.js - getLastSyncTime()
  Future<int?> getLastSyncTime(String storeName) async {
    final db = await database;
    final result = await db.query(
      'sync_metadata',
      where: 'store_name = ?',
      whereArgs: [storeName],
    );

    if (result.isEmpty) return null;
    return result.first['last_sync'] as int?;
  }
}
```

### 2. Sync Service Template

```dart
// lib/services/sync_service.dart
// Reference: reference/lib/db/syncManager.js

import 'package:supabase_flutter/supabase_flutter.dart';
import '../database/database_helper.dart';
import '../models/course_model.dart';

class SyncService {
  final _supabase = Supabase.instance.client;
  final _db = DatabaseHelper.instance;

  // Port from reference/lib/db/syncManager.js - syncCourses()
  Future<SyncResult> syncCourses() async {
    try {
      // Fetch from Supabase
      final response = await _supabase
          .from('courses')
          .select()
          .order('course_name');

      if (response == null) {
        return SyncResult(success: false, error: 'No data returned');
      }

      final courses = (response as List)
          .map((json) => Course.fromJson(json))
          .toList();

      // Add sync timestamp
      final coursesWithSync = courses.map((c) {
        c.syncedAt = DateTime.now().millisecondsSinceEpoch;
        return c;
      }).toList();

      // Store in local DB
      await _db.insertMany(
        'courses',
        coursesWithSync.map((c) => c.toMap()).toList(),
      );

      // Update last sync time
      await _db.updateLastSyncTime('courses');

      return SyncResult(
        success: true,
        data: coursesWithSync,
      );
    } catch (e) {
      return SyncResult(success: false, error: e.toString());
    }
  }

  // Port from reference/lib/db/syncManager.js - syncMaterialsForCourse()
  Future<SyncResult> syncMaterialsForCourse(String courseId) async {
    try {
      final response = await _supabase
          .from('materials')
          .select()
          .eq('course_id', courseId)
          .eq('status', 'approved')
          .order('created_at', ascending: false);

      // ... similar to syncCourses()

      return SyncResult(success: true, data: materials);
    } catch (e) {
      return SyncResult(success: false, error: e.toString());
    }
  }
}

class SyncResult {
  final bool success;
  final dynamic data;
  final String? error;

  SyncResult({required this.success, this.data, this.error});
}
```

### 3. Courses Controller Template (GetX)

```dart
// lib/controllers/courses_controller.dart
// CRITICAL REFERENCE: reference/lib/hooks/useOfflineData.js - useOfflineCourses()
// This hook defines the entire offline-first pattern you need to port!
// Study especially: cache loading, empty detection, isSyncing state

import 'package:get/get.dart';
import '../services/sync_service.dart';
import '../services/connectivity_service.dart';
import '../database/database_helper.dart';
import '../models/course_model.dart';

class CoursesController extends GetxController {
  final _syncService = Get.find<SyncService>();
  final _connectivityService = Get.find<ConnectivityService>();
  final _db = DatabaseHelper.instance;

  // Observable state - mirrors useOfflineCourses() return values
  final courses = <Course>[].obs;
  final loading = true.obs;
  final isSyncing = false.obs;
  final error = Rx<String?>(null);
  final isOffline = false.obs;
  final lastSync = Rx<int?>(null);

  @override
  void onInit() {
    super.onInit();
    _initData();
    _setupConnectivityListener();
  }

  // Port logic from reference/lib/hooks/useOfflineData.js - useOfflineCourses()
  Future<void> _initData() async {
    try {
      // 1. Load from cache first (instant)
      final cachedCourses = await _loadFromCache();

      if (cachedCourses.isNotEmpty) {
        courses.value = cachedCourses;
        loading.value = false; // Show cached data immediately
      }

      // 2. Check if sync needed
      if (_connectivityService.isOnline.value) {
        final shouldSync = await _shouldSync();

        if (shouldSync || cachedCourses.isEmpty) {
          await _syncFromServer();
        }
      } else {
        // Offline - just show cached data
        loading.value = false;
        isOffline.value = true;
      }
    } catch (e) {
      error.value = e.toString();
      loading.value = false;
    }
  }

  Future<List<Course>> _loadFromCache() async {
    final db = await _db.database;
    final result = await db.query('courses');

    final lastSyncTime = await _db.getLastSyncTime('courses');
    lastSync.value = lastSyncTime;

    return result.map((json) => Course.fromMap(json)).toList();
  }

  Future<bool> _shouldSync() async {
    final lastSyncTime = await _db.getLastSyncTime('courses');
    if (lastSyncTime == null) return true;

    final thirtyMinutesAgo = DateTime.now().millisecondsSinceEpoch - (30 * 60 * 1000);
    return lastSyncTime < thirtyMinutesAgo;
  }

  Future<void> _syncFromServer() async {
    isSyncing.value = true;

    final result = await _syncService.syncCourses();

    if (result.success) {
      courses.value = result.data;
      lastSync.value = DateTime.now().millisecondsSinceEpoch;
    } else {
      error.value = result.error;
    }

    loading.value = false;
    isSyncing.value = false;
  }

  void _setupConnectivityListener() {
    _connectivityService.isOnline.listen((online) {
      isOffline.value = !online;

      if (online) {
        // Back online - sync if stale
        _syncFromServer();
      }
    });
  }

  // Manual refresh
  Future<void> refetch() async {
    await _syncFromServer();
  }
}
```

### 4. Courses Screen Template

```dart
// lib/screens/courses_screen.dart
// REFERENCE FILES:
// - reference/app/courses/page.jsx - UI/UX patterns
// - reference/components/SyncStatus.jsx - Sync indicator patterns
// - reference/lib/hooks/useOfflineData.js - State management

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/courses_controller.dart';
import '../widgets/course_card.dart';
import '../widgets/loading_skeleton.dart';
import '../widgets/sync_status.dart';
import '../widgets/offline_badge.dart';

class CoursesScreen extends StatelessWidget {
  final controller = Get.put(CoursesController());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Courses'),
        actions: [
          // Offline badge
          Obx(() => controller.isOffline.value
              ? OfflineBadge()
              : SizedBox.shrink()),
        ],
      ),
      body: Column(
        children: [
          // Sync indicator banner
          Obx(() => controller.isSyncing.value && !controller.isOffline.value
              ? SyncStatus(message: 'Syncing courses...')
              : SizedBox.shrink()),

          // Main content
          Expanded(
            child: Obx(() {
              // Loading state (empty cache)
              if (controller.loading.value && controller.courses.isEmpty) {
                return LoadingSkeleton();
              }

              // Error state
              if (controller.error.value != null) {
                return Center(
                  child: Text('Error: ${controller.error.value}'),
                );
              }

              // Courses list
              return RefreshIndicator(
                onRefresh: controller.refetch,
                child: ListView.builder(
                  itemCount: controller.courses.length,
                  itemBuilder: (context, index) {
                    final course = controller.courses[index];
                    return CourseCard(course: course);
                  },
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
```

---

## Testing Strategy

### Unit Tests

Reference: `reference/tests/lib/db/syncManager.test.js`

```dart
// test/unit/sync_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

void main() {
  group('SyncService', () {
    test('syncCourses should NOT fetch material counts', () async {
      // Reference: reference/tests/lib/db/syncManager.test.js - line 44
      // Port the test logic
    });

    test('should handle empty courses list', () async {
      // Reference: reference/tests/lib/db/syncManager.test.js - line 117
    });
  });
}
```

### Widget Tests

Reference: `reference/tests/app/courses/page.test.jsx`

```dart
// test/widget/courses_screen_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('should show loading skeleton while loading', (tester) async {
    // Reference: reference/tests/app/courses/page.test.jsx - line 28
  });

  testWidgets('should show syncing indicator when isSyncing=true', (tester) async {
    // Reference: reference/tests/app/courses/page.test.jsx - line 52
  });
}
```

---

## Deployment

### Build APK

```bash
# Build release APK
flutter build apk --release

# Build app bundle (for Play Store)
flutter build appbundle --release

# Output location
# build/app/outputs/flutter-apk/app-release.apk
```

### Firebase App Distribution Setup

1. Create Firebase project
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Login: `firebase login`
4. Initialize: `firebase init appdistribution`
5. Deploy:

```bash
firebase appdistribution:distribute \
  build/app/outputs/flutter-apk/app-release.apk \
  --app YOUR_FIREBASE_APP_ID \
  --groups testers
```

---

## Next Steps After Setup

1. **Read all reference files** in `./reference/` directory
2. **Start with Phase 1** - Database setup
3. **Test incrementally** - write tests as you build
4. **Compare behavior** - ensure Flutter app matches Next.js behavior
5. **Ask questions** - if logic is unclear, check reference files first

---

## Important Notes

### DO NOT:
- ❌ Copy-paste JavaScript code into Dart files
- ❌ Skip the offline-first pattern
- ❌ Ignore test coverage
- ❌ Modify the Next.js repo

### DO:
- ✅ Port logic concepts, not syntax
- ✅ Read reference files carefully
- ✅ Test on real devices
- ✅ Follow Flutter best practices
- ✅ Maintain offline-first UX

---

## Troubleshooting

### Common Issues:

**Issue:** "Database locked" errors
**Solution:** Use `conflictAlgorithm: ConflictAlgorithm.replace` in all inserts

**Issue:** Background sync not working
**Solution:** Check WorkManager permissions in AndroidManifest.xml

**Issue:** Files not downloading
**Solution:** Add storage permissions in AndroidManifest.xml

---

## Support Resources

- **Next.js Reference Code:** `./reference/` directory
- **Flutter Docs:** https://docs.flutter.dev
- **Supabase Flutter:** https://supabase.com/docs/guides/getting-started/tutorials/with-flutter
- **sqflite Package:** https://pub.dev/packages/sqflite
- **GetX Docs:** https://pub.dev/packages/get

---

**Ready to start? Begin with Phase 1: Database Setup!** 🚀
