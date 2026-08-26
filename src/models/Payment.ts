import { Schema, model, Document, Types } from "mongoose";

export interface IPayment extends Document {
  rental: Types.ObjectId;
  amountKobo: number;
  method: "cash" | "transfer" | "mobile_money" | "card";
  status: "pending" | "paid" | "failed" | "refunded";
  reference?: string;
  recordedBy?: Types.ObjectId;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    rental: { type: Schema.Types.ObjectId, ref: "BasketRental", required: true },
    amountKobo: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ["cash", "transfer", "mobile_money", "card"], required: true },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "paid" },
    reference: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
    paidAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

paymentSchema.index({ rental: 1 });

export const Payment = model<IPayment>("Payment", paymentSchema);
