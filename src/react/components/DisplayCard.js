// DisplayCard.js
import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QueuesList from './QueuesList';

const iconByType = {
  products: 'silverware-fork-knife',
  orders: 'receipt-text',
  'products x orders': 'clipboard-check-outline',
};

export default function DisplayCard({ item, onPress }) {
  const [queues, setQueues] = useState(item.displayQueue || []);

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

  return (
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
          <Text style={styles.displayTitle}>{item.display}</Text>
          <Text style={styles.displayType}>({item.displayType})</Text>
          <QueuesList queues={queues} onQueueUpdate={handleQueueUpdate} />
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardPressable: { flex: 1 },
  cardPressed: { opacity: 0.9 },
  displayCard: { flex: 1, minHeight: 240, borderRadius: 18, backgroundColor: '#1F1F2B', elevation: 5 },
  cardContent: { alignItems: 'center', paddingVertical: 22 },
  displayTitle: { marginTop: 12, fontSize: 18, fontWeight: '600', color: '#FFF', textAlign: 'center' },
  displayType: { fontSize: 13, color: '#B0B0B0', marginBottom: 12 },
});
