//@ts-check

import html2canvas from "html2canvas";

export default class Share {
    constructor(ui) {
        this.ui = ui;
    }

    /**
     * Show the page to share results
     */
    generateShareResultsLinks() {
        this.ui.$shareResultsLink.value = `${window.location.origin}/result${
            window.location.hash
        }`;

        html2canvas(this.ui.$speedtest, {
            logging: false,
            scale: 1,
            onclone: doc => {
                const $el = doc.querySelector("#speedtest");
                $el.removeAttribute("hidden");
                $el.classList.add("share");
            }
        }).then(canvas => {
            this.ui.$shareResultsImage.src = canvas.toDataURL("image/png");
        });
    }
}
