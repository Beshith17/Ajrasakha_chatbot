import { Schema, model } from 'mongoose';

export interface UserDocument {
  email?: string;
  phone?: string;
  passwordHash: string;
  passwordSalt: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
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
  },
  {
    timestamps: true,
  },
);

export const UserModel = model<UserDocument>('User', userSchema);
