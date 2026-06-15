# Comprehensive Project Prompt for Gem Store Application

**Description:**
This file contains the complete prompt/instruction set required to recreate this exact Gem Store and Inventory Management application from scratch using any AI coding assistant.

---

## 💎 Project Overview
Build a full-stack, premium gemstone e-commerce storefront and inventory management application. The app should allow public users to browse, filter, sort, and inquire about gemstones, while giving admins a secure dashboard to manage inventory (including bulk CSV imports) and store settings.

**Tech Stack:**
- **Frontend Framework:** React 18, Vite, TypeScript
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **Icons:** `lucide-react`
- **Backend/Database:** Firebase Firestore (NoSQL database)
- **Authentication:** Firebase Auth (Email/Password for Admin access)

---

## 📐 Data Models

### 1. Gem (Stored in Firestore `gems` collection)
```typescript
interface Gem {
  id: string;
  name: string;
  gemType: string;
  origin: string;
  shape: string;
  dimensions: string;
  weight: number;
  treatment: string;
  price: number;
  buyingPrice?: number | null;
  salePercentage?: number | null;
  status: 'available' | 'on_sale' | 'sold';
  imageUrl: string;
  images?: string[];
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}
```

### 2. Store Settings (Stored in Firestore `settings` collection)
```typescript
interface StoreSettings {
  name: string;
  logoUrl?: string;
  heroImageUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutText?: string;
  contactEmail?: string;
  inquiryEmail?: string;
  contactPhone?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
}
```

---

## 🚀 Core Features & Implementation Details

### 1. Storefront Gallery & Shop (`/`)
- **Hero Banner:** Display store name, hero title, subtitle, and an aesthetic background image (pulled from Firestore settings).
- **Listing View:** Responsive CSS grid displaying Gem cards (Image, Name, Weight, Category, Price).
- **Pagination:** Display 8 items initially. Include a "Load More" button at the bottom that reveals 4 additional items per click.
- **Filtering Sidebar:**
  - Search by Name.
  - Dropdown filters for Gem Type, Shape, Origin, and Treatment.
  - Min Price and Max Price number inputs.
- **Sorting System:**
  - A dropdown selector placed above the gallery.
  - Options: Newest First (default), Oldest First, Price Low to High, Price High to Low.
  - Price sorting must account for `salePercentage` (calculate the discounted price if the status is `on_sale`).

### 2. Gem Details Page (`/gem/:id`)
- **Image Gallery:** Show the primary image with a row of clickable thumbnail images below it if `images` exist.
- **Specifications Table:** Display Gem Type, Shape, Weight (ct), Dimensions, Origin, and Treatment.
- **Inquiry Form Panel:** 
  - Fields: Your Name, Phone Number, Item Name, Offering Price ($) (number), and Message (textarea).
  - Actions on submit:
    1. Save the inquiry to a new Firestore collection called `inquiries` (fields: name, phone, item name, offering price, message, createdAt).
    2. Open the user's default email client (`mailto:`) stringing together the subject and body including all their provided details, directed to the `inquiryEmail` from the Store Settings.

### 3. Secure Admin Dashboard (`/admin`)
- Restrict access to authenticated Firebase users. Include a sleek login form if unauthenticated.
- **Settings Tab:** Form to update all variables within the `StoreSettings` model (updates globally across the app).
- **Inventory Tab (CRUD):**
  - A data table displaying all gems.
  - Edit and Delete functionality for individual items.
  - Form to manually Add/Update a single gem with file inputs for `imageUrl` and gallery `images`.
- **Bulk CSV Import Feature (Inventory):**
  - A "Bulk Import CSV" button that opens a native file picker.
  - Client-side parsing of the CSV file.
  - **Validation logic:** Verify required columns exist (Name, Price, Origin, Gem Type). Validate each row to ensure required fields have data and price is a valid number. Display an alert with failing rows if validation fails.
  - Loop through valid rows and sequentially upload them as individual documents to the Firestore `gems` collection.

---

## 🎨 UI/UX Design System
- **Theme:** Clean, modern, minimalist "jewelry store layout".
- Use plentiful negative space, subtle grayscale borders (`border-slate-200`), and rounded corners.
- **Typography:** Inter or similar clean sans-serif for UI elements.
- **Load States:** Use text fallbacks or skeletal bounds when fetching from Firebase.
- Handle empty states gracefully (e.g., "No gems match your current filters" with a dimmed icon).
