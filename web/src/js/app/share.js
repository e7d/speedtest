import DateFormat from "../utils/dateFormat";
import { UI } from "./ui";
import Results from "./results";

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
        UI.$shareResultEmbed.addEventListener(
            "click",
            this.shareResultEmbedClickHandler.bind(this)
        );
        UI.$shareResultEmbedCopyButton.addEventListener(
            "click",
            this.shareResultEmbedCopyButtonClickHandler.bind(this)
        );
        UI.$shareResultForum.addEventListener(
            "click",
            this.shareResultForumClickHandler.bind(this)
        );
        UI.$shareResultForumCopyButton.addEventListener(
            "click",
            this.shareResultForumCopyButtonClickHandler.bind(this)
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
     * Select the share result embed code on text input click
     */
    shareResultEmbedClickHandler() {
        UI.$shareResultEmbed.select();
    }

    /**
     * Select and copy the share result embed code on "Copy" button click
     */
    shareResultEmbedCopyButtonClickHandler() {
        UI.$shareResultEmbed.select();
        document.execCommand("copy");
    }

    /**
     * Select the share result forum code on text input click
     */
    shareResultForumClickHandler() {
        UI.$shareResultForum.select();
    }

    /**
     * Select and copy the share result forum code on "Copy" button click
     */
    shareResultForumCopyButtonClickHandler() {
        UI.$shareResultForum.select();
        document.execCommand("copy");
    }

    /**
     * Generate share results link and image from the URL id
     */
    generateShareResults() {
        Results.loadFromUri(false)
            .then(() => {
                const link = `${window.location.origin}/result${window.location.hash}`;
                const image = `${
                    window.location.origin
                }/results/${window.location.hash.replace("#", "")}.png`;
                UI.$shareResultLink.value = link;
                UI.$shareResultEmbed.value = `<a href="${link}"><img src="${image}"></a>`;
                UI.$shareResultForum.value = `[URL=${link}][IMG]${image}[/IMG][/URL]`;
                UI.$shareResultImage.src = image;
            })
            .catch(() => {
                UI.$unknownResultsAlert.removeAttribute("hidden");
            });
    }
}
