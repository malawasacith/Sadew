export interface Gem {
  id: string;
  name: string;
  gemType?: string;
  origin: string;
  shape: string;
  dimensions: string;
  weight: number;
  treatment: string;
  price: number;
  buyingPrice?: number;
  salePercentage?: number;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  status?: 'available' | 'on_sale' | 'sold';
  basicColour?: string;
  tradeColor?: string;
  cutGrade?: 'Very good' | 'Good' | 'Ok' | '';
  supplier?: string;
}

export interface StoreSettings {
  id?: string;
  name: string;
  logoUrl?: string;
  heroImageUrl?: string;
  heroImageUrls?: string[];
  heroHeadline?: string;
  heroSubheadline?: string;
  contactEmail?: string;
  inquiryEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  footerText?: string;
  footerBackgroundColor?: string;
  aboutText?: string;
  updatedAt?: number;
  loginPageName?: string;
  loginPageLogoUrl?: string;
  primaryColor?: string;
  saleBadgeColor?: string;
  soldBadgeColor?: string;
  fontFamily?: string;
  storePassword?: string;
  adminPassword?: string;
  
  // Email Settings
  emailMethod?: 'self_hosted' | 'user_client';
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
