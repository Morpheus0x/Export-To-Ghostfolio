import path from "path";
import * as fs from "fs";
import chokidar from "chokidar";
import * as cacache from "cacache";
import * as matcher from "closest-match";
import { createAndRunConverter } from "./converter";

// Check if the cache should be purged.
if (Boolean(process.env.PURGE_CACHE)) {

    console.log("[i] Purging cache (PURGE_CACHE set to true)..");
    Promise.all([
        cacache.rm("tmp/e2g-cache", "isinSymbolCache"),
        cacache.rm("tmp/e2g-cache", "symbolCache")
    ]).then(() => console.log("[i] Cache purged!"));
}

// Define input and output.
const inputFolder = process.env.E2G_INPUT_FOLDER || "/var/e2g-input";
const outputFolder = process.env.E2G_OUTPUT_FOLDER || "/var/e2g-output";
const usePolling = Boolean(process.env.USE_POLLING) || false;

console.log(`[i] Watching ${inputFolder}${usePolling ? " (using polling)" : ""}..`);

let isProcessing = false;

chokidar
    .watch(inputFolder, { usePolling: usePolling })
    .on("add", filePath => {

        isProcessing = true;

        console.log(`[i] Found ${path.basename(filePath)}!`);

        const fileContents = fs.readFileSync(filePath, "utf-8");

        const closestMatch = matcher.closestMatch(fileContents.split("\n")[0], [...headers.keys()]);

        let converterKey = closestMatch as string;

        // If multiple matches were found (type would not be 'string'), pick the first.
        if (typeof closestMatch !== "string") {
            converterKey = closestMatch[0];
        }

        let converter = headers.get(converterKey);

        // Temporary control to force DEGIRO V2 converter while in beta.
        if (process.env.FORCE_DEGIRO_V2 && converter === "degiro") {
            converter = "degiro-v2"
            console.log(`[i] Determined the file type to be of kind '${converter}' (overidden by environment variable).`);
        }
        else {
            console.log(`[i] Determined the file type to be of kind '${converter}'.`);
        }

        // Determine convertor type and run conversion.
        createAndRunConverter(converter, filePath, outputFolder,
            () => {

                // After conversion was succesful, remove input file.
                console.log(`[i] Finished converting ${path.basename(filePath)}, removing file..`);
                fs.rmSync(filePath);

                isProcessing = false;

                if (!usePolling) {
                    console.log("[i] Stop container as usePolling is set to false..");
                    process.exit(0);
                }

            }, (err) => {

                console.log("[e] An error ocurred while processing.");
                console.log(`[e] Error details: ${err}`);

                // Move file with errors to output folder so it can be fixed manually.
                console.log("[e] Moving file to output..");
                const errorFilePath = path.join(outputFolder, path.basename(filePath));
                fs.copyFileSync(filePath, errorFilePath);
                fs.rmSync(filePath);

                isProcessing = false;

                if (!usePolling) {
                    console.log("[i] Stop container as usePolling is set to false..");
                    process.exit(0);
                }
            });
    })
    .on("ready", () => {

        // When polling was not set to true (thus runOnce) and there is no file currently being processed, stop the container.
        setTimeout(() => {
            if (!usePolling && !isProcessing) {
                console.log("[i] Found no file to convert, stop container as usePolling is set to false..");
                process.exit(0);
            }
        }, 5000);
    });

// Prep header set.
const headers: Map<string, string> = new Map<string, string>();
headers.set(`Datum,Tijd,Valutadatum,Product,ISIN,Omschrijving,FX,Mutatie,,Saldo,,Order Id`, "degiro");
headers.set(`Date;Category;"Asset Name";ISIN;"Number of Shares";"Asset Currency";"Currency Rate";"Asset Price in CHF";"Cash Flow";Balance`, "finpension");
headers.set(`Date,Action,Symbol,Description,Quantity,Price,Fees & Comm,Amount`, "schwab");
headers.set(`Date;Order #;Transaction;Symbol;Name;ISIN;Quantity;Unit price;Costs;Accrued Interest;Net Amount;Balance;Currency`, "swissquote");
headers.set(`Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Exchange rate,Result,Currency (Result),Total,Currency (Total),Withholding tax,Currency (Withholding tax),Notes,ID,Currency conversion fee`, "trading212");
headers.set(`Date,Type,Details,Amount,Units,Realized Equity Change,Realized Equity,Balance,Position ID,Asset type,NWA`, "etoro");