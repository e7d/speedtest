import DateFormat from "../utils/dateFormat";
import { UI } from "./ui";
import Results from "./results";
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
     * Generate share results link and image from the URL id
     */
    generateShareResults() {
        Results.loadFromUri(false)
            .then(() => {
                this.generateShareResultLink();
                this.generateShareResultImage();
            })
            .catch(() => {
                UI.$unknownResultsAlert.removeAttribute("hidden");
            });
    }

    /**
     * Generate the link to share the result
     */
    generateShareResultLink() {
        const link = `${window.location.origin}/result${
            window.location.hash
        }`;
        UI.$shareResultLink.value = link
    }

    /**
     * Generate the image to share the result
     */
    generateShareResultImage() {
        html2canvas(UI.$speedtest, {
            logging: false,
            scale: 1,
            onclone: doc => {
                const $el = doc.querySelector("#speedtest");
                $el.removeAttribute("hidden");
                $el.classList.add("share");

                const $timestamp = $el.querySelector("#timestamp");
                $timestamp.innerHTML = DateFormat.toISO(
                    new Date(+$timestamp.getAttribute("timestamp"))
                ).replace(" ", "<br>");

                const $resultItems = $el.querySelectorAll(".result");
                $resultItems.forEach($resultItem =>
                    $resultItem.setAttribute(
                    "style",
                    `background: ${window
                        .getComputedStyle(UI.$body)
                        .getPropertyValue("background-color")};`
                    )
                );
            }
        }).then(canvas => {
            UI.$shareResultImage.src = canvas.toDataURL("image/png");
        });
    }
}
