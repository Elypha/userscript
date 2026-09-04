const nativeInteractionEvents = ["selectstart", "copy", "cut", "contextmenu"];

for (const type of nativeInteractionEvents) {
  window.addEventListener(type, (event) => {
    // Keep the body's noCopy handler from cancelling the browser's default action.
    event.stopImmediatePropagation();
  }, { capture: true });
}
