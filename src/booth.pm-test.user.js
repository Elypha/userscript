// ==UserScript==
// @name         booth.pm: Debug
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Debugging script for booth.pm to test image viewer functionality.
// @author       You
// @match        https://booth.pm/*/items/*
// @match        https://*.booth.pm/items/*
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.js
// ==/UserScript==

'use strict';

(function ($) {
    var urls = $("div.container div.primary-image-area div.slick-track div.slick-slide[data-slick-index]")
        .filter(function () {
            return !$(this).hasClass('slick-cloned');
        })
        .map(function () {
            return $(this).find("img").attr("data-origin");
        })
        .toArray();


    console.log("Image URLs:", urls);
    console.log("Number of images found:", urls.length);

})(jQuery);
