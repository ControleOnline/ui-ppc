import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, TextInput as NativeTextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Button,
  IconButton,
  List,
  Text,
} from 'react-native-paper';
import { useStore } from '@store';
import AppearanceToggle from '@controleonline/ui-ppc/src/react/components/AppearanceToggle';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import createStyles from './QueueAddProducts.styles';

const PAGE_SIZE = 30;

const mergeProducts = (current, incoming) => {
  const productsById = new Map();

  [...(current || []), ...(incoming || [])].forEach(product => {
    if (product?.id) {
      productsById.set(String(product.id), product);
    }
  });

  return Array.from(productsById.values());
};

export default function QueueAddProducts({ route }) {
  const params = route.params || {};
  const queueId =
    Number(params.queueId || params.queue?.id || params.queue || 0) || null;
  const queueName =
    params.queueName ||
    params.queue?.queue ||
    (queueId ? `Fila #${queueId}` : 'Fila');

  const productsStore = useStore('products');
  const peopleStore = useStore('people');
  const { actions: productActions } = productsStore;
  const { currentCompany } = peopleStore.getters;
  const companyId = currentCompany?.id;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [queueProducts, setQueueProducts] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [queuePage, setQueuePage] = useState(1);
  const [availablePage, setAvailablePage] = useState(1);
  const [hasMoreQueueProducts, setHasMoreQueueProducts] = useState(false);
  const [hasMoreAvailableProducts, setHasMoreAvailableProducts] =
    useState(false);
  const [loadingQueueProducts, setLoadingQueueProducts] = useState(false);
  const [loadingAvailableProducts, setLoadingAvailableProducts] =
    useState(false);
  const [savingProductId, setSavingProductId] = useState(null);
  const [error, setError] = useState('');
  const queueRequestRef = useRef(0);
  const availableRequestRef = useRef(0);
  const savingProductRef = useRef(null);
  const { ppcColors, isDark, toggleAppearanceMode } = usePpcTheme();
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
  const inputColors = isDark
    ? {
        text: '#F8FAFC',
        secondary: '#CBD5E1',
        border: '#334155',
        accent: '#0EA5E9',
      }
    : {
        text: '#0F172A',
        secondary: '#3F5168',
        border: '#8BA4BC',
        accent: '#0284C7',
      };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const loadQueueProducts = useCallback(
    async (page = 1) => {
      if (!companyId || !queueId) return;

      const requestId = ++queueRequestRef.current;
      setLoadingQueueProducts(true);
      setError('');

      try {
        const response = await productActions.getItems({
          active: 1,
          company: companyId,
          queue: `/queues/${queueId}`,
          'order[product]': 'ASC',
          itemsPerPage: PAGE_SIZE,
          page,
        });
        if (requestId !== queueRequestRef.current) return;

        const products = Array.isArray(response) ? response : [];
        setQueueProducts(current =>
          page === 1 ? products : mergeProducts(current, products),
        );
        setQueuePage(page);
        setHasMoreQueueProducts(products.length === PAGE_SIZE);
      } catch {
        if (requestId === queueRequestRef.current) {
          setError(
            'Nao foi possivel carregar os produtos vinculados a esta fila.',
          );
        }
      } finally {
        if (requestId === queueRequestRef.current) {
          setLoadingQueueProducts(false);
        }
      }
    },
    [companyId, productActions, queueId],
  );

  const loadAvailableProducts = useCallback(
    async (page = 1, query = debouncedSearch) => {
      if (!companyId || !queueId) return;

      const requestId = ++availableRequestRef.current;
      setLoadingAvailableProducts(true);
      setError('');

      try {
        const request = {
          active: 1,
          company: companyId,
          'exists[queue]': false,
          'order[product]': 'ASC',
          itemsPerPage: PAGE_SIZE,
          page,
        };

        if (query) {
          request.product = query;
        }

        const response = await productActions.getItems(request);
        if (requestId !== availableRequestRef.current) return;

        const products = Array.isArray(response) ? response : [];
        setAvailableProducts(current =>
          page === 1 ? products : mergeProducts(current, products),
        );
        setAvailablePage(page);
        setHasMoreAvailableProducts(products.length === PAGE_SIZE);
      } catch {
        if (requestId === availableRequestRef.current) {
          setError('Nao foi possivel carregar os produtos disponiveis.');
        }
      } finally {
        if (requestId === availableRequestRef.current) {
          setLoadingAvailableProducts(false);
        }
      }
    },
    [companyId, debouncedSearch, productActions, queueId],
  );

  useFocusEffect(
    useCallback(() => {
      if (companyId && queueId) {
        loadQueueProducts(1);
      }
    }, [companyId, loadQueueProducts, queueId]),
  );

  useEffect(() => {
    setAvailableProducts([]);
    setAvailablePage(1);
    setHasMoreAvailableProducts(false);

    if (companyId && queueId) {
      loadAvailableProducts(1, debouncedSearch);
    }
  }, [companyId, debouncedSearch, loadAvailableProducts, queueId]);

  const updateQueue = useCallback(
    async (product, queue) => {
      if (!product?.id || savingProductRef.current) return;

      savingProductRef.current = product.id;
      setSavingProductId(product.id);
      setError('');

      try {
        const saved = await productActions.save({
          id: product.id,
          queue,
        });
        const updatedProduct = {
          ...product,
          ...(saved || {}),
          queue: queue
            ? { id: queueId, '@id': queue, queue: queueName }
            : null,
        };

        if (queue) {
          setAvailableProducts(current =>
            current.filter(item => String(item.id) !== String(product.id)),
          );
          setQueueProducts(current => mergeProducts(current, [updatedProduct]));
        } else {
          setQueueProducts(current =>
            current.filter(item => String(item.id) !== String(product.id)),
          );
          setAvailableProducts(current =>
            mergeProducts(current, [updatedProduct]),
          );
        }
      } catch {
        setError(
          queue
            ? 'Nao foi possivel adicionar o produto a fila.'
            : 'Nao foi possivel remover o produto da fila.',
        );
      } finally {
        savingProductRef.current = null;
        setSavingProductId(null);
      }
    },
    [productActions, queueId, queueName],
  );

  const availableEmpty = loadingAvailableProducts
    ? <ActivityIndicator color={ppcColors.accent} />
    : <Text style={styles.emptyText}>Nenhum produto disponivel.</Text>;

  const queueEmpty = loadingQueueProducts
    ? <ActivityIndicator color={ppcColors.accent} />
    : (
      <Text style={styles.emptyText}>
        Nenhum produto vinculado a esta fila.
      </Text>
    );

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text variant="headlineSmall" style={styles.title}>
          {queueName}
        </Text>
        <AppearanceToggle
          isDark={isDark}
          onToggle={toggleAppearanceMode}
          ppcColors={ppcColors}
          compact
        />
      </View>

      {!queueId && (
        <Text style={styles.errorText}>
          Fila invalida. Volte e selecione a fila novamente.
        </Text>
      )}

      <NativeTextInput
        accessibilityLabel="Pesquisar produto disponivel"
        placeholder="Pesquisar produto disponivel"
        placeholderTextColor={inputColors.secondary}
        value={search}
        onChangeText={setSearch}
        style={[
          styles.input,
          {
            color: inputColors.text,
            borderColor: inputColors.border,
            backgroundColor: isDark ? '#0D141D' : '#FFFFFF',
          },
        ]}
        selectionColor={inputColors.accent}
        editable={!!queueId}
      />

      {!!queueId && (
        <>
          <Text variant="titleMedium" style={styles.section}>
            Produtos disponiveis
          </Text>
          <FlatList
            data={availableProducts}
            keyExtractor={item => String(item.id)}
            style={styles.searchList}
            contentContainerStyle={
              availableProducts.length === 0
                ? styles.emptyListContent
                : null
            }
            ListEmptyComponent={availableEmpty}
            ListFooterComponent={
              hasMoreAvailableProducts ? (
                <Button
                  mode="text"
                  loading={loadingAvailableProducts}
                  disabled={loadingAvailableProducts}
                  onPress={() =>
                    loadAvailableProducts(
                      availablePage + 1,
                      debouncedSearch,
                    )
                  }
                >
                  Carregar mais
                </Button>
              ) : null
            }
            renderItem={({ item }) => (
              <List.Item
                title={item.product}
                titleStyle={styles.listItemTitle}
                style={styles.searchListItem}
                disabled={!!savingProductId}
                right={() =>
                  savingProductId === item.id ? (
                    <ActivityIndicator color={ppcColors.accent} />
                  ) : (
                    <IconButton
                      icon="plus"
                      disabled={!!savingProductId}
                      onPress={() =>
                        updateQueue(item, `/queues/${queueId}`)
                      }
                      iconColor={ppcColors.accent}
                    />
                  )
                }
              />
            )}
          />
        </>
      )}

      <Text variant="titleMedium" style={styles.section}>
        Produtos na fila
      </Text>

      {!!queueId && (
        <FlatList
          data={queueProducts}
          keyExtractor={item => String(item.id)}
          style={styles.queueList}
          contentContainerStyle={
            queueProducts.length === 0 ? styles.emptyListContent : null
          }
          ListEmptyComponent={queueEmpty}
          ListFooterComponent={
            hasMoreQueueProducts ? (
              <Button
                mode="text"
                loading={loadingQueueProducts}
                disabled={loadingQueueProducts}
                onPress={() => loadQueueProducts(queuePage + 1)}
              >
                Carregar mais
              </Button>
            ) : null
          }
          renderItem={({ item }) => (
            <List.Item
              title={item.product}
              titleStyle={styles.listItemTitle}
              style={styles.queueListItem}
              right={() => (
                <IconButton
                  icon="close"
                  loading={savingProductId === item.id}
                  disabled={!!savingProductId}
                  onPress={() => updateQueue(item, null)}
                  iconColor={ppcColors.dangerText}
                  containerColor={ppcColors.dangerBg}
                />
              )}
            />
          )}
        />
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}
