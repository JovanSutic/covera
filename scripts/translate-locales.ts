/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import { translate } from "@vitalets/google-translate-api";

const LOCALES_DIR = path.join(process.cwd(), "public/locales");
const SOURCE_LANG = "en";

const TARGET_LANGS = ["de", "sr"];

const FOLDER_MAP: Record<string, string> = {
  de: "de",
  sr: "sr",
};

const NAMESPACES = ["assets", "common"];

// Helper to delay between language requests
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Flatten nested JSON object into dot-notation paths
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

// Unflatten dot-notation paths back to deep nested object
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

async function syncTranslations() {
  for (const ns of NAMESPACES) {
    const sourcePath = path.join(LOCALES_DIR, SOURCE_LANG, `${ns}.json`);
    if (!fs.existsSync(sourcePath)) continue;

    const sourceData = JSON.parse(fs.readFileSync(sourcePath, "utf-8"));
    const flatSource = flattenObject(sourceData);

    for (const lang of TARGET_LANGS) {
      const folderName = FOLDER_MAP[lang] || lang;
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

      // Find missing keys
      const missingKeys = Object.keys(flatSource).filter(
        (key) => !flatTarget[key],
      );

      if (missingKeys.length === 0) {
        console.log(`  [${lang}] All keys up to date.`);
        continue;
      }

      // Batch all missing values into a single text block
      const missingValues = missingKeys.map((k) => flatSource[k]);
      const batchedText = missingValues.join("\n");

      try {
        // Single network call for the entire namespace!
        const res = await translate(batchedText, { to: lang });
        const translatedValues = res.text.split("\n");

        missingKeys.forEach((key, idx) => {
          const translatedVal =
            translatedValues[idx]?.trim() || flatSource[key];
          flatTarget[key] = translatedVal;
          console.log(`  [${lang}] "${flatSource[key]}" -> "${translatedVal}"`);
        });

        const updatedData = unflattenObject(flatTarget);
        fs.writeFileSync(
          targetPath,
          JSON.stringify(updatedData, null, 2),
          "utf-8",
        );
      } catch (err: any) {
        console.error(
          `  Failed to translate namespace '${ns}' to ${lang}:`,
          err.message || err,
        );
      }

      // Respectful pause between language requests to prevent IP blocks
      await sleep(1500);
    }
  }
  console.log("\n✅ Translation sync complete!");
}

syncTranslations();
