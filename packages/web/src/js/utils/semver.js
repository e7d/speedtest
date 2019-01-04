export default class Semver {
    static toInt(semVer, zeros = 3) {
        return +(semVer || "")
            .split(".")
            .map(part => part.padStart(zeros, 0))
            .join("");
    }
}
