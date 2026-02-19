// DisplayCard.js
import React, { useState, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Modal, View, TextInput, Text, TouchableOpacity } from 'react-native';
import { Card, Text as PaperText, Button, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import QueuesList from './QueuesList';
import { useStore } from '@store';
import { env } from '@env';

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
  if (size > 18) return { fontSize: 30, lineHeight: 34 };
  if (size > 12) return { fontSize: 34, lineHeight: 38 };
  return { fontSize: 38, lineHeight: 42 };
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

const extractDisplayId = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value.replace(/\D/g, '')) || null;
  if (typeof value.id === 'number') return value.id;
  if (typeof value.id === 'string') return Number(value.id.replace(/\D/g, '')) || null;
  if (value.id && typeof value.id === 'object') return extractDisplayId(value.id);
  if (value['@id']) return Number(String(value['@id']).replace(/\D/g, '')) || null;
  return null;
};

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

export default function DisplayCard({ item, onPress, onLinked }) {
  const navigation = useNavigation();
  const displaysStore = useStore('displays');
  const queuesStore = useStore('queues');
  const displayQueuesStore = useStore('display_queues');
  const statusStore = useStore('status');
  const peopleStore = useStore('people');
  const { actions } = displaysStore;
  const { currentCompany } = peopleStore.getters;

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
    const id = queue?.id ?? null;
    const iri = queue?.['@id'] || null;
    return {
      id: id || getId(queue) || iri || null,
      iri,
    };
  };

  const loadLinkedQueues = useCallback(
    async (displayId) => {
      if (!displayId) return [];

      const attempts = [
        { display: displayId },
        { display: `/displays/${displayId}` },
        { 'display.id': displayId },
      ];

      for (const params of attempts) {
        try {
          const result = await displayQueuesStore.actions.getItems(params);
          const normalized = normalizeDisplayQueues(result);
          const onlyCurrentDisplay = normalized.filter((row) => {
            const rowDisplayId = extractDisplayId(row.display);
            if (!rowDisplayId) return true;
            return rowDisplayId === Number(displayId);
          });
          if (onlyCurrentDisplay.length) return onlyCurrentDisplay;
        } catch (err) {
          // keep trying fallback filter shapes
        }
      }

      try {
        const allLinks = await displayQueuesStore.actions.getItems({});
        const normalizedAll = normalizeDisplayQueues(allLinks);
        const fromAll = normalizedAll.filter((row) => {
          const rowDisplayId = extractDisplayId(row.display);
          return rowDisplayId === Number(displayId);
        });
        if (fromAll.length) return fromAll;
      } catch (err) {
        // ignore
      }

      return [];
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

      try {
        const linkedQueues = await loadLinkedQueues(displayId);
        if (linkedQueues.length > 0) {
          const shaped = shapeQueuesForCard(linkedQueues);
          if (!cancelled) setQueues(shaped);
          const firstQueue = shaped?.[0]?.queue;
          if (firstQueue?.id) {
            const links = readLocalLinks();
            links[String(displayId)] = firstQueue;
            writeLocalLinks(links);
          }
        } else {
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
        }
      } catch (error) {
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
      }
    };

    hydrateQueues();
    return () => {
      cancelled = true;
    };
  }, [item.id, item.displayQueue, item.display_queue, item.displayQueues, loadLinkedQueues, shapeQueuesForCard]);

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

  const openLinkQueueModal = useCallback(async () => {
    if (!currentCompany?.id) {
      setLinkError('Empresa nao encontrada para vincular a fila.');
      return;
    }

    setLinkError('');
    setLinkingQueue(true);
    try {
      let result = await queuesStore.actions.getItems({ company: currentCompany.id });
      let options = Array.isArray(result) ? result : [];
      if (!options.length) {
        result = await queuesStore.actions.getItems({});
        options = Array.isArray(result) ? result : [];
      }
      setQueueOptions(options);
      const firstId = options?.[0]?.id || getId(options?.[0]) || options?.[0]?.['@id'];
      setSelectedQueueId(firstId ? String(firstId) : '');
      setNewQueueName('');
      setLinkModalVisible(true);
    } catch (err) {
      setLinkError(getApiErrorMessage(err, 'Nao foi possivel carregar as filas.'));
    } finally {
      setLinkingQueue(false);
    }
  }, [currentCompany?.id, queuesStore.actions]);

  const linkQueueToDisplay = useCallback(
    async (selectedQueue) => {
      const displayId = getId(item);
      if (!displayId || !selectedQueue) return;

      if (item.displayType === 'products' && queues.length > 0) {
        setLinkModalVisible(false);
        navigation.navigate('QueueAddProducts', { queue: queues[0].queue });
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
      navigation.navigate('QueueAddProducts', { queue: selectedQueue });
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
        throw new Error('Nao foi possivel identificar o vinculo para remover.');
      }

      await displayQueuesStore.actions.remove(linkId);
      setQueues([]);

      const links = readLocalLinks();
      delete links[String(displayId)];
      writeLocalLinks(links);
      if (onLinked) onLinked();
    } catch (err) {
      setLinkError(getApiErrorMessage(err, 'Nao foi possivel desvincular a fila.'));
    } finally {
      setUnlinkingQueue(false);
    }
  }, [displayQueuesStore.actions, item, loadLinkedQueues, onLinked, queues]);

  const accent = typeAccentByType[item.displayType] || '#FACC15';
  const titleSizing = getTitleStyleByName(item.display);

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
      >
        <Card style={styles.displayCard}>
          <View style={[styles.typeAccent, { backgroundColor: accent }]} />
          <View style={styles.cardGlow} />
          <Card.Content style={styles.cardContent}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons
                name={iconByType[item.displayType] || 'monitor'}
                size={34}
                color="#FACC15"
              />
            </View>
            <View style={styles.titleRow}>
              <PaperText style={[styles.displayTitle, titleSizing]}>{item.display}</PaperText>
              {env.APP_TYPE === 'MANAGER' && (
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.editIcon}>
                  <Text style={styles.editIconText}>✎</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.typePill}>
              <PaperText style={[styles.displayType, { color: accent }]}>
                {String(item.displayType || '').toUpperCase()}
              </PaperText>
            </View>
            <View style={styles.queuesWrap}>
              <QueuesList queues={queues} onQueueUpdate={handleQueueUpdate} />
              {env.APP_TYPE === 'MANAGER' &&
                item.displayType === 'products' &&
                (!queues || queues.length === 0) && (
                  <Pressable
                    style={[styles.linkQueueButton, linkingQueue && styles.linkQueueButtonDisabled]}
                    onPress={(event) => {
                      event?.stopPropagation?.();
                      openLinkQueueModal();
                    }}
                    disabled={linkingQueue}
                  >
                    <Text style={styles.linkQueueButtonText}>
                      {linkingQueue ? 'Carregando...' : 'Vincular fila'}
                    </Text>
                  </Pressable>
                )}
              {env.APP_TYPE === 'MANAGER' &&
                item.displayType === 'products' &&
                queues &&
                queues.length > 0 && (
                  <Pressable
                    style={[styles.unlinkQueueButton, unlinkingQueue && styles.linkQueueButtonDisabled]}
                    onPress={(event) => {
                      event?.stopPropagation?.();
                      unlinkQueue();
                    }}
                    disabled={unlinkingQueue}
                  >
                    <Text style={styles.unlinkQueueButtonText}>
                      {unlinkingQueue ? 'Desvinculando...' : 'Desvincular fila'}
                    </Text>
                  </Pressable>
                )}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vincular Fila</Text>
            <Text style={styles.modalLabel}>Escolha uma fila existente</Text>

            {queueOptions.length > 0 ? (
              <RadioButton.Group
                onValueChange={(value) => setSelectedQueueId(String(value))}
                value={selectedQueueId}
              >
                {queueOptions.map((queue) => (
                  <RadioButton.Item
                    key={queue.id || getId(queue) || queue?.['@id']}
                    label={queue.queue || `Fila #${queue.id || getId(queue) || queue?.['@id']}`}
                    value={String(queue.id || getId(queue) || queue?.['@id'])}
                  />
                ))}
              </RadioButton.Group>
            ) : (
              <Text style={styles.linkQueueErrorText}>Nenhuma fila disponivel nesta empresa.</Text>
            )}

            <View style={styles.createQueueDivider} />
            <Text style={styles.modalLabel}>Ou crie uma nova fila</Text>
            <TextInput
              style={styles.modalInput}
              value={newQueueName}
              onChangeText={setNewQueueName}
              placeholder="Nome da nova fila"
              placeholderTextColor="#7B8290"
            />
            <Button
              mode="outlined"
              onPress={createQueueAndBind}
              style={styles.createQueueButton}
              disabled={creatingQueue || linkingQueue}
            >
              {creatingQueue ? 'Criando...' : 'Criar e Vincular'}
            </Button>

            <Button
              mode="contained"
              onPress={bindSelectedQueue}
              style={{ marginTop: 10 }}
              disabled={!queueOptions.length || !selectedQueueId || linkingQueue || creatingQueue || unlinkingQueue}
            >
              {linkingQueue ? 'Vinculando...' : 'Vincular'}
            </Button>
            <Button onPress={() => setLinkModalVisible(false)} style={{ marginTop: 5 }}>
              Cancelar
            </Button>
          </View>
        </View>
      </Modal>

      {env.APP_TYPE === 'MANAGER' && (
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Display</Text>

              <Text style={styles.modalLabel}>Nome do Display</Text>
              <TextInput
                style={styles.modalInput}
                value={editDisplay}
                onChangeText={setEditDisplay}
                placeholder="Nome do display"
                placeholderTextColor="#7B8290"
              />

              <Text style={styles.modalLabel}>Tipo do Display</Text>
              <RadioButton.Group onValueChange={setEditType} value={editType}>
                <RadioButton.Item label="Orders" value="orders" />
                <RadioButton.Item label="Products" value="products" />
              </RadioButton.Group>

              <Button mode="contained" onPress={saveDisplay} style={{ marginTop: 10 }}>
                Salvar
              </Button>
              <Button onPress={() => setModalVisible(false)} style={{ marginTop: 5 }}>
                Cancelar
              </Button>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  cardPressable: { flex: 1 },
  cardPressed: { opacity: 0.96, transform: [{ scale: 0.992 }] },
  displayCard: {
    flex: 1,
    minHeight: 260,
    borderRadius: 18,
    backgroundColor: '#0D141D',
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  typeAccent: {
    height: 2,
    width: '100%',
  },
  cardGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 999,
    top: -80,
    right: -70,
    backgroundColor: '#1E293B',
    opacity: 0.38,
  },
  cardContent: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 14,
    minHeight: 258,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#101927',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    maxWidth: '92%',
  },
  editIcon: {
    marginLeft: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 16,
  },
  displayTitle: {
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  typePill: {
    marginTop: 6,
    marginBottom: 12,
    backgroundColor: '#0C1219',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  displayType: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  queuesWrap: {
    marginTop: 2,
    width: '100%',
    flex: 1,
    justifyContent: 'flex-start',
  },
  linkQueueButton: {
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FACC15',
    backgroundColor: '#0C1219',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  linkQueueButtonDisabled: {
    opacity: 0.7,
  },
  linkQueueButtonText: {
    color: '#FACC15',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  unlinkQueueButton: {
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#1A0D10',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unlinkQueueButtonText: {
    color: '#FCA5A5',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  linkQueueErrorText: {
    marginTop: 8,
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,9,18,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '84%',
    maxWidth: 420,
    backgroundColor: '#FBFCFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  modalLabel: { fontSize: 14, fontWeight: '700', marginTop: 12, color: '#334155' },
  createQueueDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 10,
    marginBottom: 2,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#C9D5E3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  createQueueButton: {
    marginTop: 10,
  },
});
