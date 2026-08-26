import { crudFactory } from "../utils/crudFactory";
import { User } from "../models/User";

export const userController = crudFactory(User, {
  populate: "organization",
  filterableFields: ["role", "organization"],
});
