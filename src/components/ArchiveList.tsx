import * as React from "react";
import * as blessed from "blessed";
import Archiver from "../Archiver";
import { List } from "./List";
import { Entry } from "../Archiver";
import produce from "immer";

interface ArchiveListState {
  openDirectory: Entry | "root";
}

interface ArchiveListProps {
  screen: blessed.Widgets.Screen;
  archive: Archiver;
  onSelect?(current: Entry): void;
  onChange?(current: Entry): void;
}

export class ArchiveList extends React.Component {
  setState: ({}) => void;
  refs: {
    app: blessed.Widgets.BoxElement;
  };
  state: ArchiveListState;
  props: ArchiveListProps;

  constructor(props: ArchiveListProps) {
    super(props);
    this.state = {
      openDirectory: "root"
    };
  }

  render() {
    const listStyle = {
      width: "20%",
      border: "line"
    };

    const items = this.props.archive.childrenOf(this.state.openDirectory);
    const activeItems = items.filter(entry => entry.status === "uncompressed");

    return (
      <List
        {...listStyle}
        screen={this.props.screen}
        items={items.map(entry => entry.name)}
        active={activeItems.map(entry => entry.name)}
        onChange={(item, name, index) => {
          if (this.props.onChange) {
            this.props.onChange(items.find(entry => entry.name === name));
          }
        }}
        onSelect={(item, name, index) => {
          const child = items.find(entry => entry.name === name);
          if (!child.isDirectory) {
            return;
          }
          this.setState({
            openDirectory: child
          });
        }}
        onCancel={() => {
          if (this.state.openDirectory !== "root") {
            this.setState(state => {
              return {
                openDirectory: this.props.archive.parentOf(state.openDirectory)
              };
            });
          }
        }}
        onKeypress={(key, item, name, index) => {
          if (key === "c") {
            const selected = items.find(entry => entry.name === name);
            if (this.props.onSelect) {
              this.props.onSelect(selected);
            }
          }
        }}
        autoFocus
      />
    );
  }
}
