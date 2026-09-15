import { signInWithPopup, signOut } from 'firebase/auth';
import { createContext, useContext, useMemo, useState } from 'react';
import { signinWithPassword, signupWithPassword } from '../api';
import { auth, googleProvider } from '../firebase';
const AuthContext = createContext(undefined);
const STORAGE_KEY = 'ajrasakha-user-profiles';
const CONTACTS_STORAGE_KEY = 'ajrasakha-user-contacts';
const AUTH_USER_STORAGE_KEY = 'ajrasakha-auth-user';
function readJson(key, fallback) {
    if (typeof window === 'undefined') {
        return fallback;
    }
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    }
    catch {
        return fallback;
    }
}
function writeJson(key, value) {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
}
function removeItem(key) {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.removeItem(key);
}
function readProfiles() {
    return readJson(STORAGE_KEY, {});
}
function writeProfiles(profiles) {
    writeJson(STORAGE_KEY, profiles);
}
function readContacts() {
    return readJson(CONTACTS_STORAGE_KEY, {});
}
function writeContacts(contacts) {
    writeJson(CONTACTS_STORAGE_KEY, contacts);
}
function readStoredUser() {
    return readJson(AUTH_USER_STORAGE_KEY, null);
}
function toGoogleAppUser(firebaseUser) {
    return {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? undefined,
        phoneNumber: firebaseUser.phoneNumber ?? undefined,
        displayName: firebaseUser.displayName ?? undefined,
    };
}
export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => readStoredUser());
    const [profile, setProfile] = useState(() => {
        const storedUser = readStoredUser();
        if (!storedUser) {
            return null;
        }
        return readProfiles()[storedUser.uid] ?? null;
    });
    const [contactInfo, setContactInfo] = useState(() => {
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
    function setAuthenticatedUser(nextUser, nextContactInfo) {
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
    const value = useMemo(() => ({
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
    }), [contactInfo, loading, profile, user]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
