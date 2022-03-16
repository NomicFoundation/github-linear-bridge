/**
 * This file has a mapping between Github and Linear users. It is used by the Vercel app and by the Github Actions.
 */
export const LINEAR_DISPLAY_NAME_TO_GH_LOGIN: {
  [displayName: string]: string;
} = {
  pato: "alcuadrado",
  gene: "feuGeneA",
  ["franco.victorio"]: "fvictorio",
  john: "kanej",
  morgan: "morgansliman",
};

export const GH_LOGIN_to_LINEAR_DISPLAY_NAME: { [login: string]: string } =
  Object.fromEntries(
    Object.entries(LINEAR_DISPLAY_NAME_TO_GH_LOGIN).map(([k, v]) => [v, k])
  );
