import _ from 'lodash';
import {specialFilters} from 'feathers-commons/lib/utils';

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

export function matcher(originalQuery) {
	const query = _.omit(originalQuery, '$limit', '$skip', '$sort', '$select');

	return function (item) {
		if (query.$or && _.some(query.$or, function (or) {
				return matcher(or)(item);
			})) {
			return true;
		}

		return _.every(query, function (value, key) {
			if (value !== null && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
				return _.every(value, function (target, filterType) {
					if (specialFilters[filterType]) {
						const filter = specialFilters[filterType](key, target);
						return filter(item);
					}

					// TODO make PR to lib ? add typeof
					if (originalQuery[key] && item[key]) {
						return matcher(originalQuery[key])(item[key]);
					}

					return false;
				});
			} else if (typeof item[key] !== 'undefined') {
				return item[key] === query[key];
			}

			return false;
		});
	};
}