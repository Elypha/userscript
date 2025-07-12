// ==UserScript==
// @name         booth.pm: Grid Image Viewer
// @namespace    https://github.com/Elypha/userscript
// @version      1.0
// @description  Adds a button to view all preview images in an overlay with a main viewer and a thumbnail grid.
// @author       Elypha
// @match        https://booth.pm/*/items/*
// @match        https://*.booth.pm/items/*
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.js
// @require      https://cdn.jsdelivr.net/npm/lightbox2@2.11.5/dist/js/lightbox.min.js
// ==/UserScript==

(function ($) {
    'use strict';

    function getImageLinks() {
        var urls = $("div.container div.primary-image-area div.slick-track div.slick-slide[data-slick-index]")
            .filter(function () {
                return !$(this).hasClass('slick-cloned');
            })
            .map(function () {
                // a) The original size can sometimes be 4K and may take longer time to load.
                // return $(this).find("img").attr("data-origin");

                // b) `data-lazy` returns *_base_resized, usually 1024px
                // NOTE: when the image has been displayed, `data-lazy` will be removed and replaced with `src`
                // https://booth.pximg.net/acea9fa6-7b8c-4604-9087-5195334e9488/i/6397984/fa23b827-7f88-4db7-a7ba-a781f4525457_base_resized.jpg
                return $(this).find("img").attr("data-lazy") || $(this).find("img").attr("src");
            })
            .toArray();
        return urls;
    }

    GM_addStyle(`
        .image-viewer-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }
        .image-viewer-main-view {
            width: 80%;
            height: 70%;
            margin-bottom: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .image-viewer-main-view img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .image-viewer-grid {
            width: 85%;
            height: 25%;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 10px;
            background: #333;
            padding: 10px;
            border-radius: 5px;
        }
        .image-viewer-grid img {
            width: 100%;
            height: auto;
            cursor: pointer;
            border: 2px solid transparent;
            transition: border-color 0.3s;
        }
        .image-viewer-grid img:hover, .image-viewer-grid img.selected {
            border-color: #00aaff;
        }
        .image-viewer-close-btn {
            position: absolute;
            top: 20px;
            right: 30px;
            font-size: 30px;
            color: white;
            cursor: pointer;
        }
        .view-images-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9998;
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }

        /* Custom Scrollbar */
        .image-viewer-grid::-webkit-scrollbar {
            width: 8px;
        }
        .image-viewer-grid::-webkit-scrollbar-track {
            background: #555;
            border-radius: 4px;
        }
        .image-viewer-grid::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
        }
        .image-viewer-grid::-webkit-scrollbar-thumb:hover {
            background: #aaa;
        }
    `);

    // Viewer functionality
    function openImageViewer() {
        const imageUrls = getImageLinks();
        if (!imageUrls || imageUrls.length === 0) {
            alert("No images found.");
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'image-viewer-overlay';
        document.body.appendChild(overlay);

        const mainView = document.createElement('div');
        mainView.className = 'image-viewer-main-view';
        const mainImage = document.createElement('img');
        mainImage.src = imageUrls[0];
        mainView.appendChild(mainImage);

        const grid = document.createElement('div');
        grid.className = 'image-viewer-grid';

        const closeButton = document.createElement('span');
        closeButton.className = 'image-viewer-close-btn';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => document.body.removeChild(overlay);

        overlay.append(closeButton, mainView, grid);

        imageUrls.forEach((url, index) => {
            const thumb = document.createElement('img');
            thumb.src = url;
            thumb.dataset.index = index;
            if (index === 0) thumb.classList.add('selected');

            thumb.addEventListener('click', () => {
                mainImage.src = url;
                grid.querySelector('.selected')?.classList.remove('selected');
                thumb.classList.add('selected');
            });

            grid.appendChild(thumb);
        });
    }

    // Button to trigger the Viewer
    const viewButton = document.createElement('button');
    viewButton.innerText = 'View Images';
    viewButton.className = 'view-images-btn';
    document.body.appendChild(viewButton);

    viewButton.addEventListener('click', openImageViewer);

})(jQuery);
