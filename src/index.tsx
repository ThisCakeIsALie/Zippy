import * as blessed from "blessed";
import * as React from "react";
import * as AdmZip from "adm-zip";
import { render } from "react-blessed";
import { App } from "./components";

const screen = blessed.screen({
  smartCSR: true
});

render(<App screen={screen} path="./test" />, screen);
screen.render();
