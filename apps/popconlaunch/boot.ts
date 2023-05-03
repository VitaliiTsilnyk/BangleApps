// TODO: fastload
type Timestamp = number;

const oldRead = require("Storage").readJSON;
const monthAgo = Date.now() - 1000 * 86400 * 28;
let cache: undefined | {
	[key: string]: {
		sortorder: number,
		pop: number, // amount of launches
		last: Timestamp,
	}
};

const ensureCache = (): NonNull<typeof cache> => {
	if(!cache){
		cache = oldRead("popcon.cache.json", true);
		if(!cache)
			cache = {};
	}
	return cache;
};

const saveCache = (orderChanged: boolean) => {
	require("Storage").writeJSON("popcon.cache.json", cache);
	if(orderchanged){
		// wipe launcher cache
		require("Storage")
			.list(/launch.*cache/)
			.forEach(f => require("Storage").erase(f))
	}
};

const sortCache = () => {
	const ents = Object.values(cache);

	ents.sort((a, b) => {
		// group the most recently launched apps in the last month,
		// then sort by launch count
		// then by name
		let n;

		const am = (a.last > monthAgo) as unknown as number;
		const bm = (b.last > monthAgo) as unknown as number;
		n = bm - am;
		if(n) return n;

		n = b.pop - a.pop;
		if(n) return n;

		// pops are the same, sort by most recent
		n = b.last - a.last;
		if(n) return n;

		if(a.name<b.name) return -1;
		if(a.name>b.name) return 1;
		return 0;
	});

	let i = 0;
	let orderChanged = false;
	for(const ent of ents){
		if(ent.sortorder !== i) orderChanged = true;
		ent.sortorder = i++;
	}
	return orderChanged;
};

require("Storage").readJSON = ((fname, skipExceptions) => {
	const j: AppInfo = oldRead(fname, skipExceptions);
	//       ^ technically only AppInfo if we're "*.info"

	if(/\.info$/.test(fname)){
		const cache = ensureCache();
		let so;

		if(j.src && (so = cache[j.src]?.sortorder) != null)
			j.sortorder = so;
		else
			j.sortorder = 99;
	}

	return j;
}) satisfies typeof oldRead;

const oldLoad = load;
global.load = (src: string) => {
	if(src){
		const cache = ensureCache();
		const ent = cache[src] ||= {
			pop: 0,
			last: 0,
			sortorder: -10,
		};
		ent.pop++;
		ent.last = Date.now();
		const orderChanged = sortCache();
		saveCache(orderChanged);
	}

	return oldLoad(src);
};
