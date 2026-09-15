import { UserModel } from '../models/User.js';
import { hashPassword, verifyPassword } from '../services/password.service.js';
function normalizePhoneNumber(value) {
    return value.replace(/[\s()-]/g, '');
}
function getIdentifierType(value) {
    const trimmedValue = value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(trimmedValue)) {
        return 'email';
    }
    const normalizedPhone = normalizePhoneNumber(trimmedValue);
    const phonePattern = /^\+?[1-9]\d{9,14}$/;
    if (phonePattern.test(normalizedPhone)) {
        return 'phone';
    }
    return null;
}
function buildUserPayload(user) {
    return {
        uid: String(user._id),
        email: user.email,
        phoneNumber: user.phone,
        displayName: user.displayName ?? undefined,
    };
}
export async function signup(req, res) {
    const identifier = String(req.body.identifier ?? '').trim();
    const password = String(req.body.password ?? '');
    const displayName = String(req.body.displayName ?? '').trim();
    const identifierType = getIdentifierType(identifier);
    if (!identifierType) {
        return res.status(400).json({ message: 'Enter a valid email address or phone number.' });
    }
    if (password.trim().length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    const normalizedIdentifier = identifierType === 'email' ? identifier.toLowerCase() : normalizePhoneNumber(identifier);
    const existingUser = await UserModel.findOne(identifierType === 'email' ? { email: normalizedIdentifier } : { phone: normalizedIdentifier });
    if (existingUser) {
        return res.status(409).json({
            message: identifierType === 'email' ? 'This email is already registered.' : 'This phone number is already registered.',
        });
    }
    const { hash, salt } = await hashPassword(password);
    const user = await UserModel.create({
        email: identifierType === 'email' ? normalizedIdentifier : undefined,
        phone: identifierType === 'phone' ? normalizedIdentifier : undefined,
        passwordHash: hash,
        passwordSalt: salt,
        displayName: displayName || undefined,
    });
    return res.status(201).json({
        user: buildUserPayload(user),
        contactInfo: {
            email: user.email,
            phone: user.phone,
        },
    });
}
export async function signin(req, res) {
    const identifier = String(req.body.identifier ?? '').trim();
    const password = String(req.body.password ?? '');
    const identifierType = getIdentifierType(identifier);
    if (!identifierType) {
        return res.status(400).json({ message: 'Enter a valid email address or phone number.' });
    }
    if (!password.trim()) {
        return res.status(400).json({ message: 'Enter your password to continue.' });
    }
    const normalizedIdentifier = identifierType === 'email' ? identifier.toLowerCase() : normalizePhoneNumber(identifier);
    const user = await UserModel.findOne(identifierType === 'email' ? { email: normalizedIdentifier } : { phone: normalizedIdentifier });
    if (!user) {
        return res.status(401).json({
            message: identifierType === 'email'
                ? 'No account found for this email address.'
                : 'No account found for this phone number.',
        });
    }
    const isPasswordValid = await verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Incorrect password.' });
    }
    return res.status(200).json({
        user: buildUserPayload(user),
        contactInfo: {
            email: user.email,
            phone: user.phone,
        },
    });
}
