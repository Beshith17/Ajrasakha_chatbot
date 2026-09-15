import { Schema, model } from 'mongoose';
const userSchema = new Schema({
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        sparse: true,
    },
    phone: {
        type: String,
        trim: true,
        unique: true,
        sparse: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    passwordSalt: {
        type: String,
        required: true,
    },
    displayName: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});
export const UserModel = model('User', userSchema);
