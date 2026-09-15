import { Schema, model, Document, Types } from "mongoose";

/** One of the modular, stackable cold baskets that make up a cooling unit's capacity. */
export interface IBasket extends Document {
  unit: Types.ObjectId;
  basketNumber: number;
  status: "available" | "occupied" | "maintenance";
  capacityKg?: number;
  /** Free-text description of where it physically sits, e.g. "Row 3, Position 7" —
   *  auto-filled in that shape by POST /baskets/bulk when basketsPerRow is given,
   *  editable afterward for whatever actually matches the unit's layout. */
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const basketSchema = new Schema<IBasket>(
  {
    unit: { type: Schema.Types.ObjectId, ref: "CoolingUnit", required: true },
    basketNumber: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["available", "occupied", "maintenance"],
      default: "available",
    },
    capacityKg: { type: Number, min: 0 },
    location: { type: String, trim: true },
  },
  { timestamps: true }
);

basketSchema.index({ unit: 1, basketNumber: 1 }, { unique: true });

export const Basket = model<IBasket>("Basket", basketSchema);
