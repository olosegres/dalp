import {extractEntityName} from './queryHelpers';
import {DalpError} from './DalpError';
import UpdateListener from './updateListeners/UpdateListener';

const FALLBACK_ADAPTER_KEY = 'fallback';

function extractAdapter(entityAdapterMap, entityName) {
	const adapter = entityAdapterMap[entityName] || entityAdapterMap[FALLBACK_ADAPTER_KEY];
	if (!adapter) {
		throw new DalpError([`Cant extractAdapter, no rule in map for entity ${entityName}`, {entityAdapterMap}]);
	}
	return adapter;
}


export default class Dalp {

	entityAdapterMap: TEntityAdapterMap;

	constructor({entityAdapterMap}) {

		if (!entityAdapterMap || !Object.keys(entityAdapterMap).length) {
			throw new DalpError(['Cant construct without entityAdapterMap', {entityAdapterMap}]);
		}

		this.entityAdapterMap = entityAdapterMap;
		this.updateListener = new UpdateListener();
	}

	execute(query) {
		return this.adapter.executeQuery(query);
	}

	subscribe(query, handler, options = {}) {
		const {emitOnce, execute = true} = options;

		const entityName = extractEntityName(query);
		const adapter = extractAdapter(this.entityAdapterMap, entityName);

		const subscribedToEntity = this.updateListener.isSubscribedToEntity(entityName);
		if (!subscribedToEntity) {
			this.updateListener.subscribeToEntity({entityName, adapter});
		}

		const subscription = this.updateListener.subscribeToQuery({query, handler, emitOnce});

		// if (this.cacheQueries) {
		// //	TODO
		// }

		if (execute) {
			const handleResult = this.updateListener.createFirstResultHandler(query);
			adapter.executeQuery(query).then(handleResult);
		}

		return subscription;
	}
}