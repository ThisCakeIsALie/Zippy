import * as React from "react";
import * as blessed from "blessed";
import { ArchiveList } from "./ArchiveList";
import Archiver from "../Archiver";

interface AppState {
  archive: Archiver;
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
      archive: null
    };
  }

  async componentDidMount() {
    await this.setState({
      archive: await Archiver.forPath(this.props.path)
    });
    this.refs.app.on("element key q", () => {
      process.exit(0);
    });
  }

  render() {
    const archive = this.state.archive;

    if (archive === null) {
      return null;
    }

    return (
      <box ref="app" label="Zippy" border="line" keyable>
        <ArchiveList
          archive={archive}
          screen={this.props.screen}
          onChange={selected => {

          }}
          onSelect={async selected => {
              if (selected.status === "compressed") {
                await archive.decompress(selected);
              } else {
                await archive.compress(selected);
              }
            
            this.setState({ archive });
          }}
        />
      </box>
    );
  }
}
