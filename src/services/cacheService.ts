import { ContentType, RestUtils } from './utils';
import { Either, left, right } from './either';

/**
 * Cache Service calls Infinispan endpoints related to Caches
 * @author Katia Aresti
 * @since 1.0
 */
export class CacheService {
  endpoint: string;
  utils: RestUtils;

  constructor(endpoint: string, restUtils: RestUtils) {
    this.endpoint = endpoint;
    this.utils = restUtils;
  }

  /**
   * Retrieves all the properties to be displayed in the cache detail in a single rest call
   *
   * @param cacheName
   */
  public retrieveFullDetail(
    cacheName: string
  ): Promise<Either<ActionResponse, DetailedInfinispanCache>> {
    return this.utils
      .restCall(
        this.endpoint + '/caches/' + encodeURIComponent(cacheName),
        'GET'
      )
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then((data) => {
        const cacheStats = <CacheStats>{
          enabled: data.statistics,
          misses: data.stats.misses,
          time_since_start: data.stats.time_since_start,
          time_since_reset: data.stats.time_since_reset,
          hits: data.stats.hits,
          current_number_of_entries: data.stats.current_number_of_entries,
          current_number_of_entries_in_memory:
            data.stats.current_number_of_entries_in_memory,
          total_number_of_entries: data.stats.total_number_of_entries,
          stores: data.stats.stores,
          off_heap_memory_used: data.stats.off_heap_memory_used,
          data_memory_used: data.stats.data_memory_used,
          retrievals: data.stats.retrievals,
          remove_hits: data.stats.remove_hits,
          remove_misses: data.stats.remove_misses,
          evictions: data.stats.evictions,
          average_read_time: data.stats.average_read_time,
          average_read_time_nanos: data.stats.average_read_time_nanos,
          average_write_time: data.stats.average_write_time,
          average_write_time_nanos: data.stats.average_write_time_nanos,
          average_remove_time: data.stats.average_remove_time,
          average_remove_time_nanos: data.stats.average_remove_time_nanos,
          required_minimum_number_of_nodes:
            data.stats.required_minimum_number_of_nodes,
        };

        return right(<DetailedInfinispanCache>{
          name: cacheName,
          started: true,
          type: this.mapCacheType(data.configuration),
          size: data.size,
          rehash_in_progress: data.rehash_in_progress,
          indexing_in_progress: data.indexing_in_progress,
          queryable: data.queryable,
          features: <Features>{
            bounded: data.bounded,
            indexed: data.indexed,
            persistent: data.persistent,
            transactional: data.transactional,
            secured: data.secured,
            hasRemoteBackup: data.has_remote_backup,
          },
          configuration: <CacheConfig>{
            name: cacheName,
            config: JSON.stringify(data.configuration, null, 2),
          },
          stats: cacheStats,
        }) as Either<ActionResponse, DetailedInfinispanCache>;
      })
      .catch((err) => {
        const errorMessage =
          'Unable to retrieve cache detail of cache ' + cacheName;
        if (err instanceof Response) {
          return err.text().then((errResponse) => {
            if (errResponse == '') {
              errResponse = errorMessage;
            }
            return left(<ActionResponse>{
              message: errResponse,
              success: false,
            });
          });
        }

        return left(<ActionResponse>{
          message: err.toString() == '' ? errorMessage : err.toString(),
          success: false,
        });
      });
  }

  /**
   * Creates a cache by configuration name.
   * The template must be present in the server
   *
   * @param cacheName, the cache name
   * @param configName, the template name
   */
  public async createCacheByConfigName(
    cacheName: string,
    configName: string
  ): Promise<ActionResponse> {
    let createCachePromise = this.utils.restCall(
      this.endpoint +
        '/caches/' +
        encodeURIComponent(cacheName) +
        '?template=' +
        encodeURIComponent(configName),
      'POST'
    );
    return this.utils.handleCRUDActionResponse(
      'Cache ' + cacheName + ' created with success with ' + configName,
      createCachePromise
    );
  }

  /**
   * Create a cache with the configuration provided.
   * Config can be in json or xml format
   *
   * @param cacheName, the cache name
   * @param config, the configuration to send in the body
   */
  public async createCacheWithConfiguration(
    cacheName: string,
    config: string
  ): Promise<ActionResponse> {
    let contentType = ContentType.JSON;
    try {
      JSON.parse(config);
    } catch (e) {
      contentType = ContentType.XML;
    }
    let customHeaders = this.utils.createAuthenticatedHeader();
    customHeaders.append(
      'Content-Type',
      RestUtils.fromContentType(contentType)
    );

    let createCachePromise = this.utils.restCall(
      this.endpoint + '/caches/' + encodeURIComponent(cacheName),
      'POST',
      undefined,
      customHeaders,
      config
    );
    return this.utils.handleCRUDActionResponse(
      'Cache ' +
        cacheName +
        ' created with success with the provided configuration',
      createCachePromise
    );
  }

  /**
   * Delete cache by name
   *
   * @param cacheName, to be deleted if such exists
   */
  public async deleteCache(cacheName: string): Promise<ActionResponse> {
    let deleteCachePromise = this.utils.restCall(
      this.endpoint + '/caches/' + encodeURIComponent(cacheName),
      'DELETE'
    );

    return this.utils.handleCRUDActionResponse(
      'Cache ' + cacheName + ' has been deleted',
      deleteCachePromise
    );
  }

  /**
   * Ignore cache by name
   *
   * @param cacheName, to be deleted if such exists
   */
  public async ignoreCache(
    cacheManager: string,
    cacheName: string
  ): Promise<ActionResponse> {
    let ignoreCachePromise = this.utils.restCall(
      this.endpoint +
        '/server/ignored-caches/' +
        cacheManager +
        '/' +
        encodeURIComponent(cacheName),
      'POST'
    );

    return this.utils.handleCRUDActionResponse(
      'Cache ' + cacheName + ' has been ignored',
      ignoreCachePromise
    );
  }

  /**
   * Undo ignore cache by name
   *
   * @param cacheName, to be deleted if such exists
   */
  public async undoIgnoreCache(
    cacheManager: string,
    cacheName: string
  ): Promise<ActionResponse> {
    let ignoreCachePromise = this.utils.restCall(
      this.endpoint +
        '/server/ignored-caches/' +
        cacheManager +
        '/' +
        encodeURIComponent(cacheName),
      'DELETE'
    );

    return this.utils.handleCRUDActionResponse(
      'Cache ' + cacheName + ' is not ignored',
      ignoreCachePromise
    );
  }

  /**
   * Add entry
   *
   * @param cacheName
   * @param key
   * @param keyContentType
   * @param value
   * @param valueContentType
   * @param maxIdle
   * @param timeToLive
   * @param flags
   */
  public async createOrUpdate(
    cacheName: string,
    key: string,
    keyContentType: ContentType,
    value: string,
    valueContentType: ContentType,
    maxIdle: string,
    timeToLive: string,
    flags: string[],
    create: boolean
  ): Promise<ActionResponse> {
    let headers = this.utils.createAuthenticatedHeader();

    if (keyContentType) {
      headers.append(
        'Key-Content-Type',
        RestUtils.fromContentType(keyContentType)
      );
    } else if (RestUtils.isJSONObject(key)) {
      headers.append(
        'Key-Content-Type',
        RestUtils.fromContentType(ContentType.JSON)
      );
    }

    let contentTypeHeader;
    if (RestUtils.isJSONObject(value)) {
      contentTypeHeader = ContentType.JSON;
    } else if (valueContentType) {
      contentTypeHeader = valueContentType;
    } else {
      contentTypeHeader = ContentType.StringContentType;
    }

    headers.append(
      'Content-Type', contentTypeHeader);

    if (timeToLive.length > 0) {
      headers.append('timeToLiveSeconds', timeToLive);
    }
    if (maxIdle.length > 0) {
      headers.append('maxIdleTimeSeconds', maxIdle);
    }
    if (flags.length > 0) {
      headers.append('flags', flags.join(','));
    }

    const urlCreateOrUpdate =
      this.endpoint +
      '/caches/' +
      encodeURIComponent(cacheName) +
      '/' +
      encodeURIComponent(key);
    const createOrUpdateMethod = create ? 'POST' : 'PUT';

    const responsePromise = this.utils.restCall(
      urlCreateOrUpdate,
      createOrUpdateMethod,
      undefined,
      headers,
      value
    );
    let message = create
      ? 'A new entry has been added to cache '
      : 'The entry has been updated in cache ';
    return this.utils.handleCRUDActionResponse(
      message + cacheName,
      responsePromise
    );
  }

  /**
   * List of entries
   *
   * @param cacheName, the cache name
   * @param limit, maximum number of entries to be retrieved
   */
  public async getEntries(
    cacheName: string,
    config: CacheConfig,
    limit: string
  ): Promise<Either<ActionResponse, CacheEntry[]>> {
    const isProtobuf = RestUtils.isProtobufCache(config.config);
    const allKeys =
      this.endpoint +
      '/caches/' +
      encodeURIComponent(cacheName) +
      '?action=entries&metadata=true&limit=' +
      limit;
    return this.utils
      .restCall(allKeys, 'GET')
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then(
        (infos) =>
          right(
            infos.map(
              (entry) =>
                <CacheEntry>{
                  key: this.extractKey(entry.key, isProtobuf[0]),
                  keyContentType: isProtobuf[0]
                    ? RestUtils.fromProtobufType(entry.key['_type'])
                    : ContentType.StringContentType,
                  value: this.extractValue(entry.value),
                  valueContentType: isProtobuf[1]
                    ? entry.value['_type']
                    : undefined,
                  timeToLive: this.parseMetadataNumber(entry.timeToLiveSeconds),
                  maxIdle: this.parseMetadataNumber(entry.maxIdleTimeSeconds),
                  created: this.parseMetadataDate(entry.created),
                  lastUsed: this.parseMetadataDate(entry.lastUsed),
                  expires: this.parseMetadataDate(entry.expireTime),
                }
            )
          ) as Either<ActionResponse, CacheEntry[]>
      )
      .catch((err) =>
        left(
          this.utils.mapError(
            err,
            'An error happened retrieving entries from ' + cacheName
          )
        )
      );
  }

  private extractKey(key: any, protobufKey: boolean) : string {
    if(protobufKey) {
      const keyValue = key['_value'];
      if (RestUtils.isJSONObject(keyValue) && !RestUtils.isProtobufBasicType(key['_type'])) {
        return JSON.stringify(keyValue);
      }
      return keyValue.toString();
    }

    return key.toString();
  }

  private extractValue(value: any) : string {
    return JSON.stringify(value);
  }

  /**
   * Get entry by key
   * @param cacheName
   * @param key
   * @param keyContentType
   * @return Entry or ActionResponse
   */
  public async getEntry(
    cacheName: string,
    key: string,
    keyContentType?: ContentType
  ): Promise<Either<ActionResponse, CacheEntry>> {
    let headers = this.utils.createAuthenticatedHeader();
    if (keyContentType) {
      let keyContentTypeHeader = RestUtils.fromContentType(keyContentType);
      headers.append('Key-Content-Type', keyContentTypeHeader);
    }
    const getEntryUrl =
      this.endpoint +
      '/caches/' +
      encodeURIComponent(cacheName) +
      '/' +
      encodeURIComponent(key);

    return this.utils
      .restCall(getEntryUrl, 'GET', undefined, headers)
      .then((response) => {
        if (response.ok) {
          return response.text().then((value) => {
            const timeToLive = response.headers.get('timeToLiveSeconds');
            const maxIdleTimeSeconds = response.headers.get(
              'maxIdleTimeSeconds'
            );
            const created = response.headers.get('created');
            const lastUsed = response.headers.get('lastUsed');
            const lastModified = response.headers.get('Last-Modified');
            const expires = response.headers.get('Expires');
            const cacheControl = response.headers.get('Cache-Control');
            const etag = response.headers.get('Etag');
            return <CacheEntry>{
              key: key,
              value: value,
              keyContentType: keyContentType,
              valueContentType: undefined,
              timeToLive: this.parseMetadataNumber(timeToLive),
              maxIdle: this.parseMetadataNumber(maxIdleTimeSeconds),
              created: this.parseMetadataDate(created),
              lastUsed: this.parseMetadataDate(lastUsed),
              lastModified: lastModified
                ? this.parseMetadataDate(Date.parse(lastModified))
                : undefined,
              expires: expires
                ? this.parseMetadataDate(Date.parse(expires))
                : undefined,
              cacheControl: cacheControl,
              eTag: etag,
            };
          });
        }
        throw response;
      })
      .then((data) => right(data) as Either<ActionResponse, CacheEntry>)
      .catch((err) => {
        if (err.status.valueOf() == 404) {
          // Not Found is an error but a success action result
          return left(<ActionResponse>{
            message: 'The entry key ' + key + ' does not exist',
            success: true,
          });
        }

        return left(
          this.utils.mapError(err, 'An error happened retrieving key ' + key)
        );
      });
  }

  private parseMetadataNumber(
    entryMetadata: number | undefined | null | string
  ): string | undefined {
    if (!entryMetadata || entryMetadata == -1 || entryMetadata == '-1') {
      return undefined;
    }
    let entryMetadataNumber: number;
    if (Number.isInteger(entryMetadata)) {
      entryMetadataNumber = entryMetadata as number;
    } else {
      entryMetadataNumber = Number.parseInt(entryMetadata as string);
    }
    return entryMetadataNumber.toLocaleString('en', {
      maximumFractionDigits: 0,
    });
  }

  private parseMetadataDate(
    entryMetadata: string | number | undefined | null
  ): string | undefined {
    if (!entryMetadata || entryMetadata == -1 || entryMetadata == '-1') {
      return undefined;
    }

    let entryMetadataNumber: number;

    if (Number.isInteger(entryMetadata)) {
      entryMetadataNumber = entryMetadata as number;
    } else {
      entryMetadataNumber = Number.parseInt(entryMetadata as string);
    }
    return new Date(entryMetadataNumber).toLocaleString();
  }

  /**
   * Clear cache
   * @param cacheName, the name of the cache
   */
  public async clear(cacheName: string): Promise<ActionResponse> {
    let clearPromise = this.utils.restCall(
      this.endpoint +
        '/caches/' +
        encodeURIComponent(cacheName) +
        '?action=clear',
      'POST'
    );

    return this.utils.handleCRUDActionResponse(
      'Cache ' + cacheName + ' has been cleared',
      clearPromise
    );
  }

  /**
   * Delete entry from cache
   *
   * @param cacheName, cache name
   * @param entryKey, entry key
   */
  public async deleteEntry(
    cacheName: string,
    entryKey: string,
    keyContentType: ContentType
  ): Promise<ActionResponse> {
    let headers = this.utils.createAuthenticatedHeader();
    let keyContentTypeHeader = RestUtils.fromContentType(keyContentType);
    headers.append('Key-Content-Type', keyContentTypeHeader);

    const deleteUrl =
      this.endpoint +
      '/caches/' +
      encodeURIComponent(cacheName) +
      '/' +
      encodeURIComponent(entryKey);
    let deleteEntryPromise = this.utils.restCall(
      deleteUrl,
      'DELETE',
      undefined,
      headers
    );

    return this.utils.handleCRUDActionResponse(
      'Entry ' + entryKey + ' has been deleted',
      deleteEntryPromise
    );
  }

  /**
   * Retrieve backups sites for a cache
   *
   * @param cacheName
   */
  public async retrieveXSites(cacheName: string): Promise<XSite[]> {
    return this.utils
      .restCall(
        this.endpoint +
          '/caches/' +
          encodeURIComponent(cacheName) +
          '/x-site/backups/',
        'GET'
      )
      .then((response) => response.json())
      .then((data) => {
        let xsites: XSite[] = [];
        for (const [key, value] of Object.entries(data)) {
          xsites.push(<XSite>{ name: key, status: value });
        }
        return xsites;
      });
  }

  /**
   * Retrieve cache configuration
   *
   * @param cacheName
   */
  public async retrieveConfig(cacheName: string): Promise<CacheConfig> {
    return this.utils
      .restCall(
        this.endpoint +
          '/caches/' +
          encodeURIComponent(cacheName) +
          '?action=config',
        'GET'
      )
      .then((response) => response.json())
      .then(
        (data) =>
          <CacheConfig>{
            name: cacheName,
            config: JSON.stringify(data, null, 2),
          }
      );
  }

  /**
   * Search entries by query
   *
   * @param cacheName
   * @param query
   * @return SearchResult or ActionResponse
   */
  public async searchValues(
    cacheName: string,
    query: string,
    maxResults: number,
    offset: number
  ): Promise<Either<ActionResponse, SearchResut>> {
    return this.utils
      .restCall(
        this.endpoint +
          '/caches/' +
          encodeURIComponent(cacheName) +
          '?action=search' +
          '&query=' +
          query +
          '&max_results=' +
          maxResults +
          '&offset=' +
          offset * maxResults,
        'GET',
        'application/json;q=0.8'
      )
      .then((response) => {
        if (response.ok) {
          return response.json().then(
            (json) =>
              <SearchResut>{
                total: json.total_results,
                values: json.hits.map((hit) =>
                  JSON.stringify(hit.hit, null, 2)
                ),
              }
          );
        }
        throw response;
      })
      .then((data) => right(data) as Either<ActionResponse, SearchResut>)
      .catch((err) => {
        if (err instanceof TypeError) {
          return left(<ActionResponse>{
            message: 'Unable to query. ' + err.message,
            success: false,
          });
        }

        if (err instanceof Response) {
          if (err.status == 400) {
            return err.json().then((jsonError) =>
              left(<ActionResponse>{
                message: jsonError.error.message + '\n' + jsonError.error.cause,
                success: false,
              })
            );
          }

          return err
            .text()
            .then((errorMessage) =>
              left(<ActionResponse>{ message: errorMessage, success: false })
            );
        }
        return left(<ActionResponse>{
          message: 'Unable to query',
          success: false,
        });
      });
  }

  /**
   * Retrieve index stats for the cache name
   *
   * @param cacheName
   */
  public async retrieveIndexStats(
    cacheName: string
  ): Promise<Either<ActionResponse, IndexStats>> {
    return this.utils
      .restCall(
        this.endpoint +
          '/caches/' +
          encodeURIComponent(cacheName) +
          '/search/indexes/stats',
        'GET'
      )
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then((data) =>
        right(<IndexStats>{
          class_names: data.indexed_class_names,
          entities_count: this.mapToIndexValueArray(
            data.indexed_entities_count
          ),
          sizes: this.mapToIndexValueArray(data.index_sizes),
          reindexing: data.reindexing,
        })
      )
      .catch((err) => {
        if (err instanceof TypeError) {
          return left(<ActionResponse>{ message: err.message, success: false });
        }

        return err.text().then((errorMessage) => {
          if (errorMessage == '') {
            errorMessage =
              'An error happened retrieving index stats for cache ' + cacheName;
          }

          return left(<ActionResponse>{
            message: errorMessage,
            success: false,
          });
        });
      });
  }

  /**
   * Purge index for the cache name
   *
   * @param cacheName
   */
  public async purgeIndexes(cacheName: string): Promise<ActionResponse> {
    return this.utils
      .restCall(
        this.endpoint +
          '/caches/' +
          encodeURIComponent(cacheName) +
          '/search/indexes?action=clear',
        'POST'
      )
      .then((response) => {
        if (response.ok) {
          return <ActionResponse>{
            message: 'Index of cache ' + cacheName + ' purged',
            success: true,
          };
        }
        throw response;
      })
      .catch((err) => {
        let genericError =
          'An error happened when purging index for cache ' + cacheName;
        if (err instanceof TypeError) {
          return <ActionResponse>{ message: err.message, success: false };
        }

        if (err instanceof Response) {
          return err.text().then((errorMessage) => {
            if (errorMessage == '') {
              errorMessage = genericError;
            }

            return <ActionResponse>{
              message: errorMessage,
              success: false,
            };
          });
        }

        return <ActionResponse>{
          message: genericError,
          success: false,
        };
      });
  }

  /**
   * Reindex cache
   *
   * @param cacheName
   */
  public async reindex(cacheName: string): Promise<ActionResponse> {
    return this.utils
      .restCall(
        this.endpoint +
          '/caches/' +
          encodeURIComponent(cacheName) +
          '/search/indexes?action=mass-index&mode=async',
        'POST'
      )
      .then((response) => {
        if (response.ok) {
          return <ActionResponse>{
            message: 'Indexing of cache ' + cacheName + ' started',
            success: true,
          };
        }
        throw response;
      })
      .catch((err) => {
        let genericError =
          'An error happened when starting reindex operation for cache ' +
          cacheName;
        if (err instanceof TypeError) {
          return <ActionResponse>{ message: err.message, success: false };
        }

        if (err instanceof Response) {
          return err.text().then((errorMessage) => {
            if (errorMessage == '') {
              errorMessage = genericError;
            }

            return <ActionResponse>{
              message: errorMessage,
              success: false,
            };
          });
        }

        return <ActionResponse>{
          message: genericError,
          success: false,
        };
      });
  }

  private mapToIndexValueArray(data: JSON): IndexValue[] {
    return Object.keys(data).map(
      (key) => <IndexValue>{ entity: key as string, count: data[key] as number }
    );
  }

  public async retrieveQueryStats(
    cacheName: string
  ): Promise<Either<ActionResponse, QueryStats>> {
    return this.utils
      .restCall(
        this.endpoint + '/caches/' + cacheName + '/search/query/stats',
        'GET'
      )
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then((data) =>
        right(<QueryStats>{
          search_query_execution_count: data.search_query_execution_count,
          search_query_total_time: data.search_query_total_time,
          search_query_execution_max_time: data.search_query_execution_max_time,
          search_query_execution_avg_time: data.search_query_execution_avg_time,
          object_loading_total_time: data.object_loading_total_time,
          object_loading_execution_max_time:
            data.object_loading_execution_max_time,
          object_loading_execution_avg_time:
            data.object_loading_execution_avg_time,
          objects_loaded_count: data.objects_loaded_count,
          search_query_execution_max_time_query_string:
            data.search_query_execution_max_time_query_string,
        })
      )
      .catch((err) => {
        let genericError =
          'An error happened when starting reindex operation for cache ' +
          cacheName;
        if (err instanceof TypeError) {
          return left(<ActionResponse>{
            message: err.message == '' ? genericError : err.message,
            success: false,
          });
        }

        return err.text().then((errorMessage) =>
          left(<ActionResponse>{
            message: errorMessage == '' ? genericError : errorMessage,
            success: false,
          })
        );
      });
  }

  /**
   * Clears the cache query statistics
   *
   * @param cacheName
   */
  public async clearQueryStats(cacheName: string): Promise<ActionResponse> {
    return this.utils
      .restCall(
        this.endpoint +
          '/caches/' +
          encodeURIComponent(cacheName) +
          '/search/query/stats?action=clear',
        'POST'
      )
      .then((response) => {
        let message = '';
        if (response.ok) {
          message = 'Query stats of cache ' + cacheName + ' have been cleared';
        } else {
          message = 'Unable to clear query stats of cache ' + cacheName;
        }

        return <ActionResponse>{ message: message, success: response.ok };
      })
      .catch((err) => <ActionResponse>{ message: err.message, success: false });
  }

  private mapCacheType(config: JSON): string {
    let cacheType: string = 'Unknown';
    if (config.hasOwnProperty('distributed-cache')) {
      cacheType = 'Distributed';
    } else if (config.hasOwnProperty('replicated-cache')) {
      cacheType = 'Replicated';
    } else if (config.hasOwnProperty('local-cache')) {
      cacheType = 'Local';
    } else if (config.hasOwnProperty('invalidation-cache')) {
      cacheType = 'Invalidated';
    } else if (config.hasOwnProperty('scattered-cache')) {
      cacheType = 'Scattered';
    }
    return cacheType;
  }
}
