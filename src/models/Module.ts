import { Schema, model, Document, Types } from "mongoose";

export interface IModuleResource {
  type: "video" | "document" | "link" | "ai_simulation";
  url: string;
  title?: string;
}

export interface IModule extends Document {
  course: Types.ObjectId;
  title: string;
  content: string;
  order: number;
  resources: IModuleResource[];
  createdAt: Date;
  updatedAt: Date;
}

const moduleSchema = new Schema<IModule>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    order: { type: Number, required: true, min: 0, default: 0 },
    resources: [
      {
        type: { type: String, enum: ["video", "document", "link", "ai_simulation"], required: true },
        url: { type: String, required: true },
        title: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);

moduleSchema.index({ course: 1, order: 1 });

export const Module = model<IModule>("Module", moduleSchema);
