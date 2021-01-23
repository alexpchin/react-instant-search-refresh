import React, { useMemo, useCallback, useState } from "react";
import {
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  Dimensions,
} from "react-native";
import algoliasearch from "algoliasearch";
import { connectInfiniteHits, InstantSearch } from "react-instantsearch-native";

const { width } = Dimensions.get("window");

// Need to change to a project with valid permissions
const searchClient = algoliasearch(
  "latency",
  "6be0576ff61c053d5f9a3225e2a90f76"
);

// Would normally be on the back-end
// Need to change to an index with valid permissions
const photosIndex = searchClient.initIndex("photos");

const Hits = ({ hasMore, refine, hits, refreshing, onRefresh }) => {
  const _onEndReached = () => {
    if (hasMore) {
      refine();
    }
  };

  // message: "Not enough rights to delete an object near line:1 column:68"
  const _deleteObject = async (id) => {
    try {
      await photosIndex.deleteObject(id).wait();
      // Trigger refresh
      onRefresh();
    } catch (e) {
      console.log("Error deleting object", e);
    }
  };

  const _renderItem = ({ item: hit }) => (
    <Pressable onPress={() => _deleteObject(hit.objectID)} style={styles.item}>
      <Image
        style={{ height: width / 3, width: width / 3 }}
        source={{ uri: hit.image }}
      />
    </Pressable>
  );

  const _keyExtractor = useCallback((_, index) => index.toString(), []);

  return (
    <FlatList
      data={hits}
      extraData={hits}
      numColumns={3}
      renderItem={_renderItem}
      keyExtractor={_keyExtractor}
      onEndReached={_onEndReached}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
};

const ConnectedHits = connectInfiniteHits(Hits);

export const useAlgolia = () => {
  /**
   * `useMemo` prevents the searchClient from being recreated on every render.
   * - Avoids unnecessary XHR requests (see https://tinyurl.com/yyj93r2s).
   **/
  const searchClientMemo = useMemo(() => searchClient, []);
  return searchClientMemo;
};

export const useAlgoliaRefresh = (searchClient) => {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => {
    if (refreshing) return;
    // To change 'refresh' on InstantSearch
    // As per: https://www.algolia.com/doc/api-reference/widgets/instantsearch/react/#widget-param-refresh
    setRefreshing(true);
    // To manually clear cache
    if (searchClient && typeof searchClient.clearCache === "function") {
      searchClient.clearCache();
    }
    setRefreshing(false);
  }, []);
  return [refresh, { refreshing }];
};

export default function App() {
  const searchClient = useAlgolia();
  const [refresh, { refreshing }] = useAlgoliaRefresh(searchClient);
  return (
    <InstantSearch
      searchClient={searchClient}
      refresh={refreshing}
      indexName="instant_search"
    >
      <ConnectedHits onRefresh={refresh} refreshing={refreshing} />
    </InstantSearch>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
