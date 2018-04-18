
export class DalpError extends Error {
	constructor([message, payload], ...args) {
		super(message, ...args);
		this.stack = this.stack || (new Error()).stack;
		this.payload = payload;
	}
}
