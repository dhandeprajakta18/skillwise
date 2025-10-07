import fs from "fs";
import { parse } from "fast-csv";

/** Read CSV file into array of objects */
export const parseCsvStream = (filePath) =>
  new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(parse({ headers: true, ignoreEmpty: true, trim: true }))
      .on("error", reject)
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });

/** Stream Mongo docs as CSV into response */
export const writeCsvStream = async (res, cursor) => {
  res.write("name,unit,category,brand,stock,status,image\n");
  for await (const doc of cursor) {
    const v = (x) => (x == null ? "" : String(x).replaceAll('"', '""'));
    const line =
      [v(doc.name), v(doc.unit), v(doc.category), v(doc.brand), v(doc.stock), v(doc.status), v(doc.image)]
        .map((s) => (s.includes(",") ? `"${s}"` : s))
        .join(",") + "\n";
    res.write(line);
  }
  res.end();
};