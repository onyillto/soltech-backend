import { crudFactory } from "../utils/crudFactory";
import { Organization } from "../models/Organization";

export const organizationController = crudFactory(Organization, {
  populate: "contactPerson",
  filterableFields: ["type", "state"],
});
