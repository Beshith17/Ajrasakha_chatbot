import { signInWithPopup, signOut } from 'firebase/auth';
import { ReactNode, createContext, useContext, useMemo, useState } from 'react';

import { signinWithPassword, signupWithPassword } from '../api';
import { auth, googleProvider } from '../firebase';
import type { AppUser, UserProfile } from '../types';

interface ContactInfo {
  email?: string;
  phone?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  profile: UserProfile | null;
  contactInfo: ContactInfo | null;
  roleReady: boolean;
  login(identifier: string, password: string): Promise<void>;
  signup(identifier: string, password: string): Promise<void>;
  loginWithGoogle(): Promise<void>;
  saveProfile(profile: UserProfile): void;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'ajrasakha-user-profiles';
const CONTACTS_STORAGE_KEY = 'ajrasakha-user-contacts';
const AUTH_USER_STORAGE_KEY = 'ajrasakha-auth-user';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeItem(key: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(key);
}

function readProfiles(): Record<string, UserProfile> {
  return readJson<Record<string, UserProfile>>(STORAGE_KEY, {});
}

function writeProfiles(profiles: Record<string, UserProfile>) {
  writeJson(STORAGE_KEY, profiles);
}

function readContacts(): Record<string, ContactInfo> {
  return readJson<Record<string, ContactInfo>>(CONTACTS_STORAGE_KEY, {});
}

function writeContacts(contacts: Record<string, ContactInfo>) {
  writeJson(CONTACTS_STORAGE_KEY, contacts);
}

function readStoredUser() {
  return readJson<AppUser | null>(AUTH_USER_STORAGE_KEY, null);
}

function toGoogleAppUser(firebaseUser: {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
}): AppUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? undefined,
    phoneNumber: firebaseUser.phoneNumber ?? undefined,
    displayName: firebaseUser.displayName ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => readStoredUser());
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const storedUser = readStoredUser();
    if (!storedUser) {
      return null;
    }

    return readProfiles()[storedUser.uid] ?? null;
  });
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(() => {
    const storedUser = readStoredUser();
    if (!storedUser) {
      return null;
    }

    const storedContact = readContacts()[storedUser.uid];

    if (storedContact?.email || storedContact?.phone) {
      return storedContact;
    }

    return {
      email: storedUser.email,
      phone: storedUser.phoneNumber,
    };
  });
  const [loading] = useState(false);

  function setAuthenticatedUser(nextUser: AppUser | null, nextContactInfo?: ContactInfo | null) {
    setUser(nextUser);

    if (!nextUser) {
      removeItem(AUTH_USER_STORAGE_KEY);
      setProfile(null);
      setContactInfo(null);
      return;
    }

    writeJson(AUTH_USER_STORAGE_KEY, nextUser);
    setProfile(readProfiles()[nextUser.uid] ?? null);

    const mergedContactInfo = {
      email: nextContactInfo?.email ?? nextUser.email,
      phone: nextContactInfo?.phone ?? nextUser.phoneNumber,
    };

    const contacts = readContacts();
    contacts[nextUser.uid] = {
      ...contacts[nextUser.uid],
      ...mergedContactInfo,
    };
    writeContacts(contacts);
    setContactInfo(contacts[nextUser.uid]);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      contactInfo,
      loading,
      roleReady: Boolean(profile),
      async login(identifier, password) {
        const response = await signinWithPassword({ identifier, password });
        setAuthenticatedUser(response.user, response.contactInfo);
      },
      async signup(identifier, password) {
        const response = await signupWithPassword({ identifier, password });
        setAuthenticatedUser(response.user, response.contactInfo);
      },
      async loginWithGoogle() {
        const userCredential = await signInWithPopup(auth, googleProvider);
        const nextUser = toGoogleAppUser(userCredential.user);
        setAuthenticatedUser(nextUser, {
          email: nextUser.email,
          phone: nextUser.phoneNumber,
        });
      },
      saveProfile(nextProfile) {
        if (!user) {
          return;
        }

        const profiles = readProfiles();
        profiles[user.uid] = nextProfile;
        writeProfiles(profiles);
        setProfile(nextProfile);

        if (user.displayName !== nextProfile.displayName) {
          const nextUser = {
            ...user,
            displayName: nextProfile.displayName,
          };

          setUser(nextUser);
          writeJson(AUTH_USER_STORAGE_KEY, nextUser);
        }
      },
      async logout() {
        await signOut(auth).catch(() => undefined);
        setAuthenticatedUser(null);
      },
    }),
    [contactInfo, loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
