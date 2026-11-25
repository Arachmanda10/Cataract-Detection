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

export type Dashboard = {
  predictions: {
    total: number;
    cataract: number;
    normal: number;
    avgConfidence: number | null;
  };
  feedback: {
    total: number;
    correct: number;
    incorrect: number;
    correctRate: number | null;
  };
  daily: { date: string; total: number }[]; // date: "YYYY-MM-DD" (UTC)
  recent: { id: string; label: Label; confidence: number; createdAt: string }[];
};