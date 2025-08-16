# Logo Usage Guide - Khoj Advanced

## Logo Files Location
All logo files are stored in the `logo/` directory and distributed to appropriate locations throughout the platform.

## Logo Files Included

### Main Logo
- `khoj-logo.png` - Main Khoj Advanced logo (36KB)

### Favicon Files
- `favicon.ico` - Standard favicon (15KB)
- `favicon-16x16.png` - 16x16 favicon (706B)
- `favicon-32x32.png` - 32x32 favicon (1.5KB)
- `apple-touch-icon.png` - Apple touch icon (12KB)
- `android-chrome-192x192.png` - Android Chrome icon 192x192 (14KB)
- `android-chrome-512x512.png` - Android Chrome icon 512x512 (46KB)

## Where Logos Are Used

### 1. Frontend Web Application
**Location**: `frontend/public/`
- All favicon files copied to public directory
- `khoj-logo.png` available at `/khoj-logo.png`

**Usage**:
- **Favicon**: Updated `frontend/index.html` with proper favicon links
- **Dashboard**: Logo displayed in header and dashboard page
- **Login Page**: Logo displayed in login form
- **Navigation**: Logo shown in top navigation bar

### 2. Chrome Extension
**Location**: `extension/icons/` and `extension/`
- Icon files renamed to match manifest requirements:
  - `icon16.png` (16x16)
  - `icon32.png` (32x32)
  - `icon48.png` (48x48)
  - `icon128.png` (128x128)
- Main logo available as `khoj-logo.png`

**Usage**:
- **Extension Icon**: Used in browser toolbar and extension management
- **Popup**: Logo displayed in extension popup header
- **Manifest**: Referenced in `extension/manifest.json`

### 3. API Documentation
**Location**: Referenced in Postman collection
- Logo can be used in API documentation and branding

## File Distribution

### Frontend Files
```bash
# Copy favicon files to frontend public directory
cp logo/favicon.ico logo/favicon-*.png logo/apple-touch-icon.png logo/android-chrome-*.png frontend/public/

# Copy main logo to frontend public directory
cp logo/khoj-logo.png frontend/public/
```

### Extension Files
```bash
# Create extension icons directory
mkdir -p extension/icons

# Copy and rename icon files for extension
cp logo/favicon-16x16.png extension/icons/icon16.png
cp logo/favicon-32x32.png extension/icons/icon32.png
cp logo/android-chrome-192x192.png extension/icons/icon48.png
cp logo/android-chrome-512x512.png extension/icons/icon128.png

# Copy main logo to extension directory
cp logo/khoj-logo.png extension/
```

## HTML Implementation

### Frontend Favicon
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
<link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
```

### Frontend Logo Usage
```html
<img src="/khoj-logo.png" alt="Khoj Advanced Logo" class="h-12 w-auto" />
```

### Extension Logo Usage
```html
<img src="icons/icon48.png" alt="Khoj Logo" style="width: 32px; height: 32px;" />
```

## Branding Guidelines

- **Primary Logo**: Use `khoj-logo.png` for main branding
- **Favicon**: Use appropriate size based on context
- **Extension**: Use icon files for browser integration
- **Consistency**: Maintain consistent logo usage across all platforms

## Maintenance

When updating logos:
1. Replace files in the `logo/` directory
2. Re-run the distribution commands above
3. Test across all platforms (web, extension, API docs)
4. Update this documentation if needed
