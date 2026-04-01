type CategoryRule = {
  category: string;
  titlePatterns: RegExp[];
  channelPatterns: RegExp[];
};

const rules: CategoryRule[] = [
  {
    category: "breaking",
    titlePatterns: [/\bbreaking\b/i, /\balert\b/i, /\bjust in\b/i, /\burgent\b/i],
    channelPatterns: [/breaking/i, /alert/i],
  },
  {
    category: "opinion",
    titlePatterns: [/\bopinion\b/i, /\bop-ed\b/i, /\bcolumn\b/i, /\beditorial\b/i, /\bcommentary\b/i],
    channelPatterns: [/opinion/i],
  },
  {
    category: "briefing",
    titlePatterns: [/\bbriefing\b/i, /\bmorning\b/i, /\bevening\b/i, /\bdaily\b/i, /\bdigest\b/i, /\bnewsletter\b/i],
    channelPatterns: [/briefing/i, /digest/i],
  },
  {
    category: "sports",
    titlePatterns: [/\bsports?\b/i, /\bnfl\b/i, /\bnba\b/i, /\bmlb\b/i, /\bfifa\b/i, /\bolympic/i],
    channelPatterns: [/sport/i],
  },
  {
    category: "politics",
    titlePatterns: [
      /\bcongress\b/i, /\bsenate\b/i, /\bwhite house\b/i, /\bpresident\b/i,
      /\belection\b/i, /\bsupreme court\b/i, /\blegislat/i,
    ],
    channelPatterns: [/politic/i],
  },
];

export function categorize(title: string, body: string | null, androidChannel: string | null): string {
  for (const rule of rules) {
    for (const pattern of rule.titlePatterns) {
      if (pattern.test(title) || (body && pattern.test(body))) {
        return rule.category;
      }
    }
    if (androidChannel) {
      for (const pattern of rule.channelPatterns) {
        if (pattern.test(androidChannel)) {
          return rule.category;
        }
      }
    }
  }
  return "general";
}
