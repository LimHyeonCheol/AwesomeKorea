import type { AppBindings } from "../types";

export const ensureBootstrapContentData = async (_env: AppBindings["Bindings"]) => {
  // Automatic bootstrap collection is disabled until the search quota strategy is redesigned.
  return false;
};
