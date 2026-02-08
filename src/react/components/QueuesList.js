// QueuesList.js
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import QueueBlock from './QueueBlock';

export default function QueuesList({ queues, onQueueUpdate }) {
  const [queueState, setQueueState] = useState([...queues]);

  const handleQueueUpdate = useCallback(
    (updatedQueue) => {
      setQueueState((prev) =>
        prev.map((dq) =>
          dq.queue.id === updatedQueue.id ? { ...dq, queue: { ...dq.queue, ...updatedQueue } } : dq
        )
      );
      if (onQueueUpdate) onQueueUpdate(updatedQueue);
    },
    [onQueueUpdate]
  );

  if (!queueState?.length) return null;

  return (
    <View style={styles.queuesWrapper}>
      {queueState.map((dq) => (
        <QueueBlock key={dq.queue.id} queue={dq.queue} onQueueUpdate={handleQueueUpdate} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  queuesWrapper: { width: '100%', alignItems: 'center', marginTop: 6 },
});
