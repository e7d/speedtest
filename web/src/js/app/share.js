import { UI } from "./ui";
import html2canvas from "html2canvas";

export default class Share {
    constructor() {
        this.attachEventHandlers();
    }

    /**
     * Attach event handlers to the UI
     */
    attachEventHandlers() {
        UI.$shareResultLink.addEventListener(
            "click",
            this.shareResultLinkClickHandler.bind(this)
        );
        UI.$shareResultLinkCopyButton.addEventListener(
            "click",
            this.shareResultLinkCopyButtonClickHandler.bind(this)
        );
    }

    /**
     * Select the share result link on text input click
     */
    shareResultLinkClickHandler() {
        UI.$shareResultLink.select();
    }

    /**
     * Select and copy the share result link on "Copy" button click
     */
    shareResultLinkCopyButtonClickHandler() {
        UI.$shareResultLink.select();
        document.execCommand("copy");
    }

    /**
     * Show the page to share results
     */
    generateShareResultLinks() {
        UI.$shareResultLink.value = `${window.location.origin}/result${
            window.location.hash
        }`;

        html2canvas(UI.$speedtest, {
            logging: false,
            scale: 1,
            onclone: doc => {
                const $el = doc.querySelector("#speedtest");
                $el.removeAttribute("hidden");
                $el.classList.add("share");
                $el.setAttribute(
                    "style",
                    `background: ${window
                        .getComputedStyle(UI.$body)
                        .getPropertyValue("background-color")};`
                );
            }
        }).then(canvas => {
            UI.$shareResultImage.src = canvas.toDataURL("image/png");
        });
    }
}
