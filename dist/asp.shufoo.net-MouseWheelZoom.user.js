// ==UserScript==
// @name         asp.shufoo.net: Mouse Wheel Zoom
// @namespace    https://github.com/Elypha/userscripts
// @version      1.0.0
// @author       Elypha
// @description  Zoom Shufoo flyers around the mouse pointer with the wheel.
// @license      Apache-2.0
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/asp.shufoo.net-MouseWheelZoom.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/asp.shufoo.net-MouseWheelZoom.meta.js
// @match        https://asp.shufoo.net/c/*
// @match        https://asp.shufoo.net/t/asp_iframe/shop/*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	var stepThreshold = 60;
	var cooldownMilliseconds = 120;
	var resetMilliseconds = 180;
	var viewerWindow = window;
	var patchedPointPrototypes = new WeakSet();
	var accumulatedDelta = 0;
	var cooldownUntil = 0;
	var resetTimer;
	var pointerTransformActive = false;
	var pointerTransformTimer;
	installViewerPatches();
	window.addEventListener("load", installViewerPatches, {
		capture: true,
		once: true
	});
	window.addEventListener("wheel", handleWheel, {
		capture: true,
		passive: false
	});
	function installViewerPatches() {
		const chirashiPrototype = viewerWindow.Chirashi?.prototype;
		if (chirashiPrototype) for (const property of ["transitionDuration", "transitionDurationEnd"]) Object.defineProperty(chirashiPrototype, property, {
			configurable: true,
			get: () => 0,
			set: () => {}
		});
		const pointPrototype = viewerWindow.Point?.prototype;
		if (pointPrototype && !patchedPointPrototypes.has(pointPrototype)) {
			patchedPointPrototypes.add(pointPrototype);
			const originalTransform = pointPrototype.transform;
			pointPrototype.transform = function transformAroundPointer(scale, anchor) {
				if (!pointerTransformActive || !anchor) return originalTransform.call(this, scale, anchor);
				this.x = this.x * scale + anchor.x * (scale - 1);
				this.y = this.y * scale + anchor.y * (scale - 1);
				return this;
			};
		}
		if (!document.querySelector("style[data-shufoo-wheel-zoom]")) {
			const style = document.createElement("style");
			style.dataset.shufooWheelZoom = "";
			style.textContent = ".ChirashiContainer { transition-duration: 0s !important; }";
			document.head?.appendChild(style);
		}
	}
	function handleWheel(event) {
		if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
		if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
		if (!(event.target instanceof Element)) return;
		const viewer = document.querySelector("#chirashi_area.flash") ?? document.querySelector("#chirashi_area");
		if (!viewer?.contains(event.target) || event.target.closest(".toolbar")) return;
		const delta = normaliseDelta(event);
		const direction = Math.sign(delta);
		if (direction === 0) return;
		const control = document.querySelector(direction < 0 ? ".zoomInButton" : ".zoomOutButton");
		if (!control || control.classList.contains("btn_disabled")) return;
		event.preventDefault();
		const now = Date.now();
		if (now < cooldownUntil) {
			accumulatedDelta = 0;
			scheduleReset();
			return;
		}
		if (accumulatedDelta !== 0 && Math.sign(accumulatedDelta) !== direction) accumulatedDelta = 0;
		accumulatedDelta += delta;
		scheduleReset();
		if (Math.abs(accumulatedDelta) < stepThreshold) return;
		accumulatedDelta = 0;
		cooldownUntil = now + cooldownMilliseconds;
		clickNativeZoomAtPointer(control, viewer, event);
	}
	function clickNativeZoomAtPointer(control, viewer, event) {
		const OriginalPoint = viewerWindow.Point;
		if (!OriginalPoint) {
			control.click();
			return;
		}
		const viewerRect = viewer.getBoundingClientRect();
		const pointerX = event.clientX - viewerRect.left;
		const pointerY = event.clientY - viewerRect.top;
		const centreX = viewer.clientWidth / 2;
		const centreY = viewer.clientHeight / 2;
		let centreReplaced = false;
		viewerWindow.Point = new Proxy(OriginalPoint, { construct(target, argumentsList) {
			let pointArguments = argumentsList;
			if (!centreReplaced && Math.abs(Number(argumentsList[0]) - centreX) < .5 && Math.abs(Number(argumentsList[1]) - centreY) < .5) {
				centreReplaced = true;
				pointArguments = [pointerX, pointerY];
			}
			return Reflect.construct(target, pointArguments, target);
		} });
		pointerTransformActive = true;
		window.clearTimeout(pointerTransformTimer);
		try {
			control.click();
		} finally {
			viewerWindow.Point = OriginalPoint;
			pointerTransformTimer = window.setTimeout(() => {
				pointerTransformActive = false;
			}, 1e3);
		}
	}
	function normaliseDelta(event) {
		if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
		if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
		return event.deltaY;
	}
	function scheduleReset() {
		window.clearTimeout(resetTimer);
		resetTimer = window.setTimeout(() => {
			accumulatedDelta = 0;
		}, resetMilliseconds);
	}
})();
