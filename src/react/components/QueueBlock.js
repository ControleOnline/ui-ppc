import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { Text, Button, RadioButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import { env } from '@env';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';

export default function QueueBlock({ queue, onQueueUpdate }) {
  const navigation = useNavigation();
  const statusStore = useStore('status');
  const queueStore = useStore('queues');
  const { actions: actionsQueue } = queueStore;
  const { actions, items } = statusStore;
  const { ppcColors } = usePpcTheme();
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [statusList, setStatusList] = useState([]);
  const [editingType, setEditingType] = useState(null);

  const handleEditClick = (statusObj, type) => {
    actions.getItems({ context: 'display' }).then(() => {
      const formatted = items.map(s => ({ id: s.id, name: s.status, color: s.color, realStatus: s.realStatus, '@id': s['@id'] }));
      setStatusList(formatted);
      const current = formatted.find(s => s.id === statusObj.id);
      setSelectedStatus(current || null);
      setEditingType(type);
      setModalVisible(true);
    });
  };

  const saveStatus = () => {
    if (!selectedStatus) return;
    actionsQueue.save({
      id: queue.id,
      [editingType === 'in' ? 'status_in' : editingType === 'working' ? 'status_working' : 'status_out']: selectedStatus['@id'],
    }).then(() => {
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
    return (
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: statusObj.color || '#64748B' }]} />
        <Text style={styles.statusText}>{statusObj.name || statusObj.status}</Text>
        {env.APP_TYPE === 'MANAGER' && (
          <Pressable onPress={() => handleEditClick(statusObj, type)} style={styles.editButton}>
            <Text style={styles.editIcon}>✎</Text>
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

      {renderStatus(queue.status_in, 'in')}
      {renderStatus(queue.status_working, 'working')}
      {renderStatus(queue.status_out, 'out')}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione o status</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <RadioButton.Group
                onValueChange={(value) => {
                  const selected = statusList.find(s => s.id === value);
                  setSelectedStatus(selected);
                }}
                value={selectedStatus?.id}
              >
                {statusList.map(item => (
                  <RadioButton.Item key={item.id} label={item.name} value={item.id} />
                ))}
              </RadioButton.Group>
            </ScrollView>
            <Button mode="contained" onPress={saveStatus} style={{ marginTop: 10 }}>Salvar</Button>
            <Button onPress={() => setModalVisible(false)} style={{ marginTop: 5 }}>Cancelar</Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (ppcColors) =>
  StyleSheet.create({
  queueBlock: { alignItems: 'center', marginTop: 8, width: '100%' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    justifyContent: 'center',
  },
  queueTitle: {
    backgroundColor: ppcColors.accent,
    color: ppcColors.pillTextDark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: ppcColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ppcColors.border,
    backgroundColor: ppcColors.cardBgSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    marginRight: 7,
  },
  statusText: {
    fontSize: 13,
    color: ppcColors.textSecondary,
    textAlign: 'center',
    fontWeight: '700',
  },
  editButton: {
    marginLeft: 6,
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ppcColors.border,
  },
  addIcon: { fontSize: 14, color: ppcColors.textDark, fontWeight: '900', lineHeight: 14 },
  editIcon: { fontSize: 12, color: ppcColors.textPrimary, fontWeight: '900', lineHeight: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: ppcColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '84%',
    maxWidth: 420,
    backgroundColor: ppcColors.modalBg,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: ppcColors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: ppcColors.textDark },
});
