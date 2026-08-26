import { crudFactory } from "../utils/crudFactory";
import { Course } from "../models/Course";

export const courseController = crudFactory(Course, {
  populate: "instructor",
  filterableFields: ["category", "level", "isPublished", "instructor"],
});
