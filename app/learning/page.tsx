"use client";

import { LearningViewer } from "@/components/learning/LearningViewer";
import type {
  ComicPlan,
  LearningPlan,
  RenderedComic,
  Story,
} from "@/lib/learning";

const emptyPlan: LearningPlan = {
  topic: "",
  difficulty: "beginner",
  concepts: [],
  analogy: "",
  learningStyle: "comic",
};

const emptyStory: Story = {
  title: "Learning Viewer",
  setting: "",
  characters: [],
  story: "",
  moral: "",
};

const emptyComicPlan: ComicPlan = {
  title: "",
  panels: [],
};

const emptyRenderedComic: RenderedComic = {
  title: "",
  style: "",
  panels: [],
};

export default function LearningPage() {
  return (
    <main className="min-h-full bg-background">
      <LearningViewer
        plan={emptyPlan}
        story={emptyStory}
        comicPlan={emptyComicPlan}
        renderedComic={emptyRenderedComic}
      />
    </main>
  );
}
