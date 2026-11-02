// Credit-free Amharic labels for common English procurement titles.
// The original English title stays in the summary so no source wording is lost.
const RULES: [RegExp, string][] = [
  [/spare\s*parts?|tyres?|tires?|batter(y|ies)|lubricant|engine oil/i, "የተሽከርካሪ መለዋወጫዎች ግዥ"],
  [/vehicle\s*(rent|rental|hire)|car\s*rent|rent(al)?\s*of\s*vehicles?/i, "የተሽከርካሪ ኪራይ"],
  [/sale\s*of\s*(used\s*)?vehicles?|vehicle\s*(disposal|sale)|auction/i, "የተሽከርካሪ/ንብረት ሽያጭ"],
  [/lease|leasing/i, "የኪራይ/ሊዝ ጨረታ"],
  [/laborator(y|ies)|reagents?|lab\s*equipment/i, "የላብራቶሪ ዕቃዎችና ሪኤጀንቶች ግዥ"],
  [/chemicals?/i, "የኬሚካል ግዥ"],
  [/construction\s*materials?|cement|reinforcement\s*bar|rebar|aggregate|sand/i, "የኮንስትራክሽን ዕቃዎች ግዥ"],
  [/construction|building|road\s*work|water\s*supply|maintenance\s*work|renovation/i, "የኮንስትራክሽን ሥራ"],
  [/medical|pharmaceutical|drugs?|medicines?/i, "የሕክምና ዕቃዎች ግዥ"],
  [/stationer(y|ies)|office\s*supplies|paper/i, "የጽሕፈት መሣሪያዎች ግዥ"],
  [/electronics?|computers?|laptops?|printers?|ict/i, "የኤሌክትሮኒክስና ኮምፒውተር ዕቃዎች ግዥ"],
  [/furniture/i, "የቢሮ ፈርኒቸር ግዥ"],
  [/printing/i, "የሕትመት አገልግሎት ግዥ"],
  [/uniforms?|clothing|garments?|shoes?/i, "የደንብ ልብስና ጫማ ግዥ"],
  [/cleaning|sanitation|detergents?/i, "የጽዳት ዕቃዎች ግዥ"],
  [/food|catering/i, "የምግብ አቅርቦት ግዥ"],
  [/fuel/i, "የነዳጅ ግዥ"],
];

export function amharicTitle(title: string): string {
  if (/[\u1200-\u137F]/.test(title)) return title;
  for (const [re, label] of RULES) if (re.test(title)) return label;
  // No specific match: keep the original wording rather than a vague label.
  return title;
}
