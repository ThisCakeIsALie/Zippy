import * as Zip from "adm-zip";
import { paths } from "node-dir";
import { basename, relative } from "path";
import { lstatSync, existsSync, mkdirSync } from "fs";
import * as del from "del";

type EntryStatus = "compressed" | "uncompressed";
type EntryInfo = undefined;

export interface Entry {
  name: string;
  path: string;
  status: EntryStatus;
  info: EntryInfo;
  isDirectory: boolean;
  archiveEntry: Zip.IZipEntry | null;
}

type EntryLike = Entry | string;

export default class Archiver {
  private readonly zipPath: string;
  private archive: Zip;
  private entries: Entry[];

  private constructor(private readonly path: string) {
    this.zipPath = relative(".", path) + ".zip";
  }

  static async forPath(path): Promise<Archiver> {
    const archiver = new Archiver(path);
    await archiver.refresh();
    return archiver;
  }

  async refresh(): Promise<void> {
    if (!existsSync(this.path)) {
      mkdirSync(this.path);
    }
    if (!existsSync(this.zipPath)) {
      await new Zip().writeZip(this.zipPath);
    }
    this.archive = await new Zip(this.zipPath);
    this.entries = await this.initializeEntries();
  }

  //TODO: Handle opened files
  async compress(entry: EntryLike): Promise<void> {
    const actualEntry = this.getEntry(entry);
    if (actualEntry.status === "compressed") {
      throw new Error("Entry is already compressed");
    }
    if (actualEntry.isDirectory) {
      //For some reasom addLocalFolder doesn't add this by itself, so we add the directory entry manually
      await this.archive.addFile(actualEntry.path, Buffer.alloc(0));
      await this.archive.addLocalFolder(actualEntry.path, actualEntry.path);
    } else {
      await this.archive.addLocalFile(actualEntry.path, this.getParentPathParts(actualEntry).join("/") + "/");
    }
    await this.archive.writeZip(this.zipPath);
    await del(actualEntry.path);
    await this.refresh();
  }

  async decompress(entry: EntryLike): Promise<void> {
    const actualEntry = this.getEntry(entry);
    if (actualEntry.status === "uncompressed") {
      throw new Error("Entry is already decompressed");
    }
    const extractionPath = actualEntry.isDirectory ? actualEntry.path : this.getParentPathParts(actualEntry).join("/") + "/"
    await this.archive.extractEntryTo(
      actualEntry.archiveEntry,
      extractionPath,
      false,
      true
    );
    await this.archive.deleteFile(actualEntry.archiveEntry);
    await this.archive.writeZip(this.zipPath);
    await this.refresh();
  }

  getEntries(type: EntryStatus | "all" = "all") {
    switch (type) {
      case "compressed":
        return this.entries.filter(entry => entry.status === "compressed");
      case "uncompressed":
        return this.entries.filter(entry => entry.status === "uncompressed");
      case "all":
        return this.entries;
    }
  }

  getEntry(entry: EntryLike): Entry {
    if (typeof entry !== "string") {
      return entry;
    }
    return this.entries.find(val => val.path === entry || val.name === entry);
  }

  childrenOf(entry: EntryLike | "root"): Entry[] {
    let actualEntry: Entry = null;

    if (typeof entry === "string") {
      if (entry === "root") {
        return this.entries.filter(
          otherEntry => this.getPathParts(otherEntry).length === 2
        );
      }
      actualEntry = this.getEntry(entry);
    } else {
      actualEntry = entry;
    }

    const path = this.getPathParts(actualEntry);

    return this.entries.filter(otherEntry => {
      const otherPath = this.getPathParts(otherEntry);
      if (path.length + 1 !== otherPath.length) {
        return false;
      }
      return path.every((part, i) => part === otherPath[i]);
    });
  }

  parentOf(entry: EntryLike): Entry | "root" {
    const actualEntry =
      typeof entry !== "string" ? entry : this.getEntry(entry);
    const parentPath = this.getParentPathParts(actualEntry);
    //If the new length is one then we reached the root
    //Since the root has no representation in the zip we return the string root
    if (parentPath.length === 1) {
      return "root";
    }
    return this.getEntry(parentPath.join("/") + "/");
  }

  private getPathParts(entry: Entry) {
    const splitPath = entry.path.replace(/^[/]+|[/]+$/g, "").split("/");
    return splitPath;
  }

  private getParentPathParts(entry: Entry) {
    return this.getPathParts(entry).slice(0,-1);
  }

  private async initializeEntries(): Promise<Entry[]> {
    //Initializes all compressed entries
    const compressed: Entry[] = this.archive.getEntries().map(archiveEntry => {
      return {
        name: archiveEntry.entryName
          .split("/")
          .slice(archiveEntry.isDirectory ? -2 : -1)[0],
        path: archiveEntry.entryName,
        status: "compressed" as EntryStatus,
        info: undefined,
        isDirectory: archiveEntry.isDirectory,
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
            const isDirectory = lstatSync(path).isDirectory();
            return {
              name: basename(path),
              path:
                relative(".", path).replace(/\\/g, "/") +
                (isDirectory ? "/" : ""),
              status: "uncompressed" as EntryStatus,
              info: undefined,
              isDirectory,
              archiveEntry: null
            };
          })
        );
      });
    });

    return [...compressed, ...uncompressed];
  }
}
