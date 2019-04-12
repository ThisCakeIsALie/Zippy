import * as React from "react";
import * as blessed from "blessed";
import * as del from "del";
import { ArchiveList } from "./ArchiveList";
import { pathToFlatArchive, toArchiveTree, ArchiveTree } from "../ZipHandler";
import { relative } from 'path';

interface AppState {
  archive: ArchiveTree;
}

interface AppProps {
  screen: blessed.Widgets.Screen;
  path: string;
}

export class App extends React.Component {
  setState: ({}) => void;
  refs: {
    app: blessed.Widgets.BoxElement;
  };
  state: AppState;
  props: AppProps;

  constructor(props: AppProps) {
    super(props);
    this.state = {
      archive: toArchiveTree(this.props.path)
    };
  }

  componentDidMount() {
    this.refs.app.on("element key q", () => {
      process.exit(0);
    });
  }

  render() {
    const archiveTree = this.state.archive;

    return (
      <box ref="app" label="Zippy" border="line" keyable>
        <ArchiveList
          archive={archiveTree}
          screen={this.props.screen}
          onChange={selected => {

          }}
          onSelect={async selected => {
            const archive = pathToFlatArchive(this.props.path);

            if (selected.isOpen) {
              const delPath = selected.entry === "root" ? this.props.path + "/**" : "./" + selected.entry.entryName;
              const pathsToDelete = await del(delPath, { dryRun: true });
              for (let path of pathsToDelete) {
                const relPath = relative(".", path).replace(/\\/g, "/");
                const entry = archive.getEntry(relPath);
                if (entry != null) {
                  if (!entry.isDirectory) {
                    await archive.updateFile(relPath, require("fs").readFileSync(relPath));
                  }
                }
              }
              await archive.writeZip(this.props.path + ".zip");
              await del(pathsToDelete);
              this.setState({ archive: toArchiveTree(this.props.path) });
              return;
            }

            const selectedEntry = selected.entry;

            if (selectedEntry === "root") {
              await archive.extractAllTo(".", true);
            } else {
              await archive.extractEntryTo(
                selectedEntry.entryName,
                ".",
                true,
                true
              );
            }
            this.setState({ archive: toArchiveTree(this.props.path) });
          }}
        />
      </box>
    );
  }
}
