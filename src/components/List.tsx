import * as React from "react";
import * as blessed from "blessed";
import produce from "immer";

interface ListState {
  selected: number;
}

interface ListProps {
  screen: blessed.Widgets.Screen;
  items: string[];
  active: string[];
  initialSelected?: number;
  autoFocus?: boolean;
  onSelect?(
    item: blessed.Widgets.BlessedElement,
    name: string,
    index: number
  ): void;
  onChange?(
    item: blessed.Widgets.BlessedElement,
    name: string,
    index: number
  ): void;
  onCancel?(
    item: blessed.Widgets.BlessedElement,
    name: string,
    index: number
  ): void;
  onKeypress?(
    key: string,
    item: blessed.Widgets.BlessedElement,
    name: string,
    index: number
  ): void;
}

export class List extends React.Component {
  setState: ({}) => void;
  refs: {
    list: blessed.Widgets.ListElement;
  };
  state: ListState;
  props: ListProps;

  constructor(props: ListProps) {
    super(props);
    this.state = {
      selected: this.props.initialSelected || 0
    };
    this.getInfoForIndex = this.getInfoForIndex.bind(this);
  }

  updateActive() {
    for (let i = 0; i < this.props.items.length; i++) {
      const item = this.refs.list.getItem(i as any);
      item.style.fg = this.props.active.includes(item.getContent())
        ? "yellow"
        : "white";
    }
    this.props.screen.render();
  }

  componentDidMount() {
    this.refs.list.select(this.state.selected);
    if (this.props.autoFocus) {
      this.refs.list.focus();
    }
    this.updateActive();
  }

  async componentDidUpdate({ items }: ListProps, { selected }: ListState) {
    if (items !== this.props.items) {
      await this.setState({ selected: 0 });
    }
    if (selected !== this.state.selected) {
      this.refs.list.select(this.state.selected);
    }
    this.updateActive();
  }

  private getInfoForIndex(
    index: number
  ): [blessed.Widgets.BlessedElement, string, number] {
    const selectedIndex = index;
    const item = this.refs.list.getItem(selectedIndex as any);
    return [item, this.props.items[selectedIndex], index];
  }

  private handleKeypress = async key => {
    const size = this.props.items.length;

    if (this.props.onKeypress) {
      this.props.onKeypress(key, ...this.getInfoForIndex(this.state.selected));
    }

    switch (key) {
      case "j":
        await this.setState(
          produce(draft => {
            draft.selected = mod(draft.selected + 1, size);
          })
        );
        break;
      case "k":
        await this.setState(
          produce(draft => {
            draft.selected = mod(draft.selected - 1, size);
          })
        );
        break;
      case "l":
        if (this.props.onSelect) {
          this.props.onSelect(...this.getInfoForIndex(this.state.selected));
        }
        break;
      case "h":
        if (this.props.onCancel) {
          this.props.onCancel(...this.getInfoForIndex(this.state.selected));
        }
        break;
    }

    if (this.props.onChange) {
      const selectedIndex = this.state.selected;
      const item = this.refs.list.getItem(selectedIndex as any);
      this.props.onChange(item, this.props.items[selectedIndex], selectedIndex);
    }

    this.props.screen.render();
  };

  render() {
    return (
      <list
        {...this.props}
        ref="list"
        items={[...this.props.items]}
        onKeypress={this.handleKeypress}
        style={{
          selected: {
            bg: "cyan"
          }
        }}
        keyable
      />
    );
  }
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
