import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, Role } from "../constants/roles";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
  organization?: Types.ObjectId;
  location?: {
    community?: string;
    state?: string;
    country?: string;
  };
  isActive: boolean;
  /** The bootstrap admin created by `npm run create-admin` — the fallback alert
   *  recipient for any hub that hasn't been assigned to a specific admin/staff yet. */
  isMainAdmin: boolean;
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ROLES, default: "learner", required: true },
    organization: { type: Schema.Types.ObjectId, ref: "Organization" },
    location: {
      community: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: "Nigeria" },
    },
    isActive: { type: Boolean, default: true },
    isMainAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser>("User", userSchema);
