import type { I18nText } from "./i18n-field";

export type AppRole = "user" | "editor" | "admin";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "desk_review"
  | "under_review"
  | "revision_required"
  | "accepted"
  | "rejected"
  | "published"
  | "withdrawn";

export const SUBMISSION_STATUSES: SubmissionStatus[] = [
  "draft",
  "submitted",
  "desk_review",
  "under_review",
  "revision_required",
  "accepted",
  "rejected",
  "published",
  "withdrawn",
];

export type ReviewStatus = "invited" | "accepted" | "declined" | "completed" | "cancelled";
export type ReviewRec = "accept" | "minor_revision" | "major_revision" | "reject";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  affiliation: string | null;
  orcid: string | null;
  role: AppRole;
  is_reviewer: boolean;
  preferred_locale: string;
  created_at: string;
}

export interface Journal {
  id: string;
  slug: string;
  title: I18nText;
  description: I18nText;
  issn_print: string | null;
  issn_online: string | null;
  publisher: string | null;
  cover_url: string | null;
  apc_amount: number;
  apc_currency: string;
  logo_url: string | null;
  contact_email: string | null;
  indexes: string[];
  cfp_deadline: string | null;
  cfp_text: I18nText;
}

export interface BoardMember {
  id: string;
  full_name: I18nText;
  position: I18nText;
  affiliation: I18nText;
  photo_url: string | null;
  orcid: string | null;
  position_type: "chief" | "deputy" | "member";
  sort_order: number;
}

export interface Conference {
  id: string;
  title: I18nText;
  description: I18nText;
  location: I18nText;
  start_date: string;
  end_date: string | null;
  registration_deadline: string | null;
  cover_url: string | null;
}

export interface NewsItem {
  id: string;
  title: I18nText;
  body: I18nText;
  date: string;
  pinned: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "status" | "invite" | "review" | "new";
  submission_id: string | null;
  status: SubmissionStatus | null;
  link: string;
  read: boolean;
  created_at: string;
}

export interface Section {
  id: string;
  journal_id: string;
  title: I18nText;
  sort_order: number;
}

export interface Volume {
  id: string;
  journal_id: string;
  number: number;
  year: number;
}

export interface Issue {
  id: string;
  volume_id: string;
  number: number;
  title: I18nText;
  description: I18nText;
  cover_url: string | null;
  is_special: boolean;
  status: "draft" | "published";
  published_at: string | null;
  conference_id: string | null;
}

export interface ArticleAuthor {
  name: string;
  affiliation?: string;
  orcid?: string;
  email?: string;
}

export interface Article {
  id: string;
  submission_id: string | null;
  journal_id: string;
  issue_id: string | null;
  section_id: string | null;
  title: string;
  title_i18n: I18nText;
  abstract: string;
  abstract_i18n: I18nText;
  keywords: string[];
  language: string;
  authors: ArticleAuthor[];
  references: string | null;
  first_page: number | null;
  last_page: number | null;
  doi: string | null;
  pdf_path: string | null;
  license: string;
  sort_order: number;
  status: "scheduled" | "published";
  published_at: string | null;
  views: number;
  downloads: number;
}

export interface Submission {
  id: string;
  journal_id: string;
  section_id: string | null;
  submitter_id: string;
  editor_id: string | null;
  status: SubmissionStatus;
  title: string;
  abstract: string;
  keywords: string[];
  language: string;
  references: string | null;
  cover_letter: string | null;
  decision_note: string | null;
  similarity_percent: number | null;
  similarity_note: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionAuthor {
  id: string;
  submission_id: string;
  full_name: string;
  email: string | null;
  affiliation: string | null;
  orcid: string | null;
  is_corresponding: boolean;
  sort_order: number;
}

export interface SubmissionFile {
  id: string;
  submission_id: string;
  kind: "manuscript" | "revision" | "review_attachment" | "final_pdf" | "other";
  storage_path: string;
  file_name: string;
  version: number;
  created_at: string;
}

export interface ReviewAssignment {
  id: string;
  submission_id: string;
  reviewer_id: string;
  round: number;
  status: ReviewStatus;
  recommendation: ReviewRec | null;
  comments_to_author: string | null;
  comments_to_editor: string | null;
  due_at: string | null;
  completed_at: string | null;
  scores: Partial<Record<ScoreKey, number>>;
}

export const SCORE_KEYS = ["originality", "methodology", "clarity", "significance"] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

export interface CmsPage {
  id: string;
  slug: string;
  title: I18nText;
  body: I18nText;
  is_published: boolean;
  show_in_menu: boolean;
  sort_order: number;
}
