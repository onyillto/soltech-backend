import { Schema, model, Document, Types } from "mongoose";

/** One of the modular, stackable cold baskets that make up a cooling unit's capacity. */
export interface IBasket extends Document {
  unit: Types.ObjectId;
  basketNumber: number;
  status: "available" | "occupied" | "maintenance";
  capacityKg?: number;
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
  },
  { timestamps: true }
);

basketSchema.index({ unit: 1, basketNumber: 1 }, { unique: true });

export const Basket = model<IBasket>("Basket", basketSchema);
