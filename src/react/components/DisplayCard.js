// DisplayCard.js
import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, Modal, View, TextInput, Text, TouchableOpacity } from 'react-native';
import { Card, Text as PaperText, Button, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QueuesList from './QueuesList';
import { useStore } from '@store';
import { env } from '@env';

const iconByType = {
  products: 'silverware-fork-knife',
  orders: 'receipt-text',
};

export default function DisplayCard({ item, onPress }) {
  const displaysStore = useStore('displays');
  const { actions } = displaysStore;
  const [queues, setQueues] = useState(item.displayQueue || []);
  const [modalVisible, setModalVisible] = useState(false);
  const [editDisplay, setEditDisplay] = useState(item.display);
  const [editType, setEditType] = useState(item.displayType);

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

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
      >
        <Card style={styles.displayCard}>
          <Card.Content style={styles.cardContent}>
            <MaterialCommunityIcons
              name={iconByType[item.displayType] || 'monitor'}
              size={44}
              color="#F5C542"
            />
            <View style={styles.titleRow}>
              <PaperText style={styles.displayTitle}>{item.display}</PaperText>
              {env.APP_TYPE === 'MANAGER' && (
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.editIcon}>
                  <Text style={{ fontSize: 18 }}>✏️</Text>
                </TouchableOpacity>
              )}
            </View>
            <PaperText style={styles.displayType}>({item.displayType})</PaperText>
            <QueuesList queues={queues} onQueueUpdate={handleQueueUpdate} />
          </Card.Content>
        </Card>
      </Pressable>

      {env.APP_TYPE === 'MANAGER' && (
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Nome do Display</Text>
              <TextInput
                style={styles.modalInput}
                value={editDisplay}
                onChangeText={setEditDisplay}
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
  cardPressed: { opacity: 0.9 },
  displayCard: { flex: 1, minHeight: 240, borderRadius: 18, backgroundColor: '#1F1F2B', elevation: 5 },
  cardContent: { alignItems: 'center', paddingVertical: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  editIcon: { marginLeft: 6 },
  displayTitle: { marginTop: 12, fontSize: 18, fontWeight: '600', color: '#FFF', textAlign: 'center' },
  displayType: { fontSize: 13, color: '#B0B0B0', marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 8, marginTop: 5 },
});
