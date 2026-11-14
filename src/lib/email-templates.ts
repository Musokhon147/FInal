/**
 * Messages the journal sends. Editors can change the wording in Admin → Emails; anything they
 * haven't changed uses these defaults. Placeholders in {{double braces}} are filled in when sending.
 */
export type Lang = "uz" | "ru" | "en";
export type L3 = Record<Lang, string>;

export const EMAIL_KEYS = [
  "submission_received", "review_invite", "review_reminder", "revision_required", "decision_accept", "decision_reject", "article_published",
] as const;
export type EmailKey = (typeof EMAIL_KEYS)[number];

/** Which placeholders each message can use (shown as insert buttons in the editor). */
export const EMAIL_VARS: Record<EmailKey, string[]> = {
  submission_received: ["author_name", "title", "journal", "link"],
  review_invite: ["reviewer_name", "title", "journal", "due_date", "link"],
  review_reminder: ["reviewer_name", "title", "journal", "due_date", "link"],
  revision_required: ["author_name", "title", "journal", "editor_note", "link"],
  decision_accept: ["author_name", "title", "journal", "editor_note", "link"],
  decision_reject: ["author_name", "title", "journal", "editor_note", "link"],
  article_published: ["author_name", "title", "journal", "issue", "doi", "link"],
};

export const SAMPLE_VARS: Record<string, string> = {
  author_name: "Aziz Karimov", reviewer_name: "Dr. Elena Ivanova", title: "Priority directions for developing the digital economy in Uzbekistan",
  journal: "Scientific Journal", link: "https://journal.example.uz/dashboard/submissions/123", due_date: "28.11.2026",
  editor_note: "Please shorten the introduction and add recent sources.", issue: "Vol. 3, No. 4 (2026)", doi: "10.00000/demo.2026.1",
};

export const DEFAULT_EMAILS: Record<EmailKey, { subject: L3; body: L3 }> = {
  submission_received: {
    subject: { uz: "Maqolangiz qabul qilindi: {{title}}", ru: "Ваша статья получена: {{title}}", en: "We received your manuscript: {{title}}" },
    body: {
      uz: "Hurmatli {{author_name}},\n\n«{{title}}» maqolangiz {{journal}} jurnaliga muvaffaqiyatli yuborildi. Tahririyat uni ko'rib chiqadi va natija haqida xabar beradi.\n\nMaqola holatini shaxsiy kabinetingizda kuzatishingiz mumkin:\n{{link}}\n\nHurmat bilan,\n{{journal}} tahririyati",
      ru: "Уважаемый(ая) {{author_name}},\n\nВаша статья «{{title}}» успешно отправлена в журнал {{journal}}. Редакция рассмотрит её и сообщит о решении.\n\nСледить за статусом можно в личном кабинете:\n{{link}}\n\nС уважением,\nредакция {{journal}}",
      en: "Dear {{author_name}},\n\nYour manuscript \"{{title}}\" has been submitted to {{journal}}. The editors will review it and let you know their decision.\n\nYou can follow its progress in your account:\n{{link}}\n\nKind regards,\nThe editors of {{journal}}",
    },
  },
  review_invite: {
    subject: { uz: "Taqriz so'rovi: {{title}}", ru: "Приглашение к рецензированию: {{title}}", en: "Invitation to review: {{title}}" },
    body: {
      uz: "Hurmatli {{reviewer_name}},\n\nSizni {{journal}} jurnaliga yuborilgan «{{title}}» maqolasiga taqriz yozishga taklif qilamiz. Taqriz muddati: {{due_date}}.\n\nTaklifni qabul qilish yoki rad etish uchun:\n{{link}}\n\nHurmat bilan,\n{{journal}} tahririyati",
      ru: "Уважаемый(ая) {{reviewer_name}},\n\nПриглашаем вас отрецензировать статью «{{title}}», поступившую в журнал {{journal}}. Срок рецензии: {{due_date}}.\n\nПринять или отклонить приглашение:\n{{link}}\n\nС уважением,\nредакция {{journal}}",
      en: "Dear {{reviewer_name}},\n\nWe would like to invite you to review \"{{title}}\", submitted to {{journal}}. The review is due by {{due_date}}.\n\nAccept or decline the invitation here:\n{{link}}\n\nKind regards,\nThe editors of {{journal}}",
    },
  },
  review_reminder: {
    subject: { uz: "Eslatma: taqriz muddati {{due_date}}", ru: "Напоминание: срок рецензии {{due_date}}", en: "Reminder: review due {{due_date}}" },
    body: {
      uz: "Hurmatli {{reviewer_name}},\n\n«{{title}}» maqolasi bo'yicha taqriz muddati {{due_date}} kuni tugaydi. Taqrizni shu yerda yuborishingiz mumkin:\n{{link}}\n\nRahmat!\n{{journal}} tahririyati",
      ru: "Уважаемый(ая) {{reviewer_name}},\n\nСрок рецензии на статью «{{title}}» истекает {{due_date}}. Отправить рецензию можно здесь:\n{{link}}\n\nСпасибо!\nРедакция {{journal}}",
      en: "Dear {{reviewer_name}},\n\nA friendly reminder that your review of \"{{title}}\" is due on {{due_date}}. You can submit it here:\n{{link}}\n\nThank you!\nThe editors of {{journal}}",
    },
  },
  revision_required: {
    subject: { uz: "Maqolani qayta ishlash kerak: {{title}}", ru: "Требуется доработка: {{title}}", en: "Revisions requested: {{title}}" },
    body: {
      uz: "Hurmatli {{author_name}},\n\nTaqrizchilar «{{title}}» maqolangizni ko'rib chiqishdi. Maqolani quyidagi izohlar asosida qayta ishlashingizni so'raymiz:\n\n{{editor_note}}\n\nQayta ishlangan variantni shu yerda yuklang:\n{{link}}\n\nHurmat bilan,\n{{journal}} tahririyati",
      ru: "Уважаемый(ая) {{author_name}},\n\nРецензенты рассмотрели вашу статью «{{title}}». Просим доработать её с учётом замечаний:\n\n{{editor_note}}\n\nЗагрузите исправленную версию здесь:\n{{link}}\n\nС уважением,\nредакция {{journal}}",
      en: "Dear {{author_name}},\n\nThe reviewers have read \"{{title}}\". Please revise the manuscript following these comments:\n\n{{editor_note}}\n\nUpload the revised version here:\n{{link}}\n\nKind regards,\nThe editors of {{journal}}",
    },
  },
  decision_accept: {
    subject: { uz: "Maqolangiz qabul qilindi: {{title}}", ru: "Статья принята к публикации: {{title}}", en: "Accepted for publication: {{title}}" },
    body: {
      uz: "Hurmatli {{author_name}},\n\nTabriklaymiz! «{{title}}» maqolangiz {{journal}} jurnalida nashr etish uchun qabul qilindi.\n\n{{editor_note}}\n\nBatafsil: {{link}}\n\nHurmat bilan,\n{{journal}} tahririyati",
      ru: "Уважаемый(ая) {{author_name}},\n\nПоздравляем! Ваша статья «{{title}}» принята к публикации в журнале {{journal}}.\n\n{{editor_note}}\n\nПодробнее: {{link}}\n\nС уважением,\nредакция {{journal}}",
      en: "Dear {{author_name}},\n\nCongratulations! \"{{title}}\" has been accepted for publication in {{journal}}.\n\n{{editor_note}}\n\nDetails: {{link}}\n\nKind regards,\nThe editors of {{journal}}",
    },
  },
  decision_reject: {
    subject: { uz: "Maqola bo'yicha qaror: {{title}}", ru: "Решение по статье: {{title}}", en: "Decision on your manuscript: {{title}}" },
    body: {
      uz: "Hurmatli {{author_name}},\n\nAfsuski, «{{title}}» maqolangizni {{journal}} jurnalida nashr eta olmaymiz.\n\n{{editor_note}}\n\nJurnalimizni tanlaganingiz uchun rahmat.\n{{journal}} tahririyati",
      ru: "Уважаемый(ая) {{author_name}},\n\nК сожалению, мы не можем опубликовать вашу статью «{{title}}» в журнале {{journal}}.\n\n{{editor_note}}\n\nБлагодарим, что выбрали наш журнал.\nРедакция {{journal}}",
      en: "Dear {{author_name}},\n\nWe regret that we are unable to publish \"{{title}}\" in {{journal}}.\n\n{{editor_note}}\n\nThank you for considering our journal.\nThe editors of {{journal}}",
    },
  },
  article_published: {
    subject: { uz: "Maqolangiz nashr etildi: {{title}}", ru: "Ваша статья опубликована: {{title}}", en: "Your article is published: {{title}}" },
    body: {
      uz: "Hurmatli {{author_name}},\n\n«{{title}}» maqolangiz {{journal}}, {{issue}} sonida nashr etildi.\nDOI: {{doi}}\n\nMaqola sahifasi: {{link}}\n\nHurmat bilan,\n{{journal}} tahririyati",
      ru: "Уважаемый(ая) {{author_name}},\n\nВаша статья «{{title}}» опубликована в журнале {{journal}}, {{issue}}.\nDOI: {{doi}}\n\nСтраница статьи: {{link}}\n\nС уважением,\nредакция {{journal}}",
      en: "Dear {{author_name}},\n\n\"{{title}}\" is now published in {{journal}}, {{issue}}.\nDOI: {{doi}}\n\nArticle page: {{link}}\n\nKind regards,\nThe editors of {{journal}}",
    },
  },
};

/** Fills {{placeholders}}; unknown ones are left as they are so mistakes are visible. */
export function fillTemplate(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/** The text to send: the editors' version when they saved one for this language, otherwise the default. */
export function resolveEmail(key: EmailKey, lang: Lang, saved?: { subject?: Partial<L3>; body?: Partial<L3> } | null) {
  const d = DEFAULT_EMAILS[key];
  return { subject: saved?.subject?.[lang]?.trim() || d.subject[lang], body: saved?.body?.[lang]?.trim() || d.body[lang] };
}

/** Ready-to-send message (used when email sending is connected). */
export function renderEmail(key: EmailKey, lang: Lang, vars: Record<string, string>, saved?: { subject?: Partial<L3>; body?: Partial<L3> } | null) {
  const t = resolveEmail(key, lang, saved);
  return { subject: fillTemplate(t.subject, vars), text: fillTemplate(t.body, vars) };
}
