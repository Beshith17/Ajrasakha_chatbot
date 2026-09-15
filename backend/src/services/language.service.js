const languageNames = {
    en: 'English',
    hi: 'Hindi',
    te: 'Telugu',
    ta: 'Tamil',
    kn: 'Kannada',
};
export function getSupportedLanguages() {
    return Object.entries(languageNames).map(([code, label]) => ({ code, label }));
}
export function normalizeLanguage(language) {
    return language?.trim().toLowerCase() || 'en';
}
export async function translateText(text, targetLanguage) {
    const normalized = normalizeLanguage(targetLanguage);
    if (normalized === 'en') {
        return text;
    }
    return text;
}
