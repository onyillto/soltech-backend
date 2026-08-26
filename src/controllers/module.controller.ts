import { crudFactory } from "../utils/crudFactory";
import { Module } from "../models/Module";

export const moduleController = crudFactory(Module, {
  populate: "course",
  filterableFields: ["course"],
});
