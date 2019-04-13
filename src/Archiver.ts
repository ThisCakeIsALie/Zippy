import * as Zip from "adm-zip";
import { paths } from "node-dir";
import { basename, relative } from "path";

type EntryStatus = "compressed" | "uncompressed";
type EntryInfo = undefined;

interface Entry {
  name: string;
  path: string;
  status: EntryStatus;
  info: EntryInfo;
  archiveEntry: Zip.IZipEntry | null;
}

export class Archiver {
  private archive: Zip;
  private entries: Entry[];

  constructor(private path: string) {
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.archive = new Zip(this.path);
    this.entries = await this.initializeEntries();
  }

  compress(entryPath: string): void {}

  decompress(entryPath: string): void {}

  getEntries(type: EntryStatus | "all" = "all") {
      switch(type) {
          case "compressed":
            return this.entries.filter(entry => entry.status === "compressed");
          case "uncompressed":
            return this.entries.filter(entry => entry.status === "uncompressed");
          case "all":
            return this.entries;
      }
  }

  getEntry(entry: Entry | string) {
      if (typeof entry !== "string") {
          return entry;
      }

      return this.entries.find(val => val.path === entry || val.name === entry);
  }

  childrenOf(entryPath: string) {}

  parentOf(entryPath: string) {}

  private async initializeEntries(): Promise<Entry[]> {
    //Initializes all compressed entries
    const compressed: Entry[] = this.archive.getEntries().map(archiveEntry => {
      return {
        name: archiveEntry.name,
        path: archiveEntry.entryName,
        status: "compressed",
        info: undefined,
        archiveEntry
      };
    });

    const uncompressed: Entry[] = await new Promise((resolve, reject) => {
      paths(this.path, true, (err, subpaths) => {
        if (err !== null) {
            reject(err);
            return;
        }
        if (!Array.isArray(subpaths)) {
          reject(new Error("Unexpected subpath result while decompressing"));
          return;
        }

        resolve(
          subpaths.map(path => {
            return {
              name: basename(path),
              path: relative(".", path).replace(/\\/g, "/"),
              status: "uncompressed",
              info: undefined,
              archiveEntry: null
            };
          })
        );
      });
    });

    return [...compressed, ...uncompressed];
  }

}
