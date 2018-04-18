import keymirror from 'keymirror';

export const queryMethods = keymirror({
	get: null,
	find: null,
	create: null,
	update: null,
	patch: null,
	remove: null,
});

export function extractMethod(query) {
	if (query.get) {
		return queryMethods.get;
	} else if (query.find) {
		return queryMethods.find;
	} else if (query.create) {
		return queryMethods.create;
	} else if (query.update) {
		return queryMethods.update;
	} else if (query.patch) {
		return queryMethods.patch;
	} else if (query.remove) {
		return queryMethods.remove;
	}
}

export function extractEntityName(query) {
	const name = query.get || query.find || query.create || query.update || query.patch || query.remove;
	if (!name) {
		throw new Error(['Incorrect query, cant extractEntityName', {query}]);
	}
	return name;
}

export function extractOrder(query) {
	return query.order;
}

export function createHash(query) {
	return query ? JSON.stringify(query) : 'all'; // TODO filter + sort + hash
}