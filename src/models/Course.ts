import { Schema, model, Document, Types } from "mongoose";

export interface ICourse extends Document {
  title: string;
  description: string;
  category: "sustainable_cooling" | "solar_energy" | "food_preservation" | "business_skills";
  level: "beginner" | "intermediate" | "advanced";
  durationHours: number;
  instructor?: Types.ObjectId;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["sustainable_cooling", "solar_energy", "food_preservation", "business_skills"],
      required: true,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    durationHours: { type: Number, required: true, min: 0 },
    instructor: { type: Schema.Types.ObjectId, ref: "User" },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Course = model<ICourse>("Course", courseSchema);
