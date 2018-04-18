import keymirror from 'keymirror';
import {extractEntityName} from '../queryHelpers';

const feathersMethods = keymirror({
	get: null,
	find: null,
	create: null,
	update: null,
	patch: null,
	remove: null,
});

function createFeathersQuery(dalpQuery) {
	const feathersQuery = {
		...dalpQuery.filter,
	};

	if (dalpQuery.order) {
		feathersQuery.$sort = dalpQuery.order;
	}

	return feathersQuery;
}

function createFeathersParams(dalpQuery) {
	const params = {...dalpQuery.filter};
	return params;
}

function createFeathersMethod(dalpQuery) {
	if (dalpQuery.get) {
		return feathersMethods.get;
	} else if (dalpQuery.find) {
		return feathersMethods.find;
	} else if (dalpQuery.create) {
		return feathersMethods.create;
	} else if (dalpQuery.update) {
		return feathersMethods.update;
	} else if (dalpQuery.patch) {
		return feathersMethods.patch;
	} else if (dalpQuery.remove) {
		return feathersMethods.remove;
	}
}


export default class DalpFeathersAdapter {

	constructor({entityServiceMap}) {
		this.entityServiceMap = entityServiceMap;
	}

	getService({entityName}) {
		return this.entityServiceMap[entityName];
	}

	executeQuery(dalpQuery: TDalpQuery) {
		const method = createFeathersMethod(dalpQuery);
		const entityName = extractEntityName(dalpQuery);
		const query = createFeathersQuery(dalpQuery);

		const service = this.getService({entityName});

		switch (method) {

			case feathersMethods.get: {
				return service.get(query.id, {query});
			}

			case feathersMethods.find: {
				return service.find({query});
			}

			case feathersMethods.create: {
				const params = createFeathersParams(dalpQuery);
				return service.create(dalpQuery.data, query);
			}

			case feathersMethods.update: {
				return service.update(query.id, dalpQuery.data, query);
			}

			case feathersMethods.patch: {
				return service.patch(query.id, dalpQuery.data, query);
			}

			case feathersMethods.remove: {
				return service.remove(query.id, query);
			}

			default: throw new Error(`Cant executeQuery, unsupported method "${method}"`);
		}
	}

	subscribeToEntity(entityName, handlers) {
		const service = this.getService({entityName});

		const subscriptions = [];
		Object.keys(handlers).forEach(eventName => {
			subscriptions.push(
				service.on(eventName, handlers[eventName])
			);
		});

		return function unsubscribeFromEntity() {
			subscriptions.forEach(unsubscribe => unsubscribe());
		};
	}

}
