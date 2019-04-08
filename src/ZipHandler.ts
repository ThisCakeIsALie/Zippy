import * as AdmZip from "adm-zip";
import { existsSync } from "fs";

export interface ArchiveTree {
  content: Map<string, ArchiveTree>;
  entry: AdmZip.IZipEntry | "root";
  isOpen: boolean;
}

export function pathToFlatArchive(path: string): AdmZip {
  return new AdmZip(path + ".zip");
}

export function followPath(archive: ArchiveTree, path: string[]): ArchiveTree {
  let target = archive;
  for (let i = 0; i < path.length; i++) {
    if (target.content === null) {
      return null;
    }
    const child = target.content.get(path[i]);
    if (child === null) {
      return null;
    }
    target = child;
  }
  return target;
}

export function toArchiveTree(path: string): ArchiveTree {
  const archive = pathToFlatArchive(path);
  const entries = archive.getEntries();

  const tree: ArchiveTree = {
    content: new Map(),
    entry: null,
    isOpen: false
  };

  entries.forEach(entry => {
    const location = entry.entryName.split("/").filter(val => val !== "");
    if (location.length === 0) {
      throw new Error("Path for given entry was empty: " + entry.toString());
    }
    let subTree = tree;
    while (location.length > 0) {
      const head = location.shift();

      if (!subTree.content.has(head)) {
        subTree.content.set(head, {
          content: new Map(),
          entry: "root", //This will get overridden for everything but the root node
          isOpen: false
        });
      }

      subTree = subTree.content.get(head);
    }
    subTree.entry = entry;
    subTree.isOpen = existsSync("./" + entry.entryName);
    if (!entry.isDirectory) {
      subTree.content = null;
    }
  });
  //Handle root node seperatly as there is no entry for it in the zip file
  const rootName = path.split("/").splice(-1)[0];
  tree.content.get(rootName).isOpen = existsSync("./" + rootName);
  return tree;
}
