import React, { useState, useMemo, useCallback } from 'react';
import { View, Pressable, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Text, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import {app_type} from '@appType';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import AnimatedModal from '@controleonline/ui-common/src/react/components/AnimatedModal';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import createStyles from './QueueBlock.styles';
import { inlineStyle_131_8 } from './QueueBlock.styles';

const QUEUE_ICON_OPTIONS = [
  { value: '', label: 'Sem ícone', icon: 'minus-circle-outline' },
  { value: 'french-fries', label: 'Fritadeira', icon: 'french-fries' },
  { value: 'grill', label: 'Churrasco', icon: 'grill' },
  { value: 'hamburger', label: 'Lanches', icon: 'hamburger' },
  { value: 'cup', label: 'Bebidas', icon: 'cup' },
  { value: 'food', label: 'Cozinha', icon: 'food' },
  { value: 'package-variant-closed', label: 'Embalagem', icon: 'package-variant-closed' },
];

export default function QueueBlock({
  queue,
  onQueueUpdate,
  ppcColorsOverride = null,
}) {
  const navigation = useNavigation();
  const statusStore = useStore('status');
  const queueStore = useStore('queues');
  const { actions: actionsQueue } = queueStore;
  const { actions } = statusStore;
  const messageApi = useMessage();
  const { ppcColors: defaultPpcColors } = usePpcTheme();
  const ppcColors = ppcColorsOverride || defaultPpcColors;
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [statusList, setStatusList] = useState([]);
  const [editingType, setEditingType] = useState(null);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [queueModalVisible, setQueueModalVisible] = useState(false);
  const [queueName, setQueueName] = useState(queue?.queue || '');
  const [queueShortLabel, setQueueShortLabel] = useState(queue?.shortLabel || '');
  const [queueIcon, setQueueIcon] = useState(queue?.icon || '');
  const [savingQueue, setSavingQueue] = useState(false);

  const openQueueEditor = useCallback(() => {
    setQueueName(queue?.queue || '');
    setQueueShortLabel(queue?.shortLabel || '');
    setQueueIcon(queue?.icon || '');
    setQueueModalVisible(true);
  }, [queue]);

  const saveQueuePresentation = async () => {
    if (!String(queueName || '').trim() || savingQueue) return;
    setSavingQueue(true);
    try {
      const saved = await actionsQueue.save({
        id: queue.id,
        queue: String(queueName).trim(),
        shortLabel: String(queueShortLabel || '').trim() || null,
        icon: queueIcon || null,
      });
      onQueueUpdate({
        ...queue,
        ...(saved || {}),
        queue: String(queueName).trim(),
        shortLabel: String(queueShortLabel || '').trim() || null,
        icon: queueIcon || null,
      });
      setQueueModalVisible(false);
      messageApi?.showSuccess?.('Fila atualizada com sucesso.');
    } catch (error) {
      messageApi?.showError?.(
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.description ||
        error?.response?.data?.detail ||
        error?.message ||
        'Não foi possível atualizar a fila.',
      );
    } finally {
      setSavingQueue(false);
    }
  };

  const handleEditClick = async (statusObj, type) => {
    setLoadingStatuses(true);
    try {
      const fetched = await actions.getItems({ context: 'display' });
      const source = Array.isArray(fetched) ? fetched : [];
      const formatted = source.map((s) => ({
        id: s.id,
        name: s.status,
        color: s.color,
        realStatus: s.realStatus,
        '@id': s['@id'],
      }));

      setStatusList(formatted);
      const current = formatted.find((s) => String(s.id) === String(statusObj?.id));
      setSelectedStatus(current || null);
      setEditingType(type);
      setModalVisible(true);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const saveStatus = () => {
    if (!selectedStatus) return;

    actionsQueue
      .save({
        id: queue.id,
        [
          editingType === 'in'
            ? 'status_in'
            : editingType === 'working'
              ? 'status_working'
              : 'status_out'
        ]: selectedStatus['@id'],
      })
      .then(() => {
        const updatedQueue = { ...queue };
        if (editingType === 'in') updatedQueue.status_in = selectedStatus;
        else if (editingType === 'working') updatedQueue.status_working = selectedStatus;
        else updatedQueue.status_out = selectedStatus;

        onQueueUpdate(updatedQueue);
        setModalVisible(false);
      });
  };

  const renderStatus = (statusObj, type) => {
    if (!statusObj) return null;

    const statusName = String(statusObj.name || statusObj.status || '').trim();
    const statusLabel = statusName ? statusName.split(' ')[0] : '-';

    return (
      <View style={styles.statusPill}>
        <View style={[styles.statusDot, { backgroundColor: statusObj.color }]} />
        <Text style={styles.statusText}>{statusLabel}</Text>
        {app_type === 'MANAGER' && (
          <Pressable onPress={() => handleEditClick(statusObj, type)} style={styles.editButton}>
            <MaterialCommunityIcons
              name="pencil"
              size={9}
              color={ppcColors.textSecondary}
            />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.queueBlock}>
      <View style={styles.titleRow}>
        <Text style={styles.queueTitle}>{queue.queue}</Text>
        {app_type === 'MANAGER' && (
          <>
            <Pressable
              style={styles.editQueueButton}
              onPress={openQueueEditor}
            >
              <MaterialCommunityIcons name="pencil" size={11} color={ppcColors.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.addButton}
              onPress={() =>
                navigation.navigate('QueueAddProducts', {
                  queueId: queue?.id,
                  queueName: queue?.queue,
                })
              }
            >
              <Text style={styles.addIcon}>+</Text>
            </Pressable>
          </>
        )}
      </View>
      <View style={styles.statusPillsRow}>
        {renderStatus(queue.status_in, 'in')}
        {renderStatus(queue.status_working, 'working')}
        {renderStatus(queue.status_out, 'out')}
      </View>
      <AnimatedModal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        style={inlineStyle_131_8}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecione o status</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.headerCloseButton}>
              <MaterialCommunityIcons name="close" size={18} color={ppcColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.statusList}>
            {loadingStatuses ? (
              <Text style={styles.loadingText}>Carregando status...</Text>
            ) : statusList.length === 0 ? (
              <Text style={styles.loadingText}>Nenhum status disponivel.</Text>
            ) : (
              <RadioButton.Group
                onValueChange={(value) => {
                  const selected = statusList.find((s) => String(s.id) === String(value));
                  setSelectedStatus(selected);
                }}
                value={selectedStatus?.id}
              >
                {statusList.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.radioItemWrap,
                      String(selectedStatus?.id) === String(item.id) &&
                        styles.radioItemWrapSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.modalStatusDot,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <RadioButton.Item
                      label={item.name}
                      value={item.id}
                      color={ppcColors.accent}
                      uncheckedColor={ppcColors.borderSoft}
                      labelStyle={styles.radioLabel}
                      style={styles.radioItem}
                    />
                  </View>
                ))}
              </RadioButton.Group>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveStatus}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
      <AnimatedModal
        visible={queueModalVisible}
        onRequestClose={() => setQueueModalVisible(false)}
        style={inlineStyle_131_8}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar fila</Text>
            <TouchableOpacity onPress={() => setQueueModalVisible(false)} style={styles.headerCloseButton}>
              <MaterialCommunityIcons name="close" size={18} color={ppcColors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.queueForm}>
            <Text style={styles.fieldLabel}>Nome da fila</Text>
            <TextInput style={styles.input} value={queueName} onChangeText={setQueueName} />
            <Text style={styles.fieldLabel}>Identificação curta</Text>
            <TextInput
              style={styles.input}
              value={queueShortLabel}
              onChangeText={setQueueShortLabel}
              placeholder="Ex.: Fritadeira, Churrasco, Estação A"
              placeholderTextColor={ppcColors.textSecondary}
            />
            <Text style={styles.fieldLabel}>Ícone</Text>
            <View style={styles.iconGrid}>
              {QUEUE_ICON_OPTIONS.map(option => (
                <Pressable
                  key={option.value || 'none'}
                  style={[styles.iconOption, queueIcon === option.value && styles.iconOptionSelected]}
                  onPress={() => setQueueIcon(option.value)}
                >
                  <MaterialCommunityIcons name={option.icon} size={24} color={ppcColors.textPrimary} />
                  <Text style={styles.iconOptionLabel}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setQueueModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, savingQueue && styles.buttonDisabled]}
              onPress={saveQueuePresentation}
              disabled={savingQueue}
            >
              <Text style={styles.saveButtonText}>{savingQueue ? 'Salvando...' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
    </View>
  );
}
