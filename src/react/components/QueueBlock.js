import React, { useState, useMemo } from 'react';
import { View, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { Text, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import { env } from '@env';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import createStyles from './QueueBlock.styles';
import { inlineStyle_131_8 } from './QueueBlock.styles';

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
  const { ppcColors: defaultPpcColors } = usePpcTheme();
  const ppcColors = ppcColorsOverride || defaultPpcColors;
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [statusList, setStatusList] = useState([]);
  const [editingType, setEditingType] = useState(null);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

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
        <View style={[styles.statusDot, { backgroundColor: statusObj.color || '#64748B' }]} />
        <Text style={styles.statusText}>{statusLabel}</Text>
        {env.APP_TYPE === 'MANAGER' && (
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
        {env.APP_TYPE === 'MANAGER' && (
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
                        { backgroundColor: item.color || '#64748B' },
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
    </View>
  );
}
