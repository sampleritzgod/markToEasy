import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "coverage"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: [
        "lib/parser/**/*.ts",
        "lib/chunker/**/*.ts",
        "lib/chat-ui.ts",
        "lib/utils.ts",
        "lib/cache/**/*.ts",
        "lib/learning/planner.ts",
        "lib/learning/story-generator.ts",
        "lib/learning/comic-planner.ts",
        "lib/learning/image-prompt-generator.ts",
        "lib/learning/quiz-generator.ts",
        "lib/learning/learning-validator.ts",
        "lib/learning/style-router.ts",
        "lib/learning/concept-extractor.ts",
        "lib/learning/context-manager.ts",
        "lib/learning/adaptive-explainer.ts",
        "lib/learning/roadmap-generator.ts",
      ],
      exclude: ["**/*.d.ts", "**/*.test.ts", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
