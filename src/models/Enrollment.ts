import { Schema, model, Document, Types } from "mongoose";

export interface IEnrollment extends Document {
  learner: Types.ObjectId;
  course: Types.ObjectId;
  completedModules: Types.ObjectId[];
  progressPercent: number;
  status: "in_progress" | "completed" | "dropped";
  enrolledAt: Date;
  completedAt?: Date;
  certificateIssued: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    learner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    completedModules: [{ type: Schema.Types.ObjectId, ref: "Module" }],
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["in_progress", "completed", "dropped"],
      default: "in_progress",
    },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    certificateIssued: { type: Boolean, default: false },
  },
  { timestamps: true }
);

enrollmentSchema.index({ learner: 1, course: 1 }, { unique: true });

export const Enrollment = model<IEnrollment>("Enrollment", enrollmentSchema);
