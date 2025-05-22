export class Either<F extends Error, O> {
    value: Fail<F> | Ok<O>;

    constructor(value: F | O) {
        if (value instanceof Error) {
            this.value = new Fail<F>(value);
        } else {
            this.value = new Ok<O>(value);
        }
    }

    public static ok<F extends Error, O>(value: O): Either<F, O> {
        return new Either<never, O>(value);
    }

    public static fail<F extends Error, O>(value: F): Either<F, O> {
        return new Either<F, never>(value);
    }

    public isOk(): boolean {
        return this.value instanceof Ok;
    }

    public isFail(): boolean {
        return this.value instanceof Fail;
    }

    public unpack(): O | F {
        return this.value.getValue;
    }

    public pipe<T>(f: (O) => T): Either<F, T | O> {
        if (this.isOk()) {
            const result = f(this.value.getValue);
            if (result instanceof Either) {
                return new Either<F, T>(result.unpack() as T);
            } else {
                return new Either<F, T>(result);
            }
        } else {
            return this;
        }
    }

    public mapOk<T, V>(f: (V) => void): Either<F, T> | Either<F, O> {
        if (this.isOk()) {
            f(this.value.getValue);
            return new Either<F, T>(null);
        } else {
            return this;
        }
    }

    public mapFail<T, V>(f: (V) => void): Either<F, T> | Either<F, O> {
        if (this.isFail()) {
            f(this.value.getValue);
            return this;
        } else {
            return new Either<F, T>(null);
        }
    }
}

class Ok<T> {
    value: T;

    constructor(value: T) {
        this.value = value;
    }

    get getValue() {
        return this.value;
    }
}

class Fail<T> {
    value: T;

    constructor(value: T) {
        this.value = value;
    }

    get getValue() {
        return this.value;
    }
}
