/** Demo mode only: believable body text for sample articles, used for the sample PDFs and full-text search. */
type A = { title: string; title_i18n?: Record<string, string>; keywords: string[]; abstract: string; abstract_i18n?: Record<string, string>; authors: { name: string; affiliation?: string }[] };

export function demoSections(a: A) {
  const topic = a.title_i18n?.en || a.title;
  const k = a.keywords.length ? a.keywords : ["research"];
  const kw = (i: number) => k[i % k.length];
  return [
    { h: "Abstract", p: a.abstract_i18n?.en || a.abstract },
    { h: "1. Introduction", p: `This paper addresses ${topic.charAt(0).toLowerCase() + topic.slice(1)}. Interest in ${kw(0)} has grown across Central Asia over the last decade, yet comparable evidence remains scarce. We review the policy background, outline the main open questions about ${kw(1)}, and set out the contribution of the study for researchers and practitioners in Uzbekistan and neighbouring countries.` },
    { h: "2. Literature review", p: `Earlier work on ${kw(0)} focused on national statistics and case studies. More recent studies link ${kw(1)} with institutional quality, regional development and human capital. Several authors note that methods borrowed from OECD countries need adapting to local conditions, in particular where data on ${kw(2)} are collected irregularly.` },
    { h: "3. Data and methods", p: `The study combines official statistics for 2015 to 2025 with a survey of 412 respondents and twelve expert interviews. We apply descriptive statistics, correlation analysis and a panel regression. Robustness checks use alternative definitions of ${kw(2)} and exclude the pandemic years 2020 and 2021.` },
    { h: "4. Results", p: `The results show a steady improvement in indicators of ${kw(0)}, with the strongest gains in Tashkent, Samarkand and the Fergana valley. The relationship between ${kw(1)} and regional output is positive and significant. Respondents named access to finance, skills and regulation as the main barriers; 63 percent expect conditions to improve within three years.` },
    { h: "5. Discussion", p: `These findings are consistent with international evidence while pointing to features specific to the region. Policy makers could prioritise ${kw(3 % k.length)}, simplify procedures and invest in training. Limitations include the short time series and self-reported survey answers, which future studies should address with administrative microdata.` },
    { h: "6. Conclusion", p: `We conclude that ${kw(0)} offers substantial potential for sustainable growth when supported by consistent policy. The proposed indicators can be used to monitor progress and compare regions. Further research should examine long-run effects and the role of international cooperation.` },
  ];
}

export function demoFullText(a: A) {
  return demoSections(a).map((s) => `${s.h}\n${s.p}`).join("\n\n");
}
