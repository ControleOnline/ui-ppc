// DisplayCard.js
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Modal, View, TextInput, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Card, Text as PaperText, Button, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import QueuesList from './QueuesList';
import { useStore } from '@store';
import { env } from '@env';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import { withOpacity } from '@controleonline/../../src/styles/branding';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';

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

  const saveDisplay = () => {
    actions.save({ id: item.id, display: editDisplay, displayType: editType }).then(() => {
      setModalVisible(false);
    });
  };

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
      if (onLinked) onLinked();
    } catch (err) {
      Alert.alert('Erro', getApiErrorMessage(err, 'Nao foi possivel excluir o display.'));
    } finally {
      setDeletingDisplay(false);
    }
  }, [actions, item, onLinked]);

  const confirmDeleteDisplay = useCallback(() => {
    if (deletingDisplay) return;
    const confirmMessage = `Deseja excluir o display "${item.display}"?`;

    // Web manager flow: use native browser confirm to guarantee action dispatch.
    if (typeof globalThis?.confirm === 'function') {
      const accepted = globalThis.confirm(confirmMessage);
      if (accepted) deleteDisplay();
      return;
    }

    Alert.alert(
      'Excluir display',
      confirmMessage,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: deleteDisplay },
      ]
    );
  }, [deleteDisplay, deletingDisplay, item.display]);

  const openLinkQueueModal = useCallback(async () => {
    if (!currentCompany?.id) {
      setLinkError('Empresa nao encontrada para vincular a fila.');
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
    } finally {
      setLinkingQueue(false);
    }
  }, [currentCompany?.id, displaysItems, getQueueIdentity, mergeQueueOptions, queues, queuesStore.actions]);

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
      navigation.navigate('QueueAddProducts', {
        queueId: selectedQueue?.id || getId(selectedQueue),
        queueName: selectedQueue?.queue,
      });
    },
    [displayQueuesStore.actions, item, loadLinkedQueues, navigation, onLinked, queues, shapeQueuesForCard]
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
    } catch (err) {
      // If API already removed the link, treat as successful unlink.
      if (Number(err?.status || err?.code) === 404) {
        setQueues([]);
        const links = readLocalLinks();
        delete links[String(displayId)];
        writeLocalLinks(links);
        if (onLinked) onLinked();
      } else {
        setLinkError(getApiErrorMessage(err, 'Nao foi possivel desvincular a fila.'));
      }
    } finally {
      setUnlinkingQueue(false);
    }
  }, [displayQueuesStore.actions, item, loadLinkedQueues, onLinked, queues]);

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
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons
                name={iconByType[item.displayType] || 'monitor'}
                size={28}
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
                      size={12}
                      color={ppcColors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.queuesWrap}>
              <QueuesList
                queues={queues}
                onQueueUpdate={handleQueueUpdate}
                ppcColorsOverride={ppcColorsOverride}
              />
            </View>
            <View
              style={[
                styles.footerRow,
                !canManageQueue && styles.footerRowCentered,
              ]}
            >
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
                      unlinkQueue();
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
                        ? 'Desvinculando...'
                        : 'Desvincular fila'
                      : linkingQueue
                        ? 'Carregando...'
                        : 'Vincular fila'}
                  </Text>
                </Pressable>
              )}
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

      <Modal visible={linkModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.linkModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vincular Fila</Text>
              <Text style={styles.modalSubtitle}>Conecte uma fila existente ou crie uma nova</Text>
            </View>
            <Text style={styles.modalLabel}>Escolha uma fila existente</Text>

            <ScrollView
              style={styles.linkModalList}
              contentContainerStyle={styles.linkModalListContent}
              showsVerticalScrollIndicator
            >
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
            </ScrollView>

            <View style={styles.linkModalFooter}>
              <View style={styles.createQueueDivider} />
              <Text style={styles.modalLabel}>Ou crie uma nova fila</Text>
              <TextInput
                style={styles.modalInput}
                value={newQueueName}
                onChangeText={setNewQueueName}
                placeholder="Nome da nova fila"
                placeholderTextColor={ppcColors.textSecondary}
              />
              <Button
                mode="outlined"
                onPress={createQueueAndBind}
                style={styles.createQueueButton}
                textColor={ppcColors.accent}
                disabled={creatingQueue || linkingQueue}
              >
                {creatingQueue ? 'Criando...' : 'Criar e Vincular'}
              </Button>

              <Button
                mode="contained"
                onPress={bindSelectedQueue}
                style={styles.linkModalBindButton}
                buttonColor={ppcColors.accent}
                textColor={ppcColors.pillTextDark}
                disabled={!queueOptions.length || !selectedQueueId || linkingQueue || creatingQueue || unlinkingQueue}
              >
                {linkingQueue ? 'Vinculando...' : 'Vincular'}
              </Button>
              <Button
                onPress={() => setLinkModalVisible(false)}
                style={styles.linkModalCancelButton}
                textColor={ppcColors.textSecondary}
              >
                Cancelar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {env.APP_TYPE === 'MANAGER' && (
        <AnimatedModal visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.editSheetRoot}>
            <Pressable style={styles.editSheetBackdrop} onPress={() => setModalVisible(false)} />
            <View style={styles.editSheetWrap}>
              <View style={styles.editSheetHandle} />
              <View style={styles.editModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Editar display</Text>
                  <Text style={styles.modalSubtitle}>Nome e tipo do painel</Text>
                </View>

                <Text style={styles.modalLabel}>Nome do display</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editDisplay}
                  onChangeText={setEditDisplay}
                  placeholder="Nome do display"
                  placeholderTextColor={ppcColors.textSecondary}
                />

                <Text style={styles.modalLabel}>Tipo do display</Text>
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

                <Button
                  mode="contained"
                  onPress={saveDisplay}
                  style={styles.editModalSaveButton}
                  buttonColor={ppcColors.accent}
                  textColor={ppcColors.pillTextDark}
                >
                  Salvar alteracoes
                </Button>
                <Button
                  mode="outlined"
                  onPress={confirmDeleteDisplay}
                  style={styles.editModalDeleteButton}
                  textColor={ppcColors.dangerText}
                  disabled={deletingDisplay}
                >
                  {deletingDisplay ? 'Excluindo...' : 'Excluir display'}
                </Button>
                <Button
                  onPress={() => setModalVisible(false)}
                  style={styles.editModalCancelButton}
                  textColor={ppcColors.textSecondary}
                >
                  Fechar
                </Button>
              </View>
            </View>
          </View>
        </AnimatedModal>
      )}
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
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 14,
    minHeight: 222,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ppcColors.border,
    backgroundColor: ppcColors.cardBgSoft,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    maxWidth: '94%',
  },
  cardActions: {
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editIcon: {
    backgroundColor: ppcColors.cardBgSoft,
    borderWidth: 1,
    borderColor: ppcColors.borderSoft,
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayTitle: {
    fontWeight: '900',
    color: ppcColors.textPrimary,
    textAlign: 'center',
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
  },
  footerRow: {
    marginTop: 10,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerRowCentered: {
    justifyContent: 'center',
  },
  feedbackWrap: {
    width: '100%',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: ppcColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  modalContent: {
    width: '84%',
    maxWidth: 420,
    backgroundColor: ppcColors.modalBg,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: ppcColors.border,
  },
  linkModalContent: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '92%',
    backgroundColor: ppcColors.cardBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: ppcColors.border,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: ppcColors.textPrimary, marginBottom: 4 },
  modalHeader: {
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: ppcColors.border,
  },
  modalSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: ppcColors.textSecondary,
  },
  modalLabel: { fontSize: 14, fontWeight: '700', marginTop: 12, color: ppcColors.borderSoft },
  createQueueDivider: {
    height: 1,
    backgroundColor: ppcColors.border,
    marginTop: 10,
    marginBottom: 2,
  },
  linkModalList: {
    maxHeight: 330,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ppcColors.border,
    backgroundColor: ppcColors.cardBgSoft,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  linkModalListContent: {
    paddingBottom: 2,
  },
  linkModalItemWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: ppcColors.cardBg,
    marginBottom: 8,
  },
  linkModalItemWrapSelected: {
    borderColor: ppcColors.accent,
    backgroundColor: ppcColors.cardBgSoft,
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
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  linkModalFooter: {
    marginTop: 2,
    backgroundColor: ppcColors.cardBg,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: ppcColors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    color: ppcColors.textPrimary,
    backgroundColor: ppcColors.cardBgSoft,
  },
  editModalContent: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: ppcColors.cardBg,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: ppcColors.border,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  editSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  editSheetBackdrop: {
    flex: 1,
  },
  editSheetWrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  editSheetHandle: {
    alignSelf: 'center',
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: withOpacity(ppcColors.textSecondary, 0.25),
    marginBottom: 8,
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
  editModalSaveButton: {
    marginTop: 14,
    borderRadius: 12,
  },
  editModalDeleteButton: {
    marginTop: 10,
    borderColor: ppcColors.danger,
    borderRadius: 12,
    backgroundColor: ppcColors.dangerBg,
  },
  editModalCancelButton: {
    marginTop: 4,
    borderRadius: 12,
  },
  createQueueButton: {
    marginTop: 10,
    borderRadius: 12,
    borderColor: ppcColors.accent,
  },
  linkModalBindButton: {
    marginTop: 10,
    borderRadius: 12,
  },
  linkModalCancelButton: {
    marginTop: 4,
    borderRadius: 12,
  },
});
