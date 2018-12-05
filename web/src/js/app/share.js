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
        UI.$shareResultsLink.addEventListener(
            "click",
            this.shareResultsLinkClickHandler.bind(this)
        );
        UI.$shareResultsLinkCopyButton.addEventListener(
            "click",
            this.shareResultsLinkCopyButtonClickHandler.bind(this)
        );
    }

    /**
     * Select the share result link on text input click
     */
    shareResultsLinkClickHandler() {
        UI.$shareResultsLink.select();
    }

    /**
     * Select and copy the share result link on "Copy" button click
     */
    shareResultsLinkCopyButtonClickHandler() {
        UI.$shareResultsLink.select();
        document.execCommand("copy");
    }

    /**
     * Show the page to share results
     */
    generateShareResultsLinks() {
        UI.$shareResultsLink.value = `${window.location.origin}/result${
            window.location.hash
        }`;

        html2canvas(UI.$speedtest, {
            logging: false,
            scale: 1,
            onclone: doc => {
                const $el = doc.querySelector("#speedtest");
                $el.removeAttribute("hidden");
                $el.classList.add("share");
                $el.style.backgroundColor = window
                    .getComputedStyle(UI.$html, null)
                    .getPropertyValue("background-color");
            }
        }).then(canvas => {
            UI.$shareResultsImage.src = canvas.toDataURL("image/png");
        });
    }
}
