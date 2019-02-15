export default class SemVer {
  static toInt(semVer, zeros = 3) {
    return +(semVer || "")
      .split("-")[0]
      .split(".")
      .map(part => part.padStart(zeros, 0))
      .join("");
  }

  static isCurrentOrNewer(leftSemVer, rightSemVer, criteria = "revision") {
    const [leftSemVerInt, rightSemVerInt] = [this.toInt(leftSemVer), this.toInt(rightSemVer)].map(semVer =>
      Math.round(
        semVer /
          {
            major: 1e6,
            minor: 1e3,
            revision: 1
          }[criteria]
      )
    );

    return leftSemVerInt >= rightSemVerInt;
  }
}
