import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
export async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, KEY_LENGTH));
    return {
        salt,
        hash: derivedKey.toString('hex'),
    };
}
export async function verifyPassword(password, salt, expectedHash) {
    const derivedKey = (await scrypt(password, salt, KEY_LENGTH));
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    if (derivedKey.length !== expectedBuffer.length) {
        return false;
    }
    return timingSafeEqual(derivedKey, expectedBuffer);
}
