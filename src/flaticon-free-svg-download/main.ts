export {};

const buttonClass = "elypha-flaticon-svg-download";
const buttonLabel = "Download SVG Free";
const editorTimeoutMs = 10_000;

let downloadInProgress = false;

function main(): void {
  addStyle();
  addDownloadButtons();

  const observer = new MutationObserver(addDownloadButtons);
  observer.observe(document.body, { childList: true, subtree: true });
}

function addStyle(): void {
  const style = document.createElement("style");
  style.textContent = `
    .${buttonClass} {
      grid-column: 1 / -1;
      flex: 0 0 100%;
      width: 100%;
      min-height: 44px;
      border: 0;
      border-radius: 6px;
      background: #1273eb;
      color: #fff;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    .${buttonClass}:hover {
      background: #0f63cc;
    }

    .${buttonClass}[aria-busy="true"] {
      cursor: wait;
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);
}

function addDownloadButtons(): void {
  for (const container of document.querySelectorAll<HTMLElement>("#download")) {
    if (container.querySelector(`.${buttonClass}`)) continue;

    const button = document.createElement("button");
    const label = document.createElement("span");
    button.type = "button";
    button.className = buttonClass;
    label.textContent = buttonLabel;
    button.appendChild(label);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      void downloadSvgFromEditor(button);
    });
    container.prepend(button);
  }
}

async function downloadSvgFromEditor(button: HTMLElement): Promise<void> {
  if (downloadInProgress) return;
  downloadInProgress = true;

  const label = button.querySelector<HTMLElement>("span");
  button.setAttribute("aria-busy", "true");
  if (label) label.textContent = "Preparing SVG...";

  try {
    const detail = button.closest<HTMLElement>("#detail") ?? document.querySelector<HTMLElement>("#detail");
    if (!detail) throw new Error("Icon details are not available.");

    const editButton = detail.querySelector<HTMLButtonElement>("#detail_edit_icon");
    if (!editButton) throw new Error("This icon cannot be opened in the editor.");

    editButton.click();
    const svg = await waitForEditorSvg(detail);
    saveSvg(svg, getFilename(detail));
    detail.querySelector<HTMLButtonElement>(".detail__editor button.close")?.click();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare this SVG.";
    window.alert(message);
  } finally {
    downloadInProgress = false;
    button.removeAttribute("aria-busy");
    if (label) label.textContent = buttonLabel;
  }
}

function waitForEditorSvg(detail: HTMLElement): Promise<SVGSVGElement> {
  return new Promise((resolve, reject) => {
    const findSvg = (): SVGSVGElement | null => detail.querySelector<SVGSVGElement>(".detail__editor__icon-holder svg");

    const finish = (svg: SVGSVGElement): void => {
      observer.disconnect();
      window.clearTimeout(timeoutId);
      resolve(svg);
    };

    const observer = new MutationObserver(() => {
      const svg = findSvg();
      if (svg) finish(svg);
    });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error("The Flaticon editor did not provide an SVG."));
    }, editorTimeoutMs);

    const existingSvg = findSvg();
    if (existingSvg) {
      finish(existingSvg);
      return;
    }

    observer.observe(detail, { childList: true, subtree: true });
  });
}

function saveSvg(svg: SVGSVGElement, filename: string): void {
  const content = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([content], { type: "image/svg+xml" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function getFilename(detail: HTMLElement): string {
  const pathName = location.pathname.match(/\/free-icon\/([^/]+)/)?.[1];
  if (pathName) return `${pathName}.svg`;

  const name = detail.dataset.name?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "icon";
  const id = detail.dataset.id;
  return `${name}${id ? `_${id}` : ""}.svg`;
}

main();
