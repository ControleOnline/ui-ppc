// DisplayCard.js
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View, TextInput, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Text as PaperText, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import QueuesList from './QueuesList';
import { useStore } from '@store';
import { env } from '@env';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import { withOpacity } from '@controleonline/../../src/styles/branding';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';

const iconByType = {
  products: 'silverware-fork-knife',
  orders: 'receipt-text',
};

const typeAccentByType = {
  products: '#FACC15',
  orders: '#38BDF8',
};

const getTitleStyleByName = (name) => {
  const size = String(name || '').trim().length;
  if (size > 18) return { fontSize: 24, lineHeight: 28 };
  if (size > 12) return { fontSize: 28, lineHeight: 32 };
  return { fontSize: 30, lineHeight: 34 };
};

const normalizeDisplayQueues = (value) => {
  const rows = Array.isArray(value) ? value : [];

  return rows
    .map((row) => {
      if (!row) return null;
      if (row.queue && (row.queue.id || row.queue['@id'])) return row;
      if (row.id || row['@id']) return { id: row.id || row['@id'], queue: row };
      return null;
    })
    .filter((row) => !!row?.queue);
};

const parseEntityId = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    const iriMatch = trimmed.match(/\/(\d+)(?:\/)?$/);
    if (iriMatch?.[1]) return Number(iriMatch[1]);
    return null;
  }
  if (typeof value.id === 'number') return value.id;
  if (typeof value.id === 'string') return parseEntityId(value.id);
  if (value.id && typeof value.id === 'object') return parseEntityId(value.id);
  if (value['@id']) return parseEntityId(String(value['@id']));
  return null;
};

const extractDisplayId = parseEntityId;

const LOCAL_LINKS_KEY = 'ppc_display_queue_links_v1';

const readLocalLinks = () => {
  try {
    const raw = globalThis?.localStorage?.getItem(LOCAL_LINKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const writeLocalLinks = (links) => {
  try {
    globalThis?.localStorage?.setItem(LOCAL_LINKS_KEY, JSON.stringify(links || {}));
  } catch (e) {
    // noop
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function DisplayCard({
  item,
  prefetchedDisplayQueues = [],
  onPress,
  onLinked,
  ppcColorsOverride = null,
}) {
  const navigation = useNavigation();
  const displaysStore = useStore('displays');
  const queuesStore = useStore('queues');
  const displayQueuesStore = useStore('display_queues');
  const statusStore = useStore('status');
  const peopleStore = useStore('people');
  const messageApi = useMessage();
  const { actions } = displaysStore;
  const displaysItems = displaysStore.items || [];
  const { currentCompany } = peopleStore.getters;
  const { ppcColors: defaultPpcColors, isDark: defaultIsDark } = usePpcTheme();
  const ppcColors = ppcColorsOverride || defaultPpcColors;
  const isDark =
    typeof ppcColorsOverride?.isDark === 'boolean'
      ? ppcColorsOverride.isDark
      : defaultIsDark;
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

  const [queues, setQueues] = useState(
    normalizeDisplayQueues(item.displayQueue || item.display_queue || item.displayQueues)
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editDisplay, setEditDisplay] = useState(item.display);
  const [editType, setEditType] = useState(item.displayType);

  const [linkingQueue, setLinkingQueue] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [queueOptions, setQueueOptions] = useState([]);
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [newQueueName, setNewQueueName] = useState('');
  const [linkError, setLinkError] = useState('');
  const [creatingQueue, setCreatingQueue] = useState(false);
  const [unlinkingQueue, setUnlinkingQueue] = useState(false);
  const [deletingDisplay, setDeletingDisplay] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [confirmUnlinkVisible, setConfirmUnlinkVisible] = useState(false);

  const getId = (value) => {
    return extractDisplayId(value);
  };

  const getApiErrorMessage = (err, fallback) => {
    const apiMessage =
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.response?.data?.title;
    return apiMessage || err?.message || fallback;
  };

  const getQueueIdentity = (queue) => {
    const id = parseEntityId(queue?.id) || parseEntityId(queue?.['@id']) || parseEntityId(queue);
    const iri = queue?.['@id'] || null;
    return {
      id: id || null,
      iri,
    };
  };

  const mergeQueueOptions = useCallback((...lists) => {
    const merged = lists.flat().filter(Boolean);
    const seen = new Set();

    return merged.filter((queue) => {
      const identity = getQueueIdentity(queue);
      const key = String(identity.id || identity.iri || '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const loadLinkedQueues = useCallback(
    async (displayId) => {
      if (!displayId) return [];
      const linked = await displayQueuesStore.actions.getItems({
        display: `/displays/${displayId}`,
        itemsPerPage: 1000,
        pagination: false,
      });
      return normalizeDisplayQueues(linked);
    },
    [displayQueuesStore.actions]
  );

  const shapeQueuesForCard = useCallback(
    (rows) => {
      const normalized = normalizeDisplayQueues(rows);
      if (item.displayType === 'products') return normalized.slice(0, 1);
      return normalized;
    },
    [item.displayType]
  );

  useEffect(() => {
    let cancelled = false;
    const displayId = getId(item);

    const hydrateQueues = async () => {
      const prefetched = normalizeDisplayQueues(prefetchedDisplayQueues);
      if (prefetched.length > 0) {
        if (!cancelled) setQueues(shapeQueuesForCard(prefetched));
        return;
      }

      const queuesFromItem = normalizeDisplayQueues(
        item.displayQueue || item.display_queue || item.displayQueues
      );
      if (queuesFromItem.length > 0) {
        const onlyCurrentDisplay = queuesFromItem.filter((row) => {
          const rowDisplayId = extractDisplayId(row.display);
          if (!rowDisplayId) return true;
          return rowDisplayId === Number(displayId);
        });
        if (!cancelled) setQueues(shapeQueuesForCard(onlyCurrentDisplay));
        return;
      }
      if (!displayId) {
        if (!cancelled) setQueues([]);
        return;
      }

      const links = readLocalLinks();
      const localQueue = links[String(displayId)];
      if (!cancelled && localQueue?.id) {
        setQueues([
          {
            id: `local-${displayId}-${localQueue.id}`,
            display: item,
            queue: localQueue,
          },
        ]);
      } else if (!cancelled) {
        setQueues([]);
      }
    };

    hydrateQueues();
    return () => {
      cancelled = true;
    };
  }, [item.id, item.displayQueue, item.display_queue, item.displayQueues, prefetchedDisplayQueues, shapeQueuesForCard]);

  const handleQueueUpdate = useCallback(
    (updatedQueue) => {
      setQueues((prev) =>
        prev.map((dq) =>
          dq.queue.id === updatedQueue.id ? { ...dq, queue: { ...dq.queue, ...updatedQueue } } : dq
        )
      );
    },
    []
  );

  const showErrorToast = useCallback(
    (message) => {
      if (typeof messageApi?.showError === 'function') {
        messageApi.showError(message);
        return;
      }
      if (typeof messageApi?.showToast === 'function') {
        messageApi.showToast(message, { position: 'top', offsetTop: 86 });
      }
    },
    [messageApi],
  );

  const showSuccessToast = useCallback(
    (message) => {
      if (typeof messageApi?.showSuccess === 'function') {
        messageApi.showSuccess(message);
        return;
      }
      if (typeof messageApi?.showToast === 'function') {
        messageApi.showToast(message, { position: 'top', offsetTop: 86 });
      }
    },
    [messageApi],
  );

  const saveDisplay = useCallback(async () => {
    try {
      await actions.save({ id: item.id, display: editDisplay, displayType: editType });
      setModalVisible(false);
      showSuccessToast('Display atualizado com sucesso.');
    } catch (err) {
      showErrorToast(getApiErrorMessage(err, 'Nao foi possivel salvar o display.'));
    }
  }, [actions, editDisplay, editType, item.id, showErrorToast, showSuccessToast]);

  const deleteDisplay = useCallback(async () => {
    const displayId = getId(item);
    if (!displayId) return;

    setDeletingDisplay(true);
    try {
      await actions.remove(displayId);

      const links = readLocalLinks();
      delete links[String(displayId)];
      writeLocalLinks(links);

      setModalVisible(false);
      setConfirmDeleteVisible(false);
      if (onLinked) onLinked();
      showSuccessToast('Display excluido com sucesso.');
    } catch (err) {
      showErrorToast(getApiErrorMessage(err, 'Nao foi possivel excluir o display.'));
    } finally {
      setDeletingDisplay(false);
    }
  }, [actions, item, onLinked, showErrorToast, showSuccessToast]);

  const confirmDeleteDisplay = useCallback(() => {
    if (deletingDisplay) return;
    setConfirmDeleteVisible(true);
  }, [deletingDisplay]);

  const openLinkQueueModal = useCallback(async () => {
    if (!currentCompany?.id) {
      setLinkError('Empresa nao encontrada para vincular a fila.');
      showErrorToast('Empresa nao encontrada para vincular a fila.');
      return;
    }

    setLinkError('');
    setLinkingQueue(true);
    try {
      const companyIri = `/people/${currentCompany.id}`;
      let resultByIri = await queuesStore.actions.getItems({
        company: companyIri,
        itemsPerPage: 1000,
        pagination: false,
      });
      let optionsByIri = Array.isArray(resultByIri) ? resultByIri : [];

      // Fallback for APIs that still filter by numeric id.
      let resultById = await queuesStore.actions.getItems({
        company: currentCompany.id,
        itemsPerPage: 1000,
        pagination: false,
      });
      let optionsById = Array.isArray(resultById) ? resultById : [];

      // Keep previous behavior as last fallback: load all queues.
      let resultAll = await queuesStore.actions.getItems({
        itemsPerPage: 1000,
        pagination: false,
      });
      let optionsAll = Array.isArray(resultAll) ? resultAll : [];

      // If queue includes company relation, filter all by current company.
      optionsAll = optionsAll.filter((queue) => {
        const company = queue?.company;
        if (!company) return true;
        const companyId =
          parseEntityId(company?.id) ||
          parseEntityId(company?.['@id']) ||
          parseEntityId(company);
        return !companyId || companyId === Number(currentCompany.id);
      });

      let options = mergeQueueOptions(optionsByIri, optionsById, optionsAll);

      // Keep queues already shown in the current list visible in selector.
      const queuesFromVisibleCards = (Array.isArray(displaysItems) ? displaysItems : [])
        .flatMap((displayRow) =>
          normalizeDisplayQueues(
            displayRow?.displayQueue || displayRow?.display_queue || displayRow?.displayQueues
          ).map((row) => row?.queue)
        );
      const queuesFromLocalLinks = Object.values(readLocalLinks() || {});

      // Keep already linked queues visible in selector even when API filtering is inconsistent.
      options = mergeQueueOptions(
        options,
        queuesFromVisibleCards,
        queuesFromLocalLinks,
        queues.map((row) => row?.queue)
      );
      setQueueOptions(options);
      const firstIdentity = getQueueIdentity(options?.[0]);
      const firstId = firstIdentity.id || firstIdentity.iri;
      setSelectedQueueId(firstId ? String(firstId) : '');
      setNewQueueName('');
      setLinkModalVisible(true);
    } catch (err) {
      setLinkError(getApiErrorMessage(err, 'Nao foi possivel carregar as filas.'));
      showErrorToast(getApiErrorMessage(err, 'Nao foi possivel carregar as filas.'));
    } finally {
      setLinkingQueue(false);
    }
  }, [
    currentCompany?.id,
    displaysItems,
    getQueueIdentity,
    mergeQueueOptions,
    queues,
    queuesStore.actions,
    showErrorToast,
  ]);

  const linkQueueToDisplay = useCallback(
    async (selectedQueue) => {
      const displayId = getId(item);
      if (!displayId || !selectedQueue) return;

      if (item.displayType === 'products' && queues.length > 0) {
        const existingQueue = queues[0]?.queue;
        setLinkModalVisible(false);
        navigation.navigate('QueueAddProducts', {
          queueId: existingQueue?.id,
          queueName: existingQueue?.queue,
        });
        return;
      }

      const selectedQueueIdValue = selectedQueue.id || getId(selectedQueue) || selectedQueue?.['@id'];
      if (!selectedQueueIdValue) {
        throw new Error('Fila selecionada invalida.');
      }

      const displayRef = item?.['@id'] || `/displays/${displayId}`;
      const queueRef =
        selectedQueue?.['@id'] ||
        (String(selectedQueueIdValue).startsWith('/queues/')
          ? String(selectedQueueIdValue)
          : `/queues/${selectedQueueIdValue}`);

      const savedLink = await displayQueuesStore.actions.save({
        display: displayRef,
        queue: queueRef,
      });

      const savedAsQueueRow = normalizeDisplayQueues([savedLink]);
      if (savedAsQueueRow.length > 0) {
        setQueues(shapeQueuesForCard(savedAsQueueRow));
      } else {
        const linked = await loadLinkedQueues(displayId);
        if (linked.length > 0) {
          setQueues(shapeQueuesForCard(linked));
        } else {
          setQueues(shapeQueuesForCard([
            {
              id: `local-${displayId}-${selectedQueueIdValue}`,
              display: item,
              queue: selectedQueue,
            },
          ]));
        }
      }

      const links = readLocalLinks();
      links[String(displayId)] = selectedQueue;
      writeLocalLinks(links);
      if (onLinked) onLinked();
      setLinkModalVisible(false);
      showSuccessToast('Fila vinculada com sucesso.');
      navigation.navigate('QueueAddProducts', {
        queueId: selectedQueue?.id || getId(selectedQueue),
        queueName: selectedQueue?.queue,
      });
    },
    [
      displayQueuesStore.actions,
      item,
      loadLinkedQueues,
      navigation,
      onLinked,
      queues,
      shapeQueuesForCard,
      showSuccessToast,
    ]
  );

  const bindSelectedQueue = useCallback(async () => {
    if (!selectedQueueId) {
      setLinkError('Selecione uma estacao.');
      return;
    }

    const selectedQueue = queueOptions.find(
      (queue) => String(queue.id || getId(queue) || queue?.['@id']) === String(selectedQueueId)
    );
    if (!selectedQueue) {
      setLinkError('Fila selecionada nao encontrada.');
      return;
    }

    setLinkError('');
    setLinkingQueue(true);
    try {
      await linkQueueToDisplay(selectedQueue);
    } catch (err) {
      setLinkError(getApiErrorMessage(err, 'Nao foi possivel vincular a fila.'));
    } finally {
      setLinkingQueue(false);
    }
  }, [linkQueueToDisplay, queueOptions, selectedQueueId]);

  const createQueueAndBind = useCallback(async () => {
    if (!currentCompany?.id) {
      setLinkError('Empresa nao encontrada para criar a fila.');
      return;
    }
    if (!newQueueName?.trim()) {
      setLinkError('Informe um nome para a nova fila.');
      return;
    }

    setLinkError('');
    setCreatingQueue(true);
    try {
      let statuses = [];
      try {
        statuses = await statusStore.actions.getItems({ context: 'display' });
      } catch (e) {
        statuses = [];
      }

      const statusByReal = (key) =>
        statuses.find((status) =>
          String(status?.realStatus || '')
            .toLowerCase()
            .includes(key)
        );

      const statusIn = statusByReal('in') || statuses[0];
      const statusWorking = statusByReal('working') || statuses[1] || statuses[0];
      const statusOut = statusByReal('out') || statuses[2] || statuses[1] || statuses[0];

      const queuePayload = {
        queue: newQueueName.trim(),
        company: '/people/' + currentCompany.id,
      };
      if (statusIn?.['@id']) queuePayload.status_in = statusIn['@id'];
      if (statusWorking?.['@id']) queuePayload.status_working = statusWorking['@id'];
      if (statusOut?.['@id']) queuePayload.status_out = statusOut['@id'];

      const createdQueue = await queuesStore.actions.save(queuePayload);
      const createdQueueName = String(newQueueName || '').trim().toLowerCase();
      const createdIdentity = getQueueIdentity(createdQueue);
      let createdQueueId = createdIdentity.id || getQueueIdentity(createdQueue?.queue).id;
      let createdQueueIri = createdIdentity.iri || createdQueue?.queue?.['@id'] || null;

      // Some API responses don't return id/@id directly after POST.
      // Fallback: reload queues and match by name/company with retry.
      if (!createdQueueId) {
        for (let attempt = 0; attempt < 3 && !createdQueueId; attempt += 1) {
          let refreshed = await queuesStore.actions.getItems({ company: currentCompany.id });
          if (!Array.isArray(refreshed) || refreshed.length === 0) {
            refreshed = await queuesStore.actions.getItems({});
          }

          const exact = (Array.isArray(refreshed) ? refreshed : []).filter((row) => {
            return String(row?.queue || '').trim().toLowerCase() === createdQueueName;
          });

          const fallbackRow = exact.sort((a, b) => {
            const ai = Number(getId(a)) || 0;
            const bi = Number(getId(b)) || 0;
            return bi - ai;
          })[0];

          const identity = getQueueIdentity(fallbackRow);
          createdQueueId = identity.id;
          createdQueueIri = createdQueueIri || identity.iri;

          if (!createdQueueId) {
            await sleep(300);
          }
        }
      }

      if (!createdQueueId) {
        throw new Error('Nao foi possivel identificar a fila criada.');
      }

      const queueEntity = {
        ...createdQueue,
        id: createdQueueId,
        ...(createdQueueIri ? { '@id': createdQueueIri } : {}),
        queue: createdQueue?.queue || newQueueName.trim(),
      };

      setQueueOptions((prev) => {
        const merged = [queueEntity, ...(prev || [])];
        const seen = new Set();
        return merged.filter((row) => {
          const rowId = String(row?.id || getId(row) || row?.['@id'] || '');
          if (!rowId || seen.has(rowId)) return false;
          seen.add(rowId);
          return true;
        });
      });

      setSelectedQueueId(String(createdQueueId));
      setNewQueueName('');

      setLinkingQueue(true);
      await linkQueueToDisplay(queueEntity);
    } catch (err) {
      setLinkError(getApiErrorMessage(err, 'Nao foi possivel criar e vincular a fila.'));
    } finally {
      setCreatingQueue(false);
      setLinkingQueue(false);
    }
  }, [currentCompany?.id, linkQueueToDisplay, newQueueName, queuesStore.actions, statusStore.actions]);

  const unlinkQueue = useCallback(async () => {
    if (!queues?.length) return;
    const displayId = getId(item);
    if (!displayId) return;

    setLinkError('');
    setUnlinkingQueue(true);
    try {
      const firstLink = queues[0];
      let linkId = getId(firstLink);

      // If local state row doesn't carry link id, reload links and pick first.
      if (!linkId) {
        const linked = await loadLinkedQueues(displayId);
        linkId = getId(linked?.[0]);
      }

      if (!linkId) {
        setQueues([]);
        const links = readLocalLinks();
        delete links[String(displayId)];
        writeLocalLinks(links);
        if (onLinked) onLinked();
        return;
      }

      await displayQueuesStore.actions.remove(linkId);
      setQueues([]);

      const links = readLocalLinks();
      delete links[String(displayId)];
      writeLocalLinks(links);
      if (onLinked) onLinked();
      setConfirmUnlinkVisible(false);
      showSuccessToast('Fila desvinculada com sucesso.');
    } catch (err) {
      // If API already removed the link, treat as successful unlink.
      if (Number(err?.status || err?.code) === 404) {
        setQueues([]);
        const links = readLocalLinks();
        delete links[String(displayId)];
        writeLocalLinks(links);
        if (onLinked) onLinked();
        setConfirmUnlinkVisible(false);
        showSuccessToast('Fila desvinculada com sucesso.');
      } else {
        setLinkError(getApiErrorMessage(err, 'Nao foi possivel desvincular a fila.'));
        showErrorToast(getApiErrorMessage(err, 'Nao foi possivel desvincular a fila.'));
      }
    } finally {
      setUnlinkingQueue(false);
    }
  }, [
    displayQueuesStore.actions,
    item,
    loadLinkedQueues,
    onLinked,
    queues,
    showErrorToast,
    showSuccessToast,
  ]);

  const accent =
    (item.displayType === 'orders' ? ppcColors.accentInfo : ppcColors.accent) ||
    typeAccentByType[item.displayType] ||
    '#FACC15';
  const accentSoft = isDark ? withOpacity(accent, 0.75) : withOpacity(accent, 0.54);
  const titleSizing = getTitleStyleByName(item.display);
  const canManageQueue = env.APP_TYPE === 'MANAGER' && item.displayType === 'products';
  const hasLinkedQueue = Array.isArray(queues) && queues.length > 0;

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
      >
        <Card style={styles.displayCard}>
          <View style={[styles.typeAccent, { backgroundColor: accentSoft }]} />
          <View style={styles.cardGlow} />
          <Card.Content style={styles.cardContent}>
            <View style={styles.headerRow}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons
                  name={iconByType[item.displayType] || 'monitor'}
                  size={22}
                  color={accent}
                />
              </View>
              <View style={styles.titleRow}>
                <PaperText style={[styles.displayTitle, titleSizing]}>{item.display}</PaperText>
                {env.APP_TYPE === 'MANAGER' && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={(event) => {
                        event?.stopPropagation?.();
                        setModalVisible(true);
                      }}
                      style={styles.editIcon}
                    >
                      <MaterialCommunityIcons
                        name="pencil"
                        size={13}
                        color={ppcColors.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.queuesWrap}>
              <QueuesList
                queues={queues}
                onQueueUpdate={handleQueueUpdate}
                ppcColorsOverride={ppcColorsOverride}
              />
            </View>
            <View style={styles.footerRow}>
              <View style={styles.typePill}>
                <PaperText style={[styles.displayType, { color: accent }]}>
                  {String(item.displayType || '').toUpperCase()}
                </PaperText>
              </View>

              {canManageQueue && (
                <Pressable
                  style={[
                    hasLinkedQueue ? styles.unlinkQueueButton : styles.linkQueueButton,
                    (linkingQueue || unlinkingQueue) && styles.linkQueueButtonDisabled,
                  ]}
                  onPress={(event) => {
                    event?.stopPropagation?.();
                    if (hasLinkedQueue) {
                      setConfirmUnlinkVisible(true);
                    } else {
                      openLinkQueueModal();
                    }
                  }}
                  disabled={linkingQueue || unlinkingQueue}
                >
                  <MaterialCommunityIcons
                    name={hasLinkedQueue ? 'link-off' : 'plus'}
                    size={12}
                    color={hasLinkedQueue ? ppcColors.dangerText : ppcColors.accent}
                    style={styles.footerActionIcon}
                  />
                  <Text
                    style={[
                      hasLinkedQueue ? styles.unlinkQueueButtonText : styles.linkQueueButtonText,
                    ]}
                  >
                    {hasLinkedQueue
                      ? unlinkingQueue
                        ? global.t?.t('products','label','unlinkingQueue')
                        : global.t?.t('products','label','unlinkQueue')
                      : linkingQueue
                        ? global.t?.t('products','label','loading')
                        : global.t?.t('products','label','linkingQueue')}
                  </Text>
                </Pressable>
              )}
              {!canManageQueue && <View style={styles.footerSpacer} />}
            </View>
            <View style={styles.feedbackWrap}>
              {!!linkError && (
                <Text style={styles.linkQueueErrorText}>
                  {linkError}
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>
      </Pressable>

      <AnimatedModal
        visible={linkModalVisible}
        onRequestClose={() => setLinkModalVisible(false)}
        style={{ justifyContent: 'flex-end' }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{global.t?.t('products','label','linkQueue')}</Text>
            <TouchableOpacity
              onPress={() => setLinkModalVisible(false)}
              style={styles.headerCloseButton}
            >
              <MaterialCommunityIcons name="close" size={18} color={ppcColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.linkModalList}
            contentContainerStyle={styles.linkModalListContent}
            showsVerticalScrollIndicator
          >
            <Text style={styles.modalLabel}>Escolha uma fila existente</Text>
            {queueOptions.length > 0 ? (
              <RadioButton.Group
                onValueChange={(value) => setSelectedQueueId(String(value))}
                value={selectedQueueId}
              >
                {queueOptions.map((queue) => {
                  const queueKey = queue.id || getId(queue) || queue?.['@id'];
                  const queueValue = String(queue.id || getId(queue) || queue?.['@id']);
                  return (
                    <View
                      key={queueKey}
                      style={[
                        styles.linkModalItemWrap,
                        String(selectedQueueId) === queueValue && styles.linkModalItemWrapSelected,
                      ]}
                    >
                      <RadioButton.Item
                        label={queue.queue || `Fila #${queueValue}`}
                        value={queueValue}
                        color={ppcColors.accent}
                        uncheckedColor={ppcColors.borderSoft}
                        labelStyle={styles.linkModalRadioLabel}
                        style={styles.linkModalRadioItem}
                      />
                    </View>
                  );
                })}
              </RadioButton.Group>
            ) : (
              <Text style={styles.linkModalHintText}>
                {linkingQueue ? 'Carregando filas...' : 'Nenhuma fila disponivel nesta empresa.'}
              </Text>
            )}

            <View style={styles.createQueueDivider} />
            <Text style={styles.modalLabel}>Ou crie uma nova fila</Text>
            <TextInput
              style={styles.modalInput}
              value={newQueueName}
              onChangeText={setNewQueueName}
              placeholder="Nome da nova fila"
              placeholderTextColor={ppcColors.textSecondary}
            />
            <TouchableOpacity
              style={[styles.outlineButton, (creatingQueue || linkingQueue) && styles.buttonDisabled]}
              onPress={createQueueAndBind}
              disabled={creatingQueue || linkingQueue}
            >
              <Text style={styles.outlineButtonText}>
                {creatingQueue ? global.t?.t('products','label','creatingQueue') : global.t?.t('products','label','createAndLink')}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setLinkModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>{global.t?.t('products','button','cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!queueOptions.length || !selectedQueueId || linkingQueue || creatingQueue || unlinkingQueue) && styles.buttonDisabled,
              ]}
              onPress={bindSelectedQueue}
              disabled={!queueOptions.length || !selectedQueueId || linkingQueue || creatingQueue || unlinkingQueue}
            >
              <Text style={styles.saveButtonText}>
                {linkingQueue ? global.t?.t('products','label','linkingQueue') : global.t?.t('products','label','linkQueue')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>

      {env.APP_TYPE === 'MANAGER' && (
        <AnimatedModal
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
          style={{ justifyContent: 'flex-end' }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{global.t?.t('products','label','editingDisplay')}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.headerCloseButton}
              >
                <MaterialCommunityIcons name="close" size={18} color={ppcColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>{global.t?.t('products','label','displayName')}</Text>
              <TextInput
                style={styles.modalInput}
                value={editDisplay}
                onChangeText={setEditDisplay}
                placeholder={global.t?.t('products','placeholder','displayName')}
                placeholderTextColor={ppcColors.textSecondary}
              />

              <Text style={styles.modalLabel}>{global.t?.t('products','label','displayType')}</Text>
              <RadioButton.Group onValueChange={setEditType} value={editType}>
                <View
                  style={[
                    styles.radioItemWrap,
                    editType === 'orders' && styles.radioItemWrapSelected,
                  ]}
                >
                  <RadioButton.Item
                    label="Orders"
                    value="orders"
                    color={ppcColors.accentInfo}
                    uncheckedColor={ppcColors.borderSoft}
                    labelStyle={styles.radioLabel}
                    style={styles.radioItem}
                  />
                </View>
                <View
                  style={[
                    styles.radioItemWrap,
                    editType === 'products' && styles.radioItemWrapSelected,
                  ]}
                >
                  <RadioButton.Item
                    label="Products"
                    value="products"
                    color={ppcColors.accent}
                    uncheckedColor={ppcColors.borderSoft}
                    labelStyle={styles.radioLabel}
                    style={styles.radioItem}
                  />
                </View>
              </RadioButton.Group>

              <TouchableOpacity
                style={[styles.dangerOutlineButton, deletingDisplay && styles.buttonDisabled]}
                onPress={confirmDeleteDisplay}
                disabled={deletingDisplay}
              >
                <Text style={styles.dangerOutlineButtonText}>
                  {deletingDisplay ? 'Excluindo...' : 'Excluir display'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveDisplay}>
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedModal>
      )}

      <AnimatedModal
        visible={confirmDeleteVisible}
        onRequestClose={() => setConfirmDeleteVisible(false)}
        style={{ justifyContent: 'flex-end' }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Excluir display</Text>
            <TouchableOpacity
              onPress={() => setConfirmDeleteVisible(false)}
              style={styles.headerCloseButton}
              disabled={deletingDisplay}
            >
              <MaterialCommunityIcons name="close" size={18} color={ppcColors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.confirmModalMessage}>
            Deseja excluir o display "{item.display}"?
          </Text>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, deletingDisplay && styles.buttonDisabled]}
              onPress={() => setConfirmDeleteVisible(false)}
              disabled={deletingDisplay}
            >
              <Text style={styles.cancelButtonText}>{global.t?.t('products','button','cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dangerButton, deletingDisplay && styles.buttonDisabled]}
              onPress={deleteDisplay}
              disabled={deletingDisplay}
            >
              <Text style={styles.dangerButtonText}>
                {deletingDisplay ? global.t?.t('products','button','deleting') : global.t?.t('products','button','delete')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>

      <AnimatedModal
        visible={confirmUnlinkVisible}
        onRequestClose={() => setConfirmUnlinkVisible(false)}
        style={{ justifyContent: 'flex-end' }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Desvincular fila</Text>
            <TouchableOpacity
              onPress={() => setConfirmUnlinkVisible(false)}
              style={styles.headerCloseButton}
              disabled={unlinkingQueue}
            >
              <MaterialCommunityIcons name="close" size={18} color={ppcColors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.confirmModalMessage}>
            {global.t?.t('products','message','confirmUnlinkQueue')}
          </Text>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, unlinkingQueue && styles.buttonDisabled]}
              onPress={() => setConfirmUnlinkVisible(false)}
              disabled={unlinkingQueue}
            >
              <Text style={styles.cancelButtonText}>{global.t?.t('products','button','cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dangerButton, unlinkingQueue && styles.buttonDisabled]}
              onPress={unlinkQueue}
              disabled={unlinkingQueue}
            >
              <Text style={styles.dangerButtonText}>
                {unlinkingQueue ? global.t?.t('products','button','unlinking') : global.t?.t('products','button','unlink')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
    </>
  );
}

const createStyles = (ppcColors) =>
  StyleSheet.create({
  cardPressable: { flex: 1 },
  cardPressed: { opacity: 0.96, transform: [{ scale: 0.992 }] },
  displayCard: {
    flex: 1,
    minHeight: 224,
    borderRadius: 22,
    backgroundColor: ppcColors.cardBg,
    borderWidth: 1,
    borderColor: ppcColors.borderSoft,
    overflow: 'hidden',
  },
  typeAccent: {
    height: 1,
    width: '100%',
  },
  cardGlow: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 999,
    top: -54,
    right: -44,
    backgroundColor: ppcColors.border,
    opacity: 0.18,
  },
  cardContent: {
    flex: 1,
    alignItems: 'stretch',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 14,
    minHeight: 236,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ppcColors.border,
    backgroundColor: ppcColors.cardBgSoft,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
  },
  cardActions: {
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editIcon: {
    backgroundColor: ppcColors.panelBg,
    borderWidth: 1,
    borderColor: ppcColors.border,
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayTitle: {
    fontWeight: '900',
    color: ppcColors.textPrimary,
    textAlign: 'left',
  },
  typePill: {
    backgroundColor: ppcColors.panelBg,
    borderWidth: 1,
    borderColor: ppcColors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  displayType: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  queuesWrap: {
    marginTop: 8,
    width: '100%',
    justifyContent: 'flex-start',
    flexGrow: 1,
  },
  footerRow: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: ppcColors.border,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  footerSpacer: {
    flex: 1,
  },
  feedbackWrap: {
    width: '100%',
    minHeight: 14,
  },
  linkQueueButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ppcColors.accent,
    backgroundColor: ppcColors.panelBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkQueueButtonDisabled: {
    opacity: 0.7,
  },
  linkQueueButtonText: {
    color: ppcColors.accent,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  unlinkQueueButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ppcColors.danger,
    backgroundColor: ppcColors.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerActionIcon: {
    marginRight: 6,
  },
  unlinkQueueButtonText: {
    color: ppcColors.dangerText,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  linkQueueErrorText: {
    marginTop: 8,
    color: ppcColors.dangerText,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  modalContainer: {
    backgroundColor: ppcColors.modalBg || ppcColors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: ppcColors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: ppcColors.textPrimary },
  headerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ppcColors.cardBgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  modalLabel: { fontSize: 14, fontWeight: '700', marginTop: 12, color: ppcColors.textSecondary },
  modalInput: {
    borderWidth: 1,
    borderColor: ppcColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    color: ppcColors.textPrimary,
    backgroundColor: ppcColors.cardBgSoft,
  },
  createQueueDivider: {
    height: 1,
    backgroundColor: ppcColors.border,
    marginTop: 16,
    marginBottom: 4,
  },
  linkModalList: {
    maxHeight: 300,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  linkModalListContent: {
    paddingBottom: 8,
  },
  linkModalItemWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: ppcColors.cardBgSoft,
    marginBottom: 8,
  },
  linkModalItemWrapSelected: {
    borderColor: ppcColors.accent,
    backgroundColor: ppcColors.cardBg,
  },
  linkModalRadioItem: {
    minHeight: 42,
  },
  linkModalRadioLabel: {
    color: ppcColors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  linkModalHintText: {
    color: ppcColors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
    paddingVertical: 10,
  },
  radioItemWrap: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: ppcColors.cardBgSoft,
  },
  radioItemWrapSelected: {
    borderColor: ppcColors.accent,
    backgroundColor: ppcColors.cardBg,
  },
  radioItem: {
    minHeight: 42,
  },
  radioLabel: {
    color: ppcColors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  confirmModalMessage: {
    marginHorizontal: 24,
    marginTop: 16,
    color: ppcColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: ppcColors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ppcColors.textSecondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ppcColors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: ppcColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ppcColors.pillTextDark,
  },
  dangerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: ppcColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  outlineButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ppcColors.accent,
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: ppcColors.accent,
  },
  dangerOutlineButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ppcColors.danger,
    backgroundColor: ppcColors.dangerBg,
    alignItems: 'center',
  },
  dangerOutlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: ppcColors.dangerText,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
