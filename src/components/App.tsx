import * as React from "react";
import * as blessed from "blessed";
import * as del from "del";
import { ArchiveList } from "./ArchiveList";
import { pathToFlatArchive, toArchiveTree, ArchiveTree } from "../ZipHandler";

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

  private calcArchiveTree = toArchiveTree;

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
            if (selected.isOpen) {
              if (selected.entry === "root") {
                await del(this.props.path, { force: true });
              } else {
                await del("./" + selected.entry.entryName);
              }
              this.setState({ archive: toArchiveTree(this.props.path) });
              return;
            }

            const selectedEntry = selected.entry;
            const archive = pathToFlatArchive(this.props.path);

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
