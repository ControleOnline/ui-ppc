import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { Text, Button, RadioButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import { env } from '@env';

export default function QueueBlock({ queue, onQueueUpdate }) {
  const navigation = useNavigation();
  const statusStore = useStore('status');
  const queueStore = useStore('queues');
  const { actions: actionsQueue } = queueStore;
  const { actions, items } = statusStore;
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
        <Text style={styles.statusText}>{statusObj.name || statusObj.status}</Text>
        {env.APP_TYPE === 'MANAGER' && (
          <Pressable onPress={() => handleEditClick(statusObj, type)} style={styles.editButton}>
            <Text style={styles.icon}>✏️</Text>
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
            onPress={() => navigation.navigate('QueueAddProducts', { queue })}
          >
            <Text style={styles.icon}>＋</Text>
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

const styles = StyleSheet.create({
  queueBlock: { alignItems: 'center', marginTop: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  queueTitle: { backgroundColor: '#F5C542', color: '#000', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14, fontSize: 13, fontWeight: '600' },
  addButton: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 1 },
  statusText: { fontSize: 13, color: '#E0E0E0', textAlign: 'center' },
  editButton: { marginLeft: 6 },
  icon: { fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
});
