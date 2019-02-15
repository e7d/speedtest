export default class Result {
  constructor() {
    if (!Result.instance) {
      Result.instance = this;
    }

    return Result.instance;
  }
}
