export interface Choice {
  text: string;
  nextChapterId: string;
  coinsCost?: number;
}

export interface Chapter {
  id: string;
  storyId: string;
  title: string;
  order?: number;
  content: string;
  wordCount?: number;
  coinsCost?: number;
  choices?: Choice[];
  updatedAt?: string;
}

export interface Story {
  id: string;
  title: string;
  author: string;
  description: string;
  genre: string;
  tags?: string[];
  coverImage: string;
  bannerImage?: string;
  status: 'ongoing' | 'completed';
  featured?: boolean;
  trending?: boolean;
  coinsRequired?: number;
  rating?: number;
  readCount?: number;
  totalChapters?: number;
  chapters?: Chapter[];
  updatedAt?: string;
}

export interface ReadingGoals {
  dailyChapters: number;
  weeklyActiveDays: number;
  monthlyPages: number;
}

export interface BankTransferRequest {
  id: string; // Unique Reference code e.g. NIVE-TX-7A9K32
  userId: string;
  userEmail: string;
  username: string;
  packageId: string;
  title: string;
  coins: number;
  amount: string;
  currency: string;
  paymentMethod?: 'bank_transfer' | 'paystack';
  proofImage?: string; // Receipt screenshot URL or base64
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
}

export interface StoreSettings {
  bankName: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  currencySymbol: string;
  whatsappNumber: string;
  paystackPublicKey: string;
  enableBankTransfer: boolean;
  enablePaystack: boolean;
  exchangeRateNgn?: number;
}

export interface UserProfile {
  id?: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  genres?: string[];
  followers: string[];
  following: string[];
  level: number;
  xp: number;
  booksRead: number;
  chaptersCompleted: number;
  chaptersRead: number;
  pagesRead: number;
  minutesRead: number;
  readingSeconds: number;
  activeDays: string[];
  readChapters: string[];
  achievements: string[];
  specialBadges: string[];
  readingGoals: ReadingGoals;
  coins: number;
  streak: number;
  lastReadDate: string;
  lastChapter: {
    storyId?: string;
    chapterId?: string;
    title?: string;
    storyTitle?: string;
  };
  bookmarks: Array<{
    storyId: string;
    chapterId: string;
    timestamp?: string;
  }>;
  library: string[];
  favorites: string[];
  completedStories: string[];
  unlockedStories: string[];
  readingProgress: Record<string, {
    chapterId: string;
    percent: number;
    updatedAt?: string;
  }>;
  unlockedChapters: Record<string, string[]>;
  premium: boolean;
  role: 'reader' | 'admin';
  onboardingComplete: boolean;
  joined?: string;
}

export interface ReaderSettings {
  theme: 'dark' | 'light' | 'sepia';
  fontSize: number;
  lineSpacing: number;
  fontFamily: 'serif' | 'sans-serif';
  brightness: number;
  mode: 'scroll' | 'paged';
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  xp: number;
  coins: number;
}

export interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followers: number;
}

export interface ReadingList {
  id: string;
  title: string;
  description: string;
  owner: string;
  avatar: string;
  storyIds: string[];
  isPublic: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  storyId: string;
  chapterId: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: string;
}
