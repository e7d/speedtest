export default class Scope {
    constructor(scope) {
        if (!Scope.instance) {
            Scope.instance = scope;
        }

        return Scope.instance;
    }
}
