import * as React from "react";
import * as blessed from "blessed";
import { ArchiveTree, followPath } from "../ZipHandler";
import { List } from "./List";
import produce from "immer";

interface ArchiveListState {
  openDirectories: string[];
}

interface ArchiveListProps {
  screen: blessed.Widgets.Screen;
  archive: ArchiveTree;
  onSelect?(curArchive: ArchiveTree): void;
  onChange?(curArchive: ArchiveTree): void;
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
      openDirectories: []
    };
  }

  render() {
    const listStyle = {
      width: "20%",
      border: "line"
    };

    const curArchive = followPath(
      this.props.archive,
      this.state.openDirectories
    );

    const items = [...curArchive.content.keys()];
    const activeItems = items.filter(
      name => curArchive.content.get(name).isOpen
    );

    return (
      <List
        {...listStyle}
        screen={this.props.screen}
        items={items}
        active={activeItems}
        onChange={(item, name, index) => {
          if (this.props.onChange) {
            this.props.onChange(curArchive.content.get(name));
          }
        }}
        onSelect={(item, name, index) => {
          this.setState(
            produce(draft => {
              const child = curArchive.content.get(name);
              if (child.content !== null) {
                draft.openDirectories.push(name);
              }
            })
          );
        }}
        onCancel={() => {
          if (this.state.openDirectories.length > 0) {
            this.setState(
              produce(draft => {
                draft.openDirectories.pop();
              })
            );
          }
        }}
        onKeypress={(key, item, name, index) => {
          if (key === "c") {
            const selected = curArchive.content.get(name);
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
