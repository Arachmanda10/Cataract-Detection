import fs from "node:fs";
import { predict } from "../src/ml.js";

const file = process.argv[2];
if (!file) throw new Error("Pemakaian: npx tsx scripts/test-ml.ts <path-gambar>");

console.log(await predict(fs.readFileSync(file)));