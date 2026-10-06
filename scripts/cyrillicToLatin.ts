const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  // Digraphs (Must be replaced first to prevent splitting into single characters)
  Љ: "Lj",
  љ: "lj",
  Њ: "Nj",
  њ: "nj",
  Џ: "Dž",
  џ: "dž",

  // Single characters
  А: "A",
  а: "a",
  Б: "B",
  б: "b",
  В: "V",
  в: "v",
  Г: "G",
  г: "g",
  Д: "D",
  д: "d",
  Ђ: "Đ",
  ђ: "đ",
  Е: "E",
  е: "e",
  Ж: "Ž",
  ж: "ž",
  З: "Z",
  з: "z",
  И: "I",
  и: "i",
  Ј: "J",
  ј: "j",
  К: "K",
  к: "k",
  Л: "L",
  л: "l",
  М: "M",
  м: "m",
  Н: "N",
  н: "n",
  О: "O",
  о: "o",
  П: "P",
  п: "p",
  Р: "R",
  р: "r",
  С: "S",
  с: "s",
  Т: "T",
  т: "t",
  Ћ: "Ć",
  ћ: "ć",
  У: "U",
  у: "u",
  Ф: "F",
  ф: "f",
  Х: "H",
  х: "h",
  Ц: "C",
  ц: "c",
  Ч: "Č",
  ч: "č",
  Ш: "Š",
  ш: "š",
};

// Regex matches digraphs first, then single Cyrillic characters
const CYRILLIC_REGEX = new RegExp(
  Object.keys(CYRILLIC_TO_LATIN_MAP).join("|"),
  "g"
);

/**
 * Converts a Serbian Cyrillic string to Serbian Latin.
 */
export function cyrillicToLatin(text: string): string {
  if (!text) return text;
  return text.replace(CYRILLIC_REGEX, (match) => CYRILLIC_TO_LATIN_MAP[match] || match);
}