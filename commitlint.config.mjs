// Conventional Commits. El asunto puede ir en español y en minúscula.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "api",
        "web",
        "presentation",
        "domain",
        "data",
        "ui",
        "ingest",
        "mobile",
        "docs",
        "ci",
        "deps",
        "repo",
      ],
    ],
    "subject-case": [0],
  },
};
