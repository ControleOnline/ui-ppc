import React, { useState, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import QueueBlock from './QueueBlock';
import styles from './QueuesList.styles';

export default function QueuesList({
  queues,
  onQueueUpdate,
  ppcColorsOverride = null,
}) {
  const [queueState, setQueueState] = useState([...queues]);

  useEffect(() => {
    setQueueState([...(queues || [])]);
  }, [queues]);

  const handleQueueUpdate = useCallback(
    (updatedQueue) => {
      setQueueState((prev) =>
        prev.map((dq) =>
          dq.queue.id === updatedQueue.id
            ? { ...dq, queue: { ...dq.queue, ...updatedQueue } }
            : dq
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
        <QueueBlock
          key={dq.queue.id}
          queue={dq.queue}
          onQueueUpdate={handleQueueUpdate}
          ppcColorsOverride={ppcColorsOverride}
        />
      ))}
    </View>
  );
}
