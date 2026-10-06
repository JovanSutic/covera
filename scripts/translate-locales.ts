/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import { translate } from "@vitalets/google-translate-api";
import { cyrillicToLatin } from "./cyrillicToLatin";

const LOCALES_DIR = path.join(process.cwd(), "public/locales");
const SOURCE_LANG = "en";

const TARGET_LANGS = ["de", "tr", "sr-Latn"];

const FOLDER_MAP: Record<string, string> = {
  de: "de",
  tr: "tr",
  "sr-Latn": "sr-Latn",
};

// Google free web API defaults to Cyrillic for 'sr' and ignores '-Latn'
const GOOGLE_LANG_MAP: Record<string, string> = {
  de: "de",
  tr: "tr",
  "sr-Latn": "sr", 
};

const NAMESPACES = ["assets", "common", "host", "guest", "general"];

// HTML tags are preserved intact by Google Translate
const SPLIT_TAG = "<split/>";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function flattenObject(
  obj: Record<string, any>,
  prefix = "",
): Record<string, string> {
  return Object.keys(obj).reduce(
    (acc, key) => {
      const pre = prefix.length ? `${prefix}.` : "";
      if (typeof obj[key] === "object" && obj[key] !== null) {
        Object.assign(acc, flattenObject(obj[key], pre + key));
      } else if (typeof obj[key] === "string") {
        acc[pre + key] = obj[key];
      }
      return acc;
    },
    {} as Record<string, string>,
  );
}

function unflattenObject(flatObj: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const pathKey of Object.keys(flatObj)) {
    const keys = pathKey.split(".");
    let current = result;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (i === keys.length - 1) {
        current[k] = flatObj[pathKey];
      } else {
        current[k] = current[k] || {};
        current = current[k];
      }
    }
  }
  return result;
}

function maskInterpolations(text: string): {
  maskedText: string;
  vars: string[];
} {
  const vars: string[] = [];
  const maskedText = text.replace(/\{\{[^}]+\}\}/g, (match) => {
    vars.push(match);
    return `__VAR_${vars.length - 1}__`;
  });
  return { maskedText, vars };
}

function unmaskInterpolations(text: string, vars: string[]): string {
  let restored = text;
  vars.forEach((originalVar, idx) => {
    const regex = new RegExp(`__\\s*VAR_${idx}\\s*__`, "g");
    restored = restored.replace(regex, originalVar);
  });
  return restored;
}

async function syncTranslations() {
  for (const ns of NAMESPACES) {
    const sourcePath = path.join(LOCALES_DIR, SOURCE_LANG, `${ns}.json`);
    if (!fs.existsSync(sourcePath)) continue;

    const sourceData = JSON.parse(fs.readFileSync(sourcePath, "utf-8"));
    const flatSource = flattenObject(sourceData);

    for (const lang of TARGET_LANGS) {
      const folderName = FOLDER_MAP[lang] || lang;
      const targetGoogleLang = GOOGLE_LANG_MAP[lang] || lang;

      console.log(`\nSyncing namespace '${ns}' for: ${lang}`);

      const targetDir = path.join(LOCALES_DIR, folderName);
      const targetPath = path.join(targetDir, `${ns}.json`);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      let flatTarget: Record<string, string> = {};
      if (fs.existsSync(targetPath)) {
        try {
          const rawTarget = JSON.parse(fs.readFileSync(targetPath, "utf-8"));
          flatTarget = flattenObject(rawTarget);
        } catch {
          flatTarget = {};
        }
      }

      // Filter out missing or previously corrupted entries
      const missingKeys = Object.keys(flatSource).filter(
        (key) =>
          !flatTarget[key] ||
          flatTarget[key].includes("___SPLIT_DELIMITER___") ||
          flatTarget[key].includes("___СПЛИТ_ДЕЛИМИТЕР___"),
      );

      if (missingKeys.length === 0) {
        console.log(`  [${lang}] All keys up to date.`);
        continue;
      }

      // Process in smaller batches of 15 to stay within URL length limits
      const CHUNK_SIZE = 15;
      for (let i = 0; i < missingKeys.length; i += CHUNK_SIZE) {
        const chunkKeys = missingKeys.slice(i, i + CHUNK_SIZE);
        const maskedEntries = chunkKeys.map((k) =>
          maskInterpolations(flatSource[k]),
        );
        const batchedText = maskedEntries
          .map((entry) => entry.maskedText)
          .join(` ${SPLIT_TAG} `);

        try {
          const res = await translate(batchedText, { to: targetGoogleLang });
          let translatedText = res.text;

          // Convert Cyrillic to Latin for Serbian
          if (lang === "sr-Latn") {
            translatedText = cyrillicToLatin(translatedText);
          }

          // Split safely by the XML tag
          const translatedSegments = translatedText.split(
            /\s*<split\s*\/?>\s*/i,
          );

          chunkKeys.forEach((key, idx) => {
            const rawTranslated = translatedSegments[idx]?.trim();
            const restoredValue = rawTranslated
              ? unmaskInterpolations(rawTranslated, maskedEntries[idx].vars)
              : flatSource[key];

            flatTarget[key] = restoredValue;
          });
        } catch (err: any) {
          console.error(
            `  Failed translating chunk for '${ns}' to ${lang}:`,
            err.message || err,
          );
        }

        await sleep(1000);
      }

      const updatedData = unflattenObject(flatTarget);
      fs.writeFileSync(
        targetPath,
        JSON.stringify(updatedData, null, 2),
        "utf-8",
      );
    }
  }
  console.log("\n✅ Translation sync complete!");
}

syncTranslations();