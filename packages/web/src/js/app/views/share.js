import { UI } from "../ui";
import Results from "../results";

export default class ShareView {
  constructor() {
    this.attachEventHandlers();
  }

  /**
   * Attach event handlers to the UI
   */
  attachEventHandlers() {
    UI.$shareResultLink.addEventListener("click", this.shareResultLinkClickHandler.bind(this));
    UI.$shareResultLinkCopyButton.addEventListener("click", this.shareResultLinkCopyButtonClickHandler.bind(this));
    UI.$shareResultImage.addEventListener("click", this.shareResultImageClickHandler.bind(this));
    UI.$shareResultImageCopyButton.addEventListener("click", this.shareResultImageCopyButtonClickHandler.bind(this));
    UI.$shareResultEmbed.addEventListener("click", this.shareResultEmbedClickHandler.bind(this));
    UI.$shareResultEmbedCopyButton.addEventListener("click", this.shareResultEmbedCopyButtonClickHandler.bind(this));
    UI.$shareResultForum.addEventListener("click", this.shareResultForumClickHandler.bind(this));
    UI.$shareResultForumCopyButton.addEventListener("click", this.shareResultForumCopyButtonClickHandler.bind(this));
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
   * Select the share result image link on text input click
   */
  shareResultImageClickHandler() {
    UI.$shareResultImage.select();
  }

  /**
   * Select and copy the share result image link on "Copy" button click
   */
  shareResultImageCopyButtonClickHandler() {
    UI.$shareResultImage.select();
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
   * Reset the share results field
   */
  clearShareResult() {
    UI.$shareResultImagePreview.src = "";
    UI.$shareResultLink.value = "";
    UI.$shareResultImage.value = "";
    UI.$shareResultEmbed.value = "";
    UI.$shareResultForum.value = "";
  }

  /**
   * Generate share results link and image from the URL id
   */
  generateShareResult() {
    this.clearShareResult();

    Results.loadFromUri(false)
      .then(() => {
        const id = window.location.pathname.split('/').pop();
        const link = `${window.location.origin}/result/${id}`;
        const image = `${window.location.origin}/results/${id}.png`;
        UI.$shareResultImagePreview.src = image;
        UI.$shareResultLink.value = link;
        UI.$shareResultImage.value = image;
        UI.$shareResultEmbed.value = `<a href="${link}"><img src="${image}"></a>`;
        UI.$shareResultForum.value = `[URL=${link}][IMG]${image}[/IMG][/URL]`;
      })
      .catch(() => {
        UI.$unknownResultsAlert.removeAttribute("hidden");
      });
  }
}
