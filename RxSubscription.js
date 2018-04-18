import {BehaviorSubject} from 'rxjs';

export default class RxSubscription extends BehaviorSubject {

	constructor(firstValue, payload) {
		super(firstValue);
		this._payload = payload;
	}

	getPayload() {
		return this._payload;
	}

	updatePayload({query, sortIdsMap, data, dataType}) {
		const payload = this.getPayload();
		const newPayload = {
			...this.getPayload(),
		};

		if (query) {
			newPayload.query = query;
		}
		if (dataType) {
			newPayload.dataType = dataType;
		}
		if (data) {
			newPayload.data = {...payload.data, ...data};
		}
		if (sortIdsMap) {
			newPayload.sortIdsMap = {...payload.sortIdsMap, ...sortIdsMap};
		}

		this._payload = newPayload;
	}
}