// ==UserScript==
// @name         google.com: Quick Language Filter
// @namespace    https://github.com/Elypha/userscript
// @version      1.0
// @description  Add a few buttons to your search engine to filter results by language
// @author       Elypha
// @match        https://www.google.com/search?q=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.js
// ==/UserScript==

(function () {
    'use strict';

    function add_style() {
        const style = document.createElement("style");
        style.textContent = `
            div.filter-button {
                display: flex;
                flex-direction: row;
                align-items: center;
                margin-left: 0.33em;
                height: 45px;
            }

            div.filter-button button {
                color: #fff;
                border: solid 1px #eee;
                border-radius: 12px;
                padding: 0 9px;
                height: 30px;
            }
        `;
        document.head.appendChild(style);
    }

    function update_url_param(value) {
        var url = new URL(window.location.href);
        url.searchParams.delete('lr');
        url.searchParams.append('lr', value);
        window.location.href = url.href;
    }

    function create_filter_button(text, color, lang) {
        const button = document.createElement("button");
        button.textContent = text;
        button.style.backgroundColor = color;
        button.addEventListener("click", async () => {
            update_url_param(lang);
        });
        return button;
    }

    function add_lang_filter() {
        // set style
        add_style();
        console.log($("#hdtb-tls"));
        $("#hdtb-tls")[0].parentNode.parentNode.style.width = '800px';

        // add language filter
        const button_div = document.createElement("div");
        button_div.className = "filter-button";

        // zh-cn
        let zhcn_btn = create_filter_button("文", "hsl(0deg 100% 80%)", "lang_zh-CN");
        button_div.appendChild(zhcn_btn);
        // zh-tw
        let zhtw_btn = create_filter_button("書", "hsl(0deg 100% 80%)", "lang_zh-TW");
        button_div.appendChild(zhtw_btn);
        // ja-jp
        let jajp_btn = create_filter_button("あ", "hsl(220deg 100% 80%)", "lang_ja");
        button_div.appendChild(jajp_btn);
        // en-gb
        let engb_btn = create_filter_button("A", "hsl(240deg 100% 80%)", "lang_en");
        button_div.appendChild(engb_btn);

        $("#hdtb-tls").after(button_div);
    }

    const observer = new MutationObserver(() => {
        const element = $("#hdtb-tls");
        if (element.length > 0) {
            // Stop observing
            observer.disconnect();
            add_lang_filter();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
