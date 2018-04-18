import keymirror from 'keymirror';
import {debounce, get, merge} from 'lodash';
import {matcher} from './../matcher';

import RxSubscription from './../RxSubscription';
import {createHash, extractEntityName, extractMethod, extractOrder, queryMethods} from './../queryHelpers';
import {DalpError} from './../DalpError';

export const dataTypes = keymirror({
	collection: null,
	item: null,
});

export const entityEvents = keymirror({
	created: null,
	updated: null,
	patched: null,
	removed: null,
});


export function match(query, entity) {
	const {filter} = query;
	return matcher(filter)(entity);
}

function createNewSortPosition({entity, order}) { // TODO order may be array?
	// const sortKey = extractSortKey({entity, query});

	if (!order || !entity) {
		return 0;
	}

	const sortKey = order ? Object.keys(order)[0] : 'id';

	if (sortKey && order && order[sortKey] && Object.keys(order[sortKey]).length) {
		return createNewSortPosition({entity: entity[sortKey], order: order[sortKey]});
	}

	return entity[sortKey] || 0;
}


function extractCurrentSortPosition({entity, sortIdsMap}) {
	let sortPosition;

	Object.values(sortIdsMap).forEach((id, i) => {
		if (entity.id === id) {
			const sortPositions = Object.keys(sortIdsMap);
			sortPosition = sortPositions[i];
		}
	});

	return sortPosition;
}

function createSortedValues(sortIdsMap) {
	return Object.keys(sortIdsMap); // TODO if there is reverse sorting
}

export function createSortedArray({data, sortIdsMap, eventName, entity}) {
	const sortedValuesArray = createSortedValues(sortIdsMap);

	if (eventName && entity && eventName === 'created') {
		const lastItemId = sortedValuesArray[sortedValuesArray.length - 1];
		if (lastItemId === entity.id) {
			return Object.values(data);
		}
	}

	const dataArray = sortedValuesArray.map(sortPosition => {
		const id = sortIdsMap[sortPosition];
		return data[id];
	});

	return dataArray;
}

const fireCollection = ({observable, eventName, entity}) => {
	const {data, sortIdsMap} = observable.getPayload();
	const dataArray = createSortedArray({data, sortIdsMap, eventName, entity});
	observable.next(dataArray);
};

const fireCollectionDebounced = debounce(({observable, eventName, entity}) => {
	const {data, sortIdsMap} = observable.getPayload();
	const dataArray = createSortedArray({data, sortIdsMap, eventName, entity});
	observable.next(dataArray);
}, 10);

function createNewCollectionPayoad({payload, entity, eventName}) {
	const {data, query, sortIdsMap} = payload;

	switch (eventName) {
		case 'created':
		case 'updated':
		case 'patched': {
			const currentSortPosition = extractCurrentSortPosition({entity, sortIdsMap});

			// if (entity.id && data[entity.id]) {

			const updatedItem = merge(data[entity.id] || {}, entity);

			data[entity.id] = updatedItem;

			const sortParams = get(query, '$sort', null);

			const newSortPosition = createNewSortPosition({entity: updatedItem, sortParams});

			if (!newSortPosition) {
				const sortPositions = Object.keys(sortIdsMap);
				const maxSortPosition = sortPositions[sortPositions.length - 1];
				sortIdsMap[maxSortPosition + 1] = entity.id;

			} else if (currentSortPosition !== newSortPosition) {

				const replacementSortId = sortIdsMap[newSortPosition];

				if (currentSortPosition && replacementSortId && replacementSortId !== entity.id) {
					sortIdsMap[currentSortPosition] = replacementSortId;
				}

				if (sortIdsMap[currentSortPosition] === entity.id) {
					delete sortIdsMap[currentSortPosition];
				}

				sortIdsMap[newSortPosition] = entity.id;
				/// нельзя удалять, последующие события должны сами все разрулить
			}

			// } else {
			//
			// 	// data[entity.id] = entity;
			// 	sortIdsMap[newSortPosition] = entity.id;
			//
			// }
		} break;

		case 'removed': {
			let sortPosition;

			Object.values(sortIdsMap).forEach((id, i) => {
				if (entity.id === id) {
					const sortPositions = Object.keys(sortIdsMap);
					sortPosition = sortPositions[i];
				}
			});

			delete sortIdsMap[sortPosition];
			delete data[entity.id];
		} break;

		default: break;
	}

	return {data, sortIdsMap};
}

function createNewItemPayload({payload, eventName, entity}) {
	const {data} = payload;

	let newData = null;

	switch (eventName) {
		case 'created':
		case 'updated':
		case 'patched':
			newData = merge(data || {}, entity);
			break;

		default: break;
	}

	return {data: newData};
}

function createNextItemValue(payload) {
	return payload.data;
}

function createEntityEventHandler({eventName, queryObservables}) {

	return (entity) => {
		const queryHashes = Object.keys(queryObservables);

		for (let i = 0; i < queryHashes.length; i++) {
			const key = queryHashes[i];
			const observable = queryObservables[key];
			const payload = observable.getPayload();
			const {query, dataType} = payload;

			if (!query || match(query, entity)) {

				if (dataType === dataTypes.collection) {
					const newPayload = createNewCollectionPayoad({payload, eventName, entity});

					observable.updatePayload(newPayload);

					const debounceMs = (eventName === entityEvents.patched) ? 10 : 0;

					if (debounceMs) {
						return fireCollectionDebounced({observable, eventName, entity});
					}

					return fireCollection({observable, eventName, entity});

				} else {

					const newPayload = createNewItemPayload({payload, eventName, entity});
					observable.updatePayload(newPayload);

					const nextValue = createNextItemValue(newPayload);

					if (nextValue) {
						observable.next(nextValue);
					} else {
						// TODO unsubscribe?
					}
				}
			} else {
				debugger
			}
		}
	};
}

function createOrGetObservable({query, allObservables}) {
	const entityName = extractEntityName(query);
	const queryHash = createHash(query);
	const queryObservables = allObservables[entityName];

	if (!queryObservables[queryHash]) {
		const method = extractMethod(query);

		const dataType = (method === queryMethods.find) ? dataTypes.collection : dataTypes.item;
		const emptyValue = (method === queryMethods.find) ? [] : null;
		queryObservables[queryHash] = new RxSubscription(emptyValue, { query, dataType, data: {}, sortIdsMap: {} }); // eslint-disable-line
	}

	return queryObservables[queryHash];
}

function createSubscription({observable, handler, emitOnce}) {
	let subscription;

	if (emitOnce) {
		subscription = observable.first().subscribe(handler);
	} else {
		subscription = observable.subscribe(handler);
	}

	return subscription;
}

export default class UpdateListener {

	allObservables = {};
	entitySubscriptions = {};

	createFirstResultHandler(query) {
		const {allObservables} = this;
		const observable = createOrGetObservable({query, allObservables});

		const method = extractMethod(query);

		if (method === queryMethods.find) {
			return (collection) => {
				const order = extractOrder(query);

				const data = {};
				const sortIdsMap = {};

				collection.forEach(entity => {
					const sortPosition = createNewSortPosition({entity, order});

					data[entity.id] = entity;
					sortIdsMap[sortPosition] = entity.id;
				});

				observable.updatePayload({data, sortIdsMap});
				observable.next(collection);
			};
		}

		if (method === queryMethods.get) {
			return (entity) => {
				observable.updatePayload({data: entity});
				observable.next(entity);
			};
		}

		throw new DalpError([`Cant createFirstResultHandler, for method ${method}`]);
	}

	isSubscribedToEntity(entityName) {
		return !!this.entitySubscriptions[entityName];
	}

	subscribeToEntity({entityName, adapter}) {
		const {allObservables} = this;

		const queryObservables = {};

		allObservables[entityName] = queryObservables;

		const eventHandlers = {};

		Object.keys(entityEvents).forEach(eventName => {
			eventHandlers[eventName] = createEntityEventHandler({eventName, queryObservables});
		});

		const unsubscribe = adapter.subscribeToEntity(entityName, eventHandlers);

		this.entitySubscriptions[entityName] = unsubscribe;
	}

	subscribeToQuery({query, handler, emitOnce}) {
		const {allObservables} = this;
		const observable = createOrGetObservable({query, allObservables});
		const subscription = createSubscription({observable, handler, emitOnce});

		return subscription;
	}

}
