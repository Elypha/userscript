// ==UserScript==
// @name         flaticon.com: Free SVG Download
// @namespace    https://github.com/Elypha/userscripts
// @version      1.0.1
// @author       Elypha
// @description  Download the editable SVG for a free Flaticon icon while logged in.
// @license      Apache-2.0
// @icon         https://www.flaticon.com/favicon.ico
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/flaticon.com-FreeSVGDownload.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/flaticon.com-FreeSVGDownload.meta.js
// @match        https://www.flaticon.com/free-icon/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var buttonClass = "elypha-flaticon-svg-download";
	var buttonLabel = "Download SVG Free";
	var editorTimeoutMs = 1e4;
	var downloadInProgress = false;
	function main() {
		addStyle();
		addDownloadButtons();
		new MutationObserver(addDownloadButtons).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	function addStyle() {
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
	function addDownloadButtons() {
		for (const container of document.querySelectorAll("#download")) {
			if (container.querySelector(`.${buttonClass}`)) continue;
			const button = document.createElement("button");
			const label = document.createElement("span");
			button.type = "button";
			button.className = buttonClass;
			label.textContent = buttonLabel;
			button.appendChild(label);
			button.addEventListener("click", (event) => {
				event.stopPropagation();
				downloadSvgFromEditor(button);
			});
			container.prepend(button);
		}
	}
	async function downloadSvgFromEditor(button) {
		if (downloadInProgress) return;
		downloadInProgress = true;
		const label = button.querySelector("span");
		button.setAttribute("aria-busy", "true");
		if (label) label.textContent = "Preparing SVG...";
		try {
			const detail = button.closest("#detail") ?? document.querySelector("#detail");
			if (!detail) throw new Error("Icon details are not available.");
			const editButton = detail.querySelector("#detail_edit_icon");
			if (!editButton) throw new Error("This icon cannot be opened in the editor.");
			editButton.click();
			saveSvg(await waitForEditorSvg(detail), getFilename(detail));
			detail.querySelector(".detail__editor button.close")?.click();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unable to prepare this SVG.";
			window.alert(message);
		} finally {
			downloadInProgress = false;
			button.removeAttribute("aria-busy");
			if (label) label.textContent = buttonLabel;
		}
	}
	function waitForEditorSvg(detail) {
		return new Promise((resolve, reject) => {
			const findSvg = () => detail.querySelector(".detail__editor__icon-holder svg");
			const finish = (svg) => {
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
			observer.observe(detail, {
				childList: true,
				subtree: true
			});
		});
	}
	function saveSvg(svg, filename) {
		const content = new XMLSerializer().serializeToString(svg);
		const url = URL.createObjectURL(new Blob([content], { type: "image/svg+xml" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		link.hidden = true;
		document.body.appendChild(link);
		link.click();
		link.remove();
		window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
	}
	function getFilename(detail) {
		const pathName = location.pathname.match(/\/free-icon\/([^/]+)/)?.[1];
		if (pathName) return `${pathName}.svg`;
		const name = detail.dataset.name?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "icon";
		const id = detail.dataset.id;
		return `${name}${id ? `_${id}` : ""}.svg`;
	}
	main();
})();
