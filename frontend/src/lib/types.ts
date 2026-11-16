export type Label = "cataract" | "normal";

export type Prediction = {
  id: string;
  label: Label;
  confidence: number;
  probabilities: Record<Label, number>;
  inferenceMs: number;
  createdAt: string;
  imageUrl: string;
};