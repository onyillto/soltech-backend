import { Schema, model, Document, Types } from "mongoose";

/**
 * A farmer, market woman, or trader who places produce into cold storage.
 * Not an auth principal — clients never log in; an admin/operator creates
 * and manages this record on their behalf (see BasketRental.client).
 */
export interface IClient extends Document {
  name: string;
  phone: string;
  email?: string;
  organization?: Types.ObjectId;
  location?: {
    community?: string;
    state?: string;
    country?: string;
  };
  notes?: string;
  /** The admin/operator who registered this client. */
  createdBy?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    organization: { type: Schema.Types.ObjectId, ref: "Organization" },
    location: {
      community: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: "Nigeria" },
    },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

clientSchema.index({ phone: 1 });

export const Client = model<IClient>("Client", clientSchema);
