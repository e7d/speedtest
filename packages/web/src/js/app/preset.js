export default {
  fast: {
    fields: {
      "config.latency.duration": 2,
      "config.download.duration": 5,
      "config.upload.duration": 5,
    }
  },
  normal: {
    fields: {
      "config.latency.duration": 5,
      "config.download.duration": 10,
      "config.upload.duration": 10,
    }
  },
  accurate: {
    fields: {
      "config.latency.duration": 10,
      "config.download.duration": 20,
      "config.upload.duration": 20,
    }
  }
};
