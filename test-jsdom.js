import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

(async () => {
  const html = fs.readFileSync(path.resolve('./dist/index.html'), 'utf-8');
  
  const dom = new JSDOM(html, {
    url: "http://localhost:3000/",
    runScripts: "dangerously",
    resources: "usable",
    console: "on"
  });

  dom.window.console.error = (...args) => {
    console.log("PAGE ERROR:", ...args);
  };
  dom.window.console.log = (...args) => {
    console.log("PAGE LOG:", ...args);
  };
  dom.window.console.warn = (...args) => {
    console.log("PAGE WARN:", ...args);
  };

  // Wait a few seconds to let React render
  await new Promise(r => setTimeout(r, 4000));
  
  console.log("Finished waiting.");
})();
