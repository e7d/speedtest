import html2canvas from "html2canvas";

export default class Share {
    constructor(ui) {
        this.ui = ui;

        this.attachEventHandlers();
    }

    /**
     * Attach event handlers to the UI
     */
    attachEventHandlers() {
        this.ui.$shareResultsLink.addEventListener(
            "click",
            this.shareResultsLinkClickHandler.bind(this)
        );
        this.ui.$shareResultsLinkCopyButton.addEventListener(
            "click",
            this.shareResultsLinkCopyButtonClickHandler.bind(this)
        );
    }

    /**
     * Select the share result link on text input click
     */
    shareResultsLinkClickHandler() {
        this.ui.$shareResultsLink.select();
    }

    /**
     * Select and copy the share result link on "Copy" button click
     */
    shareResultsLinkCopyButtonClickHandler() {
        this.ui.$shareResultsLink.select();
        document.execCommand("copy");
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
