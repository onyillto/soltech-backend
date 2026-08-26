import { Schema, model, Document, Types } from "mongoose";

export type OrganizationType =
  | "cooperative"
  | "community_group"
  | "training_center"
  | "market_association"
  | "ngo";

export interface IOrganization extends Document {
  name: string;
  type: OrganizationType;
  community?: string;
  state?: string;
  contactPerson?: Types.ObjectId;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: {
      type: String,
      enum: ["cooperative", "community_group", "training_center", "market_association", "ngo"],
      required: true,
    },
    community: { type: String, trim: true },
    state: { type: String, trim: true },
    contactPerson: { type: Schema.Types.ObjectId, ref: "User" },
    memberCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Organization = model<IOrganization>("Organization", organizationSchema);
