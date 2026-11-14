import sanitizeHtml from "sanitize-html";

/** Keep the formatting the editor produces; drop scripts, styles and event handlers. */
export function cleanHtml(html: string | null | undefined): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "blockquote", "code", "pre", "hr", "img", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
  });
}

export const cleanI18nHtml = (v: Record<string, string>) =>
  Object.fromEntries(Object.entries(v).map(([k, html]) => [k, cleanHtml(html)]));
