class DownloadData {
  constructor(chunkSize = 64 * 1024) {
    if (!DownloadData.instance) {
      DownloadData.instance = this;

      this.chunkSize = chunkSize;
      this.chunk = Buffer.alloc(+chunkSize);
    }

    return DownloadData.instance;
  }

  *get(size = 8 * (1024 ** 2)) {
    const chunks = +size / +this.chunkSize;
    for (let index = 0; index < chunks; index++) {
      yield this.chunk;
    }
  }
}
module.exports = DownloadData;
