export const LEARNING_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export type LearningDifficulty = (typeof LEARNING_DIFFICULTIES)[number];

export const LEARNING_STYLE = "comic" as const;

export type LearningStyle = typeof LEARNING_STYLE;

export type LearningPlan = {
  topic: string;
  difficulty: LearningDifficulty;
  concepts: string[];
  analogy: string;
  learningStyle: LearningStyle;
};

export type PlanLearningInput = {
  question: string;
};

export type Story = {
  title: string;
  setting: string;
  characters: string[];
  story: string;
  moral: string;
};

export type ComicPanel = {
  id: number;
  scene: string;
  narration: string;
  dialogue: string;
  visualDescription: string;
  learningPoint: string;
};

export type ComicPlan = {
  title: string;
  panels: ComicPanel[];
};

export const IMAGE_PROMPT_STYLE = "educational comic" as const;

export type ImagePromptStyle = typeof IMAGE_PROMPT_STYLE;

export type ImagePromptPanel = {
  id: number;
  imagePrompt: string;
};

export type ImagePromptPlan = {
  style: ImagePromptStyle;
  panels: ImagePromptPanel[];
};

export type RenderedPanel = {
  id: number;
  imageUrl: string;
  narration: string;
  dialogue: string;
  learningPoint: string;
  error?: string;
};

export type RenderedComic = {
  title: string;
  style: string;
  panels: RenderedPanel[];
};

export type CharacterBibleCharacter = {
  id: string;
  name: string;
  role: string;
  age: string;
  gender: string;
  appearance: string;
  hairstyle: string;
  clothing: string;
  accessories: string;
  personality: string;
  facialFeatures: string;
  colorPalette: string;
};

export type CharacterBibleEnvironment = {
  id: string;
  name: string;
  description: string;
};

export type CharacterBible = {
  characters: CharacterBibleCharacter[];
  environments: CharacterBibleEnvironment[];
  artStyle: string;
  negativePrompt: string;
};

export type ScenePanel = {
  id: number;
  sceneDescription: string;
  characters: string[];
  environment: string;
  imageContext: string;
  narration: string;
  dialogue: string;
  learningPoint: string;
};

export type ScenePlan = {
  title: string;
  artStyle: string;
  panels: ScenePanel[];
};

export type ValidationResult = {
  isValid: boolean;
  score: number;
  feedback: string[];
  improvements: string[];
  correctedPanels: ComicPanel[];
};
