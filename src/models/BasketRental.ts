import { Schema, model, Document, Types } from "mongoose";
import { DEFAULT_BASKET_RATE_KOBO } from "../constants/billing";

/** One produce item placed in the basket for this rental — a client can mix several. */
export interface IBasketRentalItem {
  produceType: string;
  quantityKg: number;
}

/** A pay-per-use occupation of a basket by a farmer/trader, billed at a daily rate. */
export interface IBasketRental extends Document {
  basket: Types.ObjectId;
  renter: Types.ObjectId;
  /** Every produce item loaded into the basket for this rental (weighed on the client's scale). */
  items: IBasketRentalItem[];
  /** Sum of items[].quantityKg — kept denormalized since it drives capacity checks, pricing, and reporting. */
  totalQuantityKg: number;
  startAt: Date;
  endAt?: Date;
  rateKoboPerDay: number;
  totalDays?: number;
  amountDueKobo?: number;
  status: "active" | "closed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const basketRentalItemSchema = new Schema<IBasketRentalItem>(
  {
    produceType: { type: String, required: true, trim: true },
    quantityKg: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const basketRentalSchema = new Schema<IBasketRental>(
  {
    basket: { type: Schema.Types.ObjectId, ref: "Basket", required: true },
    renter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: {
      type: [basketRentalItemSchema],
      required: true,
      validate: {
        validator: (items: IBasketRentalItem[]) => Array.isArray(items) && items.length > 0,
        message: "At least one produce item is required",
      },
    },
    totalQuantityKg: { type: Number, required: true, min: 0 },
    startAt: { type: Date, required: true, default: Date.now },
    endAt: { type: Date },
    rateKoboPerDay: { type: Number, required: true, min: 0, default: DEFAULT_BASKET_RATE_KOBO },
    totalDays: { type: Number, min: 0 },
    amountDueKobo: { type: Number, min: 0 },
    status: { type: String, enum: ["active", "closed", "cancelled"], default: "active" },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

basketRentalSchema.index({ basket: 1, status: 1 });
basketRentalSchema.index({ startAt: -1 });

export const BasketRental = model<IBasketRental>("BasketRental", basketRentalSchema);
