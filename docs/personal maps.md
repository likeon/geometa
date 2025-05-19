## Meta info
### request
```typescript
{  
  mapId: string,  
  panoId: string
}
```
### response
```typescript
{  
  country: string;
  metaName: string;  
  note: string;  
  images?: string[];  
  footer: string;
}
```

Removing   plonkitCountryUrl from response in new api because we don't use it anymore for long time

## Data model
- map
	- +isPersonal
- personalMeta
	- mapId (personal), metaId
- cachedMeta
	- metaId, name, noteHtml, footerHtml, images
- cachedLocation
- geoguessrId, panoId, cachedMetaId
  
## Todo #1
- [ ] api authentication
	- internal api endpoints called by sveltekit backend need authentication. something super simple would do for now.
	- sveltekit includes Bearer header with a token value (should be sent via eden)
	- api validates that token is valid
	- should only work in prod
		- skip in development
- [x] disable internal api endpoints from api swagger in prod ✅ 2025-05-18
- [x] implement api userscript location endpoint to fetch data from the new tables
- [ ] update api userscript location to fetch data from 3 sources in parallel
	- we need it running for the period of time during which we migrate from cloudflare service
	- try to get data from the following sources in parallel, prefer in order
		- new `synced` models
		- `cacheTable` - data will be dumped there from cloudflare kv
		- proxy from `geometa-info-service` in cloudflare
			- just http fetch
			- enable `pages.dev` domain in cloudflare and use it - we will have to reroute traffic from `learnablemeta.com/location-info` to the new setup
- [ ] move cloudflare kv data to cache table in postgres
	- needs to be completed after the task above is done - cloudflare kv should not receive any new writes to avoid data loss
	- dump all existing kv data and duplicate it in postgres
	- remove proxying from cloudflare service
- [ ] make generic 500

## Todo
- [ ] maps soft-delete
- [x] Reset modified at ✅ 2025-05-17
- [ ] reroute to new location-info address