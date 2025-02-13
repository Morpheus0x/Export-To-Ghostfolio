import { SwissquoteConverter } from "./swissquoteConverter";
import { GhostfolioExport } from "../models/ghostfolioExport";
import { YahooFinanceService } from "../yahooFinanceService";

describe("swissquoteConverter", () => {

  it("should construct", () => {

    // Act
    const sut = new SwissquoteConverter(new YahooFinanceService());

    // Assert
    expect(sut).toBeTruthy();
  });

  it("should process sample CSV file", (done) => {

    // Act
    const sut = new SwissquoteConverter(new YahooFinanceService());
    const inputFile = "sample-swissquote-export.csv";

    // Act      
    sut.readAndProcessFile(inputFile, (actualExport: GhostfolioExport) => {

      // Assert
      expect(actualExport).toBeTruthy();
      expect(actualExport.activities.length).toBeGreaterThan(0);
      expect(actualExport.activities.length).toBe(14);

      done();
    }, () => { fail("Should not have an error!"); });
  });

  describe("should throw an error if", () => {
    it("the input file does not exist", (done) => {

      // Act
      const sut = new SwissquoteConverter(new YahooFinanceService());

      let tempFileName = "tmp/testinput/swissquote-filedoesnotexist.csv";

      // Act
      sut.readAndProcessFile(tempFileName, () => { fail("Should not succeed!"); }, (err: Error) => {

        // Assert
        expect(err).toBeTruthy();

        done();
      });
    });

    it("the input file is empty", (done) => {

      // Act
      const sut = new SwissquoteConverter(new YahooFinanceService());

      // Create temp file.
      let tempFileContent = "";
      tempFileContent += "Date;Order #;Transaction;Symbol;Name;ISIN;Quantity;Unit price;Costs;Accrued Interest;Net Amount;Balance;Currency\n";

      // Act
      sut.processFileContents(tempFileContent, () => { fail("Should not succeed!"); }, (err: Error) => {

        // Assert
        expect(err).toBeTruthy();
        expect(err.message).toContain("An error ocurred while parsing");

        done();
      });
    });

    it("Yahoo Finance got empty input for query", (done) => {

      // Act
      const sut = new SwissquoteConverter(new YahooFinanceService());

      // Create temp file.
      let tempFileContent = "";
      tempFileContent += "Date;Order #;Transaction;Symbol;Name;ISIN;Quantity;Unit price;Costs;Accrued Interest;Net Amount;Balance;Currency\n";
      tempFileContent += "10-08-2022 15:30:02;113947121;Buy;;;;200.0;19.85;5.96;0.00;-3975.96;168660.08;USD";

      // Act
      sut.processFileContents(tempFileContent, () => { fail("Should not succeed!"); }, (err) => {

        // Assert
        expect(err).toBeTruthy();

        done();
      });
    });
  });
});
