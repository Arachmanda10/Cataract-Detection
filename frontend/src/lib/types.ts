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

export type Feedback = {
  isCorrect: boolean;
  comment : string | null;
  updatedAt: string;
};

//Get /api/predictions/:id:
export type PredictionDetail = Prediction & {
  feedback: Feedback | null;
};

export type Pagination = {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
};

export type PredictionList = {
  data: Prediction[];
  pagination: Pagination;
}