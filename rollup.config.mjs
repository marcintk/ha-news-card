import { cardBundle } from "ha-card-shared/rollup.base.mjs";

const cssAsString = {
  name: "css-string",
  transform(code, id) {
    if (id.endsWith(".css")) {
      return { code: `export default ${JSON.stringify(code)};`, map: null };
    }
  },
};

const base = cardBundle();
export default {
  ...base,
  plugins: [...base.plugins, cssAsString],
};
